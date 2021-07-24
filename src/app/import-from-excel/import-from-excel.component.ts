import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Entity, BackendMethod, SqlDatabase, EntityWhere, AndFilter, FieldsMetadata, EntityMetadata, FieldMetadata, FieldRef, EntityBase, FilterFactory, FilterFactories, Filter, getFields } from 'remult';
import { DataAreaFieldsSetting, DataAreaSettings, DataControl, DataControlInfo, GridSettings, InputField, openDialog, RouteHelperService } from '@remult/angular';

import { Context } from 'remult';
import { HelperId, Helpers, HelperUserInfo } from '../helpers/helpers';
import { Phone } from "../model-shared/phone";


import { Families, parseAddress, duplicateFamilyInfo, displayDupInfo } from '../families/families';

import { BasketType } from '../families/BasketType';
import { FamilySources } from '../families/FamilySources';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DialogService, extractError } from '../select-popup/dialog';
import { BusyService } from '@remult/angular';


import { Roles } from '../auth/roles';
import { MatStepper } from '@angular/material/stepper';

import { ApplicationSettings, RemovedFromListExcelImportStrategy, getSettings, getCustomColumnVisible } from '../manage/ApplicationSettings';
import { Field, use } from '../translate';
import { getLang } from '../sites/sites';

import { Groups } from '../manage/groups';
import { DistributionCenters } from '../manage/distribution-centers';
import { jsonToXlsx } from '../shared/saveToExcel';
import { Sites } from '../sites/sites';
import { FamilyStatus } from '../families/FamilyStatus';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { leaveOnlyNumericChars } from '../shared/googleApiHelpers';
import { SelectListComponent, selectListItem } from '../select-list/select-list.component';
import { PromiseThrottle } from '../shared/utils';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { u } from '../model-shared/UberContext';



@Component({
    selector: 'app-excel-import',
    templateUrl: './import-from-excel.component.html',
    styleUrls: ['./import-from-excel.component.scss']
})
export class ImportFromExcelComponent implements OnInit {



    constructor(private context: Context, private dialog: DialogService, private busy: BusyService, private routeHelper: RouteHelperService, public settings: ApplicationSettings) {

    }
    updateRowsPage: number;
    existingFamiliesPage: number;
    errorRowsPage: number;
    excelPage: number;
    newRowsPage: number;
    cell: string;

    oFile: import('xlsx').WorkBook;
    worksheet: import('xlsx').WorkSheet;

    excelColumns: excelColumn[] = [];
    additionalColumns: additionalColumns[] = [];
    columns: columnUpdater[] = [];

    rows: number[] = [];

    getData() {
        return this.getTheData(this.cell);
    }
    getTheData(cell: string) {
        let val = this.worksheet[cell];
        if (!val || !val.w)
            return '';
        return val.w.trim();
    }
    columnsInCompare: columnInCompare[] = [];

    totalRows: number;
    filename: string;


    getColInfo(i: excelRowInfo, col: columnInCompare) {
        return ImportFromExcelComponent.actualGetColInfo(i, keyFromColumnInCompare(col));
    }
    static actualGetColInfo(i: excelRowInfo, colMemberName: string) {
        let r = i.values[colMemberName];
        if (!r) {
            r = {
                newDisplayValue: '',
                existingDisplayValue: '',
                newValue: '',
                existingValue: ''
            };
        }
        return r;
    }

    async addAll() {
        let count = this.newRows.length;
        if (await this.dialog.YesNoPromise(use.language.shouldAdd + " " + count + " " + use.language.families + "?")) {


            this.busy.doWhileShowingBusy(async () => {
                try {
                    let rowsToInsert: excelRowInfo[] = [];

                    let lastDate = new Date().valueOf();
                    let start = lastDate;
                    let index = 0;
                    let rows = [...this.newRows];
                    for (const i of rows) {

                        rowsToInsert.push(i);
                        index++;

                        if (rowsToInsert.length == 35) {

                            if (new Date().valueOf() - lastDate > 10000) {
                                let timeLeft = ((new Date().valueOf() - start) / index) * (count - index) / 1000 / 60;
                                this.dialog.Info(i.rowInExcel + ' ' + (i.name) + " " + timeLeft.toFixed(1) + " " + use.language.minutesRemaining);
                            }
                            await ImportFromExcelComponent.insertRows(rowsToInsert, this.addDelivery);
                            for (const r of rowsToInsert) {
                                r.created = true;
                            }
                            this.identicalRows.push(...rowsToInsert);
                            for (const r of rowsToInsert) {
                                this.newRows.splice(this.newRows.indexOf(r), 1);
                            }
                            rowsToInsert = [];
                        }



                    }
                    if (rowsToInsert.length > 0) {
                        await ImportFromExcelComponent.insertRows(rowsToInsert, this.addDelivery);
                        for (const r of rowsToInsert) {
                            r.created = true;
                        }
                        this.identicalRows.push(...rowsToInsert);
                    }
                    this.newRows = [];
                    this.sortRows();
                    this.dialog.Info(use.language.familiesAddedSuccesfull);
                }
                catch (err) {
                    await this.dialog.exception("Excel Import", err);
                    this.newRows = this.newRows.filter(x => this.identicalRows.indexOf(x) < 0);
                }
                this.createImportReport();
                if (await this.dialog.YesNoPromise(use.language.gotoDeliveriesScreen))
                    this.routeHelper.navigateToComponent((await import('../families/families.component')).FamiliesComponent);

            });
        }
    }
    @BackendMethod({ allowed: Roles.admin })
    static async insertRows(rowsToInsert: excelRowInfo[], createDelivery: boolean, context?: Context) {
        let t = new PromiseThrottle(10);
        for (const r of rowsToInsert) {
            let f = context.for(Families).create();
            let fd = context.for(ActiveFamilyDeliveries).create();
            for (const val in r.values) {
                columnFromKey(f, fd, val).inputValue = r.values[val].newValue;
            }
            if (!f.name)
                f.name = 'ללא שם';
            let save = async () => {

                await f.save();
                if (createDelivery) {
                    fd._disableMessageToUsers = true;
                    f.updateDelivery(fd);
                    if (getSettings(context).isSytemForMlt()) {
                        fd.distributionCenter = await u(context).findClosestDistCenter(f.addressHelper.location());
                    }
                    await fd.save();
                }
            };
            await t.push(save());
        }
        await t.done();


    }
    async updateAllCol(col: columnInCompare) {
        let count = this.getColUpdateCount(col);
        let message = use.language.shouldUpdateColumn + " " + col.c.caption + " " + use.language.for + " " + count + " " + use.language.families + "?";
        if (col.c == this.f.address)
            message += use.language.updateOfAddressMayTakeLonger;
        this.dialog.YesNoQuestion(message, () => {
            this.busy.doWhileShowingBusy(async () => {
                let rowsToUpdate: excelRowInfo[] = [];
                let allRows: excelRowInfo[] = [];
                let lastDate = new Date().valueOf();
                for (const i of this.updateRows) {
                    let cc = this.getColInfo(i, col);
                    if (cc.newDisplayValue != cc.existingDisplayValue) {
                        rowsToUpdate.push(i);
                    }
                    else
                        allRows.push(i);

                    if (rowsToUpdate.length == 35) {
                        allRows.push(...await ImportFromExcelComponent.updateColsOnServer(rowsToUpdate, keyFromColumnInCompare(col), this.addDelivery, this.compareBasketType));
                        if (new Date().valueOf() - lastDate > 1000) {
                            this.dialog.Info(i.rowInExcel + ' ' + (i.name));
                        }
                        rowsToUpdate = [];
                    }



                }
                if (rowsToUpdate.length > 0) {
                    allRows.push(...await ImportFromExcelComponent.updateColsOnServer(rowsToUpdate, keyFromColumnInCompare(col), this.addDelivery, this.compareBasketType));
                }
                this.sortRows();
                this.updateRows = allRows;
            });
        });
    }

    @BackendMethod({ allowed: Roles.admin })
    static async updateColsOnServer(rowsToUpdate: excelRowInfo[], columnMemberName: string, addDelivery: boolean, compareBasketType: boolean, context?: Context) {
        for (const r of rowsToUpdate) {
            await ImportFromExcelComponent.actualUpdateCol(r, columnMemberName, addDelivery, compareBasketType, context, getSettings(context));
        }
        return rowsToUpdate;
    }

    async updateCol(i: excelRowInfo, col: columnInCompare) {
        let r = await ImportFromExcelComponent.updateColsOnServer([i], keyFromColumnInCompare(col), this.addDelivery, this.compareBasketType);
        i.values = r[0].values;
    }
    static async actualUpdateCol(i: excelRowInfo, entityAndColumnName: string, addDelivery: boolean, compareBasketType: boolean, context: Context, settings: ApplicationSettings) {
        let c = ImportFromExcelComponent.actualGetColInfo(i, entityAndColumnName);
        if (c.existingDisplayValue == c.newDisplayValue)
            return;
        let basket = await BasketType.fromId(i.basketType, context);
        let distCenter = await DistributionCenters.fromId(i.distCenter, context);
        let f = await context.for(Families).findFirst(f => f.id.isEqualTo(i.duplicateFamilyInfo[0].id));
        let fd = await context.for(ActiveFamilyDeliveries).findFirst(fd => {
            let r = fd.family.isEqualTo(i.duplicateFamilyInfo[0].id).and(fd.distributionCenter.isEqualTo(distCenter).and(DeliveryStatus.isNotAResultStatus(fd.deliverStatus)));
            if (compareBasketType)
                return r.and(fd.basketType.isEqualTo(basket));
            return r;

        });
        if (!fd) {
            fd = f.createDelivery(distCenter);
            fd.basketType = basket;
        }
        let val = c.newValue;
        if (val === null)
            val = '';
        let col = columnFromKey(f, fd, entityAndColumnName);
        col.inputValue = val;

        await f.save();
        f.updateDelivery(fd);
        if (addDelivery) {
            for (const c of fd.$) {
                if (c == col) {
                    fd._disableMessageToUsers = true;
                    if (settings.isSytemForMlt()) {
                        fd.distributionCenter = await u(context).findClosestDistCenter(f.addressHelper.location());
                    }
                    await fd.save();
                    break;
                }
            }
        }

        c.existingDisplayValue = await getColumnDisplayValue(columnFromKey(f, fd, entityAndColumnName));
        c.existingValue = columnFromKey(f, fd, entityAndColumnName).inputValue;
    }
    async clearColumnUpdate(i: excelRowInfo, col: columnInCompare) {
        let c = this.getColInfo(i, col);
        c.newDisplayValue = c.existingDisplayValue;
        c.newValue = c.existingValue;
    }

    getColUpdateCount(col: columnInCompare) {
        let i = 0;
        let key = keyFromColumnInCompare(col);
        for (const r of this.updateRows) {
            let c = r.values[key];
            if (c && c.newDisplayValue != c.existingDisplayValue)
                i++;
        }
        return i;
    }
    sheet: string;
    async fileChange(eventArgs: any) {

        var files = eventArgs.target.files, file;
        if (!files || files.length == 0) return;
        file = files[0];
        var fileReader = new FileReader();
        fileReader.onload = async (e: any) => {
            try {
                await this.busy.doWhileShowingBusy(async () => {
                    this.filename = file.name;
                    // pre-process data
                    var binary = "";
                    var bytes = new Uint8Array(e.target.result);
                    var length = bytes.byteLength;
                    for (var i = 0; i < length; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    // call 'xlsx' to read the file
                    this.oFile = (await import('xlsx')).read(binary, { type: 'binary', cellDates: true, cellStyles: true });
                    let sheets = this.oFile.SheetNames;
                    let sheet = sheets[0];

                    if (sheets.length > 1) {
                        await new Promise(x => setTimeout(() => {
                            x({});
                        }, 500));
                        await openDialog(SelectListComponent, x => {
                            x.args = {
                                title: use.language.selectExcelSheet,
                                options: sheets.map(x => ({ name: x, item: x } as selectListItem)),
                                onSelect: x => sheet = x[0].name
                            }
                        });
                    }
                    this.sheet = sheet;
                    this.worksheet = this.oFile.Sheets[sheet];
                    let sRef = this.worksheet["!ref"];
                    if (!sRef)
                        throw use.language.excelSheel + ' "' + this.sheet + '" ' + use.language.excelSheetIsEmpty;
                    let to = sRef.substr(sRef.indexOf(':') + 1);

                    let maxLetter = 'A';
                    for (let index = 0; index < to.length; index++) {
                        const element = to[index];
                        if ('1234567890'.indexOf(element) >= 0) {
                            maxLetter = to.substring(0, index);
                            this.totalRows = +to.substring(index, 20);
                            break;
                        }

                    }

                    if (!this.totalRows) {
                        debugger;
                    }
                    if (this.totalRows > 500000)
                        this.totalRows = 0;
                    let colPrefix = '';
                    let colName = 'A';
                    let colIndex = 0;
                    this.excelColumns = [];
                    while (true) {
                        this.excelColumns.push({
                            excelField: colPrefix + colName,
                            field: undefined,
                            title: this.getTheData(colPrefix + colName + 1)
                        });
                        let done = false;
                        if (colPrefix + colName == maxLetter)
                            done = true;
                        let j = colName.charCodeAt(0);
                        j++;
                        colName = String.fromCharCode(j);
                        if (colName > 'Z') {
                            colName = 'A';
                            if (colPrefix == 'A')
                                colPrefix = 'B';
                            else
                                colPrefix = 'A';
                        }
                        if (done) {

                            break;
                        }
                        if (this.excelColumns.length > 100)
                            break;
                    }
                    for (const col of this.excelColumns) {

                        let searchName = col.title;
                        switch (searchName) {
                            case this.f.status.caption:
                            case this.f.fixedCourier.caption:
                                break;
                            default:
                                for (const up of this.columns) {
                                    if (searchName == up.name || (up.searchNames && up.searchNames.indexOf(searchName) >= 0)) {
                                        col.field = up;
                                        break;
                                    }

                                }
                                break;
                        }

                    }
                    this.rows = [];
                    for (let index = 2; index <= this.totalRows; index++) {
                        this.rows.push(index);
                    }
                });
            }
            catch (err) {
                this.fileInput.nativeElement.value = '';

                throw err;
            }
            this.fileInput.nativeElement.value = '';
            let prevName = localStorage.getItem(excelLastFileName);
            if (prevName == this.filename)
                this.loadSettings();
            this.stepper.next();

        };
        fileReader.readAsArrayBuffer(file);
    }

    async readLine(row: number, updatedFields: Map<FieldMetadata<any>, boolean>): Promise<excelRowInfo> {

        let f = this.context.for(Families).create();
        let fd = this.context.for(ActiveFamilyDeliveries).create();
        fd.basketType = this.defaultBasketType;
        fd.distributionCenter = this.distributionCenter;
        f.status = FamilyStatus.Active;

        fd.quantity = 1;
        f._disableAutoDuplicateCheck = true;



        let helper = new columnUpdateHelper(this.context, this.dialog, this.settings.excelImportAutoAddValues, fd);
        for (const c of this.excelColumns) {
            if (c.field) {
                let val = this.getTheData(c.excelField + row);
                if (val && val.length > 0)
                    await c.field.updateFamily(val, f, helper);
            }
        }
        for (const v of this.additionalColumns) {
            await v.field.updateFamily(v.value, f, helper);
        }
        helper.laterSteps.sort((a, b) => a.step - b.step);
        for (const s of helper.laterSteps) {
            await s.what();
        }


        if (this.useFamilyMembersAsNumOfBaskets && !updatedFields.get(this.fd.quantity)) {
            fd.quantity = f.familyMembers;
        }
        if (this.settings.excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery) {
            if (fd.$.basketType.wasChanged()) {
                f.basketType = fd.basketType;
            }
            if (fd.$.quantity.wasChanged()) {
                f.quantity = fd.quantity;
            }
            if (fd.$.deliveryComments.wasChanged()) {
                f.deliveryComments = fd.deliveryComments;
            }
            if (fd.$.courier.wasChanged()) {
                f.fixedCourier = fd.courier;
            }
        }

        if (f.phone1?.displayValue == f.phone2?.displayValue)
            f.phone2 = new Phone('');

        let info: excelRowInfo = {
            name: f.name,
            tz: f.tz,
            tz2: f.tz2,
            address: f.address,
            phone1ForDuplicateCheck: f.phone1?.thePhone,
            phone2ForDuplicateCheck: f.phone2?.thePhone,
            phone3ForDuplicateCheck: f.phone3?.thePhone,
            phone4ForDuplicateCheck: f.phone4?.thePhone,
            distCenter: DistributionCenters.toId(fd.distributionCenter),
            basketType: fd.basketType.id,
            idInHagai: updatedFields.get(this.f.id) ? f.id : '',
            iDinExcel: f.iDinExcel,

            valid: true,
            rowInExcel: row,
            values: {}
        };
        if (!f.name) {
            info.error = this.settings.lang.lineWithNoName;
        }
        for (const e of [f, fd]) {

            for (const c of e.$) {
                if (c.error) {
                    if (c.error) {
                        c.error += ", ";
                    }
                    c.error += c.metadata.caption + ": " + c.error;
                    info.valid = false;
                }

                if (c.value !== undefined) {
                    info.values[keyFromColumnInCompare({ e: e._.repository.metadata, c: c.metadata })] = {
                        newDisplayValue: await getColumnDisplayValue(c),
                        newValue: c.inputValue
                    };
                }
            }
        }


        return info;

    }


    f: FieldsMetadata<Families>;
    fDefs: EntityMetadata<Families>;
    fd: FieldsMetadata<ActiveFamilyDeliveries>;
    fdDefs: EntityMetadata<ActiveFamilyDeliveries>;
    @ViewChild("stepper", { static: true }) stepper: MatStepper;
    @ViewChild("file", { static: true }) fileInput: ElementRef

    settingsArea: DataAreaSettings = new DataAreaSettings();
    async ngOnInit() {
        this.addDelivery = true;
        this.defaultBasketType = await u(this.context).defaultBasketType();
        this.distributionCenter = this.dialog.distCenter;
        if (this.distributionCenter == null)
            this.distributionCenter = await DistributionCenters.getDefault(this.context);






        let updateCol = (col: FieldRef<any>, val: string, seperator: string = ' ') => {

            if (col.value) {
                col.value = (col.value + seperator + val).trim();
            } else
                col.value = val;
        }
        this.fDefs = this.context.for(Families).metadata;
        this.f = this.fDefs.fields;
        this.fdDefs = this.context.for(ActiveFamilyDeliveries).metadata;
        this.fd = this.fdDefs.fields;
        if (false) {
            try {
                this.errorRows = JSON.parse(sessionStorage.getItem("errorRows"));
                this.newRows = JSON.parse(sessionStorage.getItem("newRows"));
                this.updateRows = JSON.parse(sessionStorage.getItem("updateRows"));
                this.identicalRows = JSON.parse(sessionStorage.getItem("identicalRows"));
                this.columnsInCompare = JSON.parse(sessionStorage.getItem("columnsInCompare")).map(x => this.f.$[x]);
                if (this.columnsInCompare.length > 0) {
                    setTimeout(() => {
                        this.stepper.next();
                        this.stepper.next();

                    }, 100);
                }
            }
            catch (err) {
                console.log(err);
            }
        }

        let addColumn = (col: FieldMetadata, searchNames?: string[]) => {
            this.columns.push({
                key: col.key,
                name: col.caption,
                updateFamily: async (v, f) => {
                    updateCol(f.$.find(col), v);
                },
                searchNames: searchNames,
                columns: [col]
            });
        }
        let addColumns = (cols: FieldMetadata[]) => {
            for (const col of cols) {
                addColumn(col);
            }
        };
        addColumn(this.f.name, [use.language.lastName, use.language.family]);
        addColumn(this.f.area);
        this.columns.push({
            key: 'firstName',
            name: use.language.firstName,
            updateFamily: async (v, f, h) => { h.laterSteps.push({ step: 2, what: async () => updateCol(f.$.name, v) }) },
            columns: [this.f.name],
            searchNames: [use.language.firstNameShort]
        });
        addColumns([

            this.f.postalCode
        ]);
        addColumn(this.f.id);
        this.columns.push({
            key: 'address',
            name: use.language.address,
            searchNames: [use.language.streetName],
            updateFamily: async (v, f) => {
                if (this.settings.lang.languageCode == 'iw') {
                    let r = parseAddress(v);
                    if (r.address)
                        updateCol(f.$.address, r.address);
                    if (r.dira)
                        updateCol(f.$.appartment, r.dira);
                    if (r.floor)
                        updateCol(f.$.floor, r.floor);
                    if (r.knisa)
                        updateCol(f.$.entrance, r.knisa);
                }
                else f.address = v;
            },
            columns: [this.f.address, this.f.appartment, this.f.floor, this.f.entrance]
        });
        this.columns.push({
            key: 'city',
            name: use.language.city,
            searchNames: ['ישוב', 'יישוב'],
            updateFamily: async (v, f, h) => {
                h.laterSteps.push({
                    step: 3,
                    what: async () => updateCol(f.$.address, v)
                })
            }
            , columns: [this.f.address]
        });
        this.columns.push({
            key: 'houseNum',
            name: use.language.houseNumber,
            searchNames: ["בית", "מס' בית", "מס בית"],
            updateFamily: async (v, f, h) => {
                h.laterSteps.push({
                    step: 2,
                    what: async () => {
                        let r = parseAddress(v);
                        if (r.address)
                            updateCol(f.$.address, r.address);
                        if (r.dira)
                            updateCol(f.$.appartment, r.dira);
                        if (r.floor)
                            updateCol(f.$.floor, r.floor);
                        if (r.knisa)
                            updateCol(f.$.entrance, r.knisa);
                    }
                });

            }
            , columns: [this.f.address]
        });
        this.columns.push({
            key: 'boxes',
            name: use.language.quantity,
            updateFamily: async (v, f, h) => {
                let val = +leaveOnlyNumericChars(v);
                if (val < 1)
                    val = 1;
                h.fd.quantity = val;

            }, columns: [this.fd.quantity]
        });

        this.columns.push({
            key: 'deliveryComments',
            name: this.fd.deliveryComments.caption,
            updateFamily: async (v, f, h) => {
                updateCol(h.fd.$.deliveryComments, v);
            },
            columns: [this.fd.deliveryComments]
        });

        this.columns.push({
            key: 'basketType',
            name: this.fd.basketType.caption,
            updateFamily: async (v, f, h) => {
                await h.lookupAndInsert(BasketType, b => b.name, v, b => b, h.fd.$.basketType);
            }, columns: [this.fd.basketType]
        });


        this.columns.push({
            key: 'distCenterName',
            name: this.fd.distributionCenter.caption,
            updateFamily: async (v, f, h) => {
                await h.lookupAndInsert(DistributionCenters, b => b.name, v, b => b, h.fd.$.distributionCenter);
            }, columns: [this.fd.distributionCenter]
        });
        this.columns.push({
            key: 'familySource',
            name: this.f.familySource.caption,
            updateFamily: async (v, f, h) => {
                await h.lookupAndInsert(FamilySources, f => f.name, v, f => f, f.$.familySource);
            }, columns: [this.f.familySource]
        });

        this.columns.push({
            key: 'volunteer',
            name: this.fd.courier.caption + ' ' + use.language.volunteerName,
            updateFamily: async (v, f, h) => {
                h.laterSteps.push({
                    step: 3, what: async () => {
                        if (h.gotVolunteerPhone) {
                            if (h.fd.courier) {
                                let help = await h.fd.$.courier.load();
                                if (!help.isNew()) {
                                    help.name = v;
                                    if (help.wasChanged())
                                        await help.save();
                                }
                            }
                        }
                        else {

                            await h.lookupAndInsert(Helpers, h => h.name, v, h => h, h.fd.$.courier, x => {
                                x._disableDuplicateCheck = true;
                            });
                        }
                    }
                });
            }, columns: [this.fd.courier]
        });
        this.columns.push({
            key: 'volunteerPhone',
            name: this.fd.courier.caption + " " + use.language.phone,

            updateFamily: async (v, f, h) => {
                h.gotVolunteerPhone = true;
                v = Phone.fixPhoneInput(v, this.context);
                await h.lookupAndInsert(Helpers, h => h.phone, new Phone(v), h => h, h.fd.$.courier, x => {
                    x.name = 'מתנדב ' + v;
                });
            }, columns: [this.fd.courier]
        });



        for (const c of [this.f.phone1, this.f.phone2, this.f.phone3, this.f.phone4, this.f.socialWorkerPhone1, this.f.socialWorkerPhone2]) {
            this.columns.push({
                key: c.key,
                name: c.caption,
                columns: [c],
                updateFamily: async (v, f) => updateCol(f.$.find(c), fixPhone(v, this.settings.defaultPrefixForExcelImport))
            });
        }


        addColumn(this.f.familyMembers, ["נפשות", "מס נפשות"]);
        addColumn(this.f.tz, ["ת.ז.", "ת\"ז"]);
        addColumn(this.f.tz2);
        for (const c of [this.f.custom1, this.f.custom2, this.f.custom3, this.f.custom4]) {
            if (getCustomColumnVisible(c))
                addColumn(c);
        }
        addColumns([

            this.f.iDinExcel,

            this.f.floor,
            this.f.appartment,
            this.f.entrance,
            this.f.buildingCode,
            this.f.socialWorker,
            this.f.email

        ]);
        for (const col of [this.f.phone1Description,
        this.f.phone2Description,
        this.f.phone3Description,
        this.f.phone4Description,
        this.f.internalComment,
        this.f.addressComment]) {
            this.columns.push({
                key: col.key,
                name: col.caption,
                updateFamily: async (v, f, h) => {

                    updateCol(f.$.find(col), v, ', ');
                }, columns: [col]
            });
        }
        this.columns.push({
            key: this.f.groups.key,
            name: this.f.groups.caption,
            updateFamily: async (v, f, h) => {
                if (v && v.trim().length > 0) {
                    let g = await this.context.for(Groups).findFirst({ createIfNotFound: true, where: g => g.name.isEqualTo(v.trim()) });
                    if (g.isNew())
                        await g.save();
                }
                updateCol(f.$.find(this.f.groups), v, ', ');
            }, columns: [this.f.groups]
        });
        this.columns.push({
            key: 'phone_complex',
            name: use.language.phone,
            updateFamily: async (v, f, h) => {
                h.laterSteps.push({
                    step: 2, what: async () => {
                        parseAndUpdatePhone(v, f, this.settings.defaultPrefixForExcelImport);
                    }
                });
            },
            columns: [this.f.phone1, this.f.phone1Description, this.f.phone2, this.f.phone2Description, this.f.phone3, this.f.phone3Description, this.f.phone4, this.f.phone4Description]
        })

        this.columns.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0);

    }

    errorRows: excelRowInfo[] = [];
    newRows: excelRowInfo[] = [];
    identicalRows: excelRowInfo[] = [];
    updateRows: excelRowInfo[] = [];
    @Field({ translation: l => l.defineDeliveriesForFamiliesInExcel })
    addDelivery: boolean;
    @Field({ translation: l => l.ifBasketTypeInExcelIsDifferentFromExistingOneCreateNewDelivery })
    compareBasketType: boolean;
    @Field({ translation: l => l.basketType })
    defaultBasketType: BasketType;
    @Field({ translation: l => l.distributionList })
    distributionCenter: DistributionCenters;
    @Field({ translation: l => l.useFamilyMembersAsQuantity })
    useFamilyMembersAsNumOfBaskets: boolean;
    get $() { return getFields(this, this.context) };

    moveToAdvancedSettings() {

        this.stepper.next();
        let updateColumns = this.buildUpdatedColumns();



        this.settingsArea = new DataAreaSettings({
            fields: () => {
                let s = this.settings;
                let result: DataAreaFieldsSetting<any>[] = [];
                result = [
                    this.$.addDelivery,
                    { field: this.$.defaultBasketType, visible: () => this.addDelivery && !updateColumns.get(this.fd.basketType) && !updateColumns.get(this.f.basketType) },
                    { field: s.$.excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery, visible: () => this.addDelivery },
                    { field: this.$.compareBasketType, visible: () => this.addDelivery },
                    { field: this.$.distributionCenter, visible: () => this.addDelivery && !updateColumns.get(this.fd.distributionCenter) && this.dialog.hasManyCenters },
                    { field: this.$.useFamilyMembersAsNumOfBaskets, visible: () => this.addDelivery && !updateColumns.get(this.fd.quantity) && updateColumns.get(this.f.familyMembers) },
                    s.$.defaultPrefixForExcelImport,
                    s.$.checkIfFamilyExistsInFile,
                    s.$.checkDuplicatePhones,
                    s.$.excelImportAutoAddValues,
                    s.$.checkIfFamilyExistsInDb,
                    s.$.removedFromListStrategy
                ]
                return result;
            }
        });
    }
    columnsInCompareMemberName: string[];
    async iterateExcelFile(actualImport = false) {

        this.errorRows = [];
        this.newRows = [];
        this.updateRows = [];
        this.identicalRows = [];
        let rows: excelRowInfo[] = [];
        let usedTz = new Map<number, excelRowInfo>();
        let usedPhone = new Map<number, excelRowInfo>();
        this.stepper.next();
        let updatedColumns = this.buildUpdatedColumns();
        await this.busy.doWhileShowingBusy(async () => {
            let originalUpdateFields = this.buildUpdatedColumns();
            if (this.addDelivery) {
                updatedColumns.set(this.fd.basketType, true);
                updatedColumns.set(this.fd.distributionCenter, true);
                updatedColumns.set(this.fd.quantity, true);
            }
            else {
                for (const iterator of this.fd) {
                    updatedColumns.set(iterator, false);
                }
            }
            updatedColumns.set(this.f.status, true);
            this.columnsInCompare = [];
            this.columnsInCompareMemberName = [];
            var laterColumnsInCompare = [];
            for (let e of [this.fDefs, this.fdDefs]) {
                for (let c of e.fields) {
                    if (updatedColumns.get(c)) {
                        if (c == this.fd.distributionCenter && !this.dialog.hasManyCenters)
                            continue;
                        if (c == this.f.basketType || c == this.f.quantity || c == this.f.deliveryComments || c == this.f.fixedCourier) {
                            laterColumnsInCompare.push(c);
                        }
                        else {
                            this.columnsInCompare.push({ c, e });
                            this.columnsInCompareMemberName.push(keyFromColumnInCompare({ e, c }));
                        }
                    }
                }
            }
            for (const c of laterColumnsInCompare) {
                this.columnsInCompare.push({ c, e: this.fDefs });
                this.columnsInCompareMemberName.push(keyFromColumnInCompare({ e: this.fDefs, c }));
            }


            await new Promise((resolve) => setTimeout(() => {
                resolve({});
            }, 500));
            let index;
            var start = new Date().valueOf();
            try {
                for (index = 2; index <= this.totalRows; index++) {
                    if (index % 10000 == 0) {
                        var timeLeft = ((new Date().valueOf() - start) / index * (this.totalRows - index)) / 1000 / 60;

                        this.dialog.Info(index + " " + use.language.linesProcessed + " " + timeLeft.toFixed(1) + " " + use.language.minutesRemaining);
                        await new Promise(r => {
                            setTimeout(() => {
                                { r({}) };
                            }, 100);
                        });
                    }
                    let f = await this.readLine(index, originalUpdateFields);
                    if (f.error) {
                        this.errorRows.push(f);
                    }
                    else {

                        let exists = (val: string, map: Map<number, excelRowInfo>, caption: string) => {
                            let origVal = val;
                            if (!val)
                                return false;
                            val = val.replace(/\D/g, '');
                            if (val.length == 0)
                                return false;
                            if (+val == 0)
                                return false;
                            let x = map.get(+val);
                            if (x && x.rowInExcel < index) {
                                f.error = caption + ' - ' + origVal + ' - ' + use.language.alreadyExistsInLine + ' ' + x.rowInExcel;
                                f.otherExcelRow = x;
                                return true;
                            }
                            map.set(+val, f);
                            return false;
                        };
                        if (!this.settings.checkDuplicatePhones) {
                            f.phone1ForDuplicateCheck = '';
                            f.phone2ForDuplicateCheck = '';
                            f.phone3ForDuplicateCheck = '';
                            f.phone4ForDuplicateCheck = '';
                        }

                        if (this.settings.checkIfFamilyExistsInFile && (exists(f.tz, usedTz, use.language.socialSecurityNumber) || this.settings.checkDuplicatePhones &&
                            (exists(f.phone1ForDuplicateCheck, usedPhone, use.language.phone1)
                                || exists(f.phone2ForDuplicateCheck, usedPhone, use.language.phone2)
                                || exists(f.phone3ForDuplicateCheck, usedPhone, use.language.phone3)
                                || exists(f.phone4ForDuplicateCheck, usedPhone, use.language.phone4)
                            ))) {
                            this.errorRows.push(f);
                        }

                        else
                            rows.push(f);
                    }

                    if (rows.length == 50) {
                        this.dialog.Info((index - 1) + ' ' + (f.name ? f.name : use.language.unnamed) + ' ' + (f.error ? f.error : ''));
                        await this.processExcelRowsAndCheckOnServer(rows);
                        rows = [];
                    }
                }
                if (rows.length > 0) {
                    await this.processExcelRowsAndCheckOnServer(rows);
                }



                let check = new Map<string, excelRowInfo[]>();
                let collected: excelRowInfo[][] = [];
                for (const row of this.updateRows) {
                    if (row.duplicateFamilyInfo && row.duplicateFamilyInfo.length == 1) {
                        let rowInfo: excelRowInfo[];
                        if (rowInfo = check.get(row.duplicateFamilyInfo[0].id)) {
                            rowInfo.push(row);
                        }
                        else {
                            let arr = [row];
                            check.set(row.duplicateFamilyInfo[0].id, arr);
                            collected.push(arr);
                        }
                    }
                }
                this.sortRows();
                for (const iterator of collected) {
                    if (iterator.length > 1) {
                        for (const row of iterator) {
                            row.error = use.language.sameLineExcelMatchesSeveralRowsInTheDatabase + ' ' + iterator.map(x => x.rowInExcel.toString()).join(', ');
                            this.errorRows.push(row);
                            this.updateRows.splice(this.updateRows.indexOf(row), 1);
                        }
                    }
                }
                if (this.newRows.length > 0) {
                    let suspectAddress = 0;
                    for (const r of this.newRows) {
                        if (!r.address || r.address.match(/[0-9]$/))
                            suspectAddress++;
                    }
                    let precent = (suspectAddress * 100 / this.newRows.length);
                    if (precent > 30 && updatedColumns.get(this.f.address)) {
                        if (await this.dialog.YesNoPromise(precent.toFixed() + "% " + use.language.manyAddressesEndWithNumber)) {
                            this.stepper.previous();
                            this.stepper.previous();
                        }
                    }
                }


                /*
                                sessionStorage.setItem("errorRows", JSON.stringify(this.errorRows));
                                sessionStorage.setItem("newRows", JSON.stringify(this.newRows));
                                sessionStorage.setItem("updateRows", JSON.stringify(this.updateRows));
                                sessionStorage.setItem("identicalRows", JSON.stringify(this.identicalRows));
                */
                sessionStorage.setItem("columnsInCompare", JSON.stringify(this.columnsInCompareMemberName));
            }
            catch (err) {
                this.stepper.previous();
                this.dialog.exception("import aborted in line - " + index + ": ", err);
            }
        });


    }
    private async processExcelRowsAndCheckOnServer(rows: excelRowInfo[]) {
        if (this.settings.checkIfFamilyExistsInDb) {

            let r = await ImportFromExcelComponent.checkExcelInput(rows, this.columnsInCompareMemberName, this.compareBasketType);
            this.errorRows.push(...r.errorRows);
            this.newRows.push(...r.newRows);
            this.updateRows.push(...r.updateRows);
            this.identicalRows.push(...r.identicalRows);
        }
        else {
            this.newRows.push(...rows);
        }
    }

    private buildUpdatedColumns() {
        let updatedColumns = new Map<FieldMetadata, boolean>();
        this.additionalColumns = this.additionalColumns.filter(x => x.field);
        //updatedColumns.set(this.f.status, true);
        for (const cu of [...this.excelColumns.map(f => f.field), ...this.additionalColumns.map(f => f.field)]) {
            if (cu)
                for (const c of cu.columns) {
                    updatedColumns.set(c, true);
                }
        }
        if (this.settings.excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery) {
            if (updatedColumns.get(this.fd.basketType)) {
                updatedColumns.set(this.f.basketType, true);
            }
            if (updatedColumns.get(this.fd.courier)) {
                updatedColumns.set(this.f.fixedCourier, true);
            }
            if (updatedColumns.get(this.fd.quantity)) {
                updatedColumns.set(this.f.quantity, true);
            }
            if (updatedColumns.get(this.fd.deliveryComments)) {
                updatedColumns.set(this.f.deliveryComments, true);
            }
        }
        return updatedColumns;
    }

    displayDupInfo(info: duplicateFamilyInfo) {
        let r = '';
        if (info.removedFromList) {
            r = use.language.removedFromList + '! ';
        }
        return r + displayDupInfo(info, this.context);
    }

    @BackendMethod({ allowed: Roles.admin })
    static async checkExcelInput(excelRowInfo: excelRowInfo[], columnsInCompareMemeberName: string[], compareBasketType: boolean, context?: Context, db?: SqlDatabase) {
        let result: serverCheckResults = {
            errorRows: [],
            identicalRows: [],
            newRows: [],
            updateRows: []

        } as serverCheckResults;
        let settings = await ApplicationSettings.getAsync(context);
        for (const info of excelRowInfo) {
            info.duplicateFamilyInfo = [];
            let findDuplicate = async (w: (f: FilterFactories<Families>) => Filter) => {
                if (info.duplicateFamilyInfo.length == 0)
                    info.duplicateFamilyInfo = (await context.for(Families).find({ where: f => new AndFilter(w(f), f.status.isDifferentFrom(FamilyStatus.ToDelete)) }))
                        .map(f => (<duplicateFamilyInfo>{
                            id: f.id,
                            address: f.address,
                            name: f.name,
                            tz: true,
                            removedFromList: f.status == FamilyStatus.RemovedFromList,
                            rank: 9
                        }));
            }
            if (info.idInHagai)
                await findDuplicate(f => f.id.isEqualTo(info.idInHagai));
            else {
                if (info.iDinExcel && info.duplicateFamilyInfo.length == 0)
                    await findDuplicate(f => f.iDinExcel.isEqualTo(info.iDinExcel));
                if (info.tz && info.duplicateFamilyInfo.length == 0)
                    await findDuplicate(f => f.tz.isEqualTo(info.tz));

                if (info.duplicateFamilyInfo.length == 0) {
                    info.duplicateFamilyInfo = await Families.checkDuplicateFamilies(info.name, info.tz, info.tz2, info.phone1ForDuplicateCheck, info.phone2ForDuplicateCheck, info.phone3ForDuplicateCheck, info.phone4ForDuplicateCheck, undefined, true, info.address, context, db);
                    if (info.duplicateFamilyInfo.length > 1) {
                        if (info.duplicateFamilyInfo.find(f => f.nameDup && f.sameAddress)) {
                            info.duplicateFamilyInfo = info.duplicateFamilyInfo.filter(f => !onlyNameMatch(f)
                            )
                        }
                    }
                }
            }

            if (settings.removedFromListStrategy == RemovedFromListExcelImportStrategy.ignore) {
                info.duplicateFamilyInfo = info.duplicateFamilyInfo.filter(x => !x.removedFromList);
            }
            if (!info.duplicateFamilyInfo || info.duplicateFamilyInfo.length == 0) {
                result.newRows.push(info);
            } else if (info.duplicateFamilyInfo.length > 1) {
                info.error = getLang(context).moreThanOneRowInDbMatchesExcel;
                result.errorRows.push(info);
            } else {
                let hasDifference = false;
                let existingFamily;
                ({ ef: existingFamily, hasDifference } = await compareValuesWithRow(context, info, info.duplicateFamilyInfo[0].id, compareBasketType, columnsInCompareMemeberName));
                if (existingFamily.status == FamilyStatus.RemovedFromList) {
                    switch (settings.removedFromListStrategy) {
                        case RemovedFromListExcelImportStrategy.displayAsError:
                            info.error = use.language.familyAlreadyRemovedFromList;
                            result.errorRows.push(info);
                            break;
                        case RemovedFromListExcelImportStrategy.showInUpdate:
                            result.updateRows.push(info);
                            break;
                        case RemovedFromListExcelImportStrategy.ignore:
                            result.newRows.push(info);
                            break;
                    }
                }
                else if (hasDifference) {
                    result.updateRows.push(info);
                }
                else
                    result.identicalRows.push(info);
            }
        }
        return result;
    }


    saveSettings() {
        let save: storedInfo = {
            storedColumns: [],
            additionalColumns: []
        };
        for (const item of this.excelColumns) {
            save.storedColumns.push({
                excelField: item.excelField,
                columnKey: item.field ? item.field.key : undefined
            });
        }
        for (const item of this.additionalColumns) {
            save.additionalColumns.push({
                value: item.value,
                columnKey: item.field ? item.field.key : undefined
            });
        }
        localStorage.setItem(excelSettingsSave, JSON.stringify(save));
        localStorage.setItem(excelLastFileName, this.filename);
    }
    loadSettings() {
        let loaded = JSON.parse(localStorage.getItem(excelSettingsSave)) as storedInfo;
        if (loaded) {
            for (const excelItem of this.excelColumns) {
                for (const loadedItem of loaded.storedColumns) {
                    if (loadedItem.excelField == excelItem.excelField) {
                        excelItem.field = undefined;
                        for (const col of this.columns) {
                            if (col.key == loadedItem.columnKey) {
                                excelItem.field = col;
                            }
                        }
                    }
                }
            }
            this.additionalColumns = [];
            for (const loadedItem of loaded.additionalColumns) {

                for (const col of this.columns) {
                    if (col.key == loadedItem.columnKey) {
                        this.additionalColumns.push({
                            field: col,
                            value: loadedItem.value
                        });
                    }
                }
            }

        }
    }
    clearSettings() {
        for (const excelItem of this.excelColumns) {
            excelItem.field = undefined;
        }
    }
    async moveFromErrorToAdd(r: excelRowInfo) {
        let name = r.name;
        if (!name) {
            name = use.language.unnamed;
        }
        if (await this.ask(use.language.moveTheFamily + " " + name + " " + use.language.toNewFamilies + "?")) {
            if (!r.name) {
                r.name = name;
                r.values[keyFromColumnInCompare({ e: this.fDefs, c: this.f.name })] = { newValue: r.name, newDisplayValue: r.name };
            }
            let x = this.errorRows.indexOf(r);
            this.errorRows.splice(x, 1);
            this.newRows.push(r);
            this.sortRows();
        }

    }
    stopAskingQuestions = false;
    async openFamilyInfo(r: excelRowInfo) {
        let f = await this.context.for(Families).findId(r.duplicateFamilyInfo[0].id);
        await f.showFamilyDialog();
    }
    async familyHistory(r: excelRowInfo) {
        let f = await this.context.for(Families).findId(r.duplicateFamilyInfo[0].id);
        let result = new GridSettings(this.context.for(FamilyDeliveries), {
            numOfColumnsInGrid: 7,

            rowCssClass: fd => fd.deliverStatus.getCss(),


            columnSettings: fd => {
                let r: DataControlInfo<FamilyDeliveries>[] = [
                    fd.deliverStatus,
                    fd.deliveryStatusDate,
                    fd.courierComments,
                    {
                        field: fd.address,
                        caption: 'כתובת כפי שידענו אז'
                    },
                    fd.floor,
                    fd.appartment,
                    fd.entrance,
                    fd.addressComment,
                    fd.internalDeliveryComment,
                    fd.distributionCenter
                ];
                r.push(...[...fd].filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.caption.localeCompare(b.caption)));
                return r;
            },

            where: fd => fd.family.isEqualTo(f.id),
            orderBy: fd => fd.deliveryStatusDate.descending(),
            rowsInPage: 25

        });


        openDialog(GridDialogComponent, x => x.args = {
            title: getLang(this.context).familyHistory + ' ' + f.name,
            settings: result,

        });
    }
    async moveFromErrorToProcess(r: excelRowInfo) {
        let name = r.name;
        if (!name) {
            name = use.language.unnamed;
        }
        if (await this.ask(use.language.importFamily + " " + name + "?")) {
            if (!r.name) {
                r.name = name;
                r.values[keyFromColumnInCompare({ e: this.fDefs, c: this.f.name })] = { newValue: r.name, newDisplayValue: r.name };
            }
            r.otherExcelRow = undefined;
            let x = this.errorRows.indexOf(r);
            this.errorRows.splice(x, 1);
            await this.processExcelRowsAndCheckOnServer([r]);
            this.sortRows();
        }

    }
    async moveFromErrorToUpdate(i: excelRowInfo, f: duplicateFamilyInfo) {
        if (await this.ask(use.language.shouldCompare + ` "${i.name}" ` + use.language.compareTo + `" ${f.name}" ` + use.language.andMoveToUpdateFamilies)) {
            await this.actualMoveFromErrorToUpdate(i, f);
        }

    }
    async ask(what: string) {
        if (this.stopAskingQuestions)
            return true;
        return await this.dialog.YesNoPromise(what);
    }
    private async actualMoveFromErrorToUpdate(i: excelRowInfo, f: duplicateFamilyInfo) {
        let r = await compareValuesWithRow(this.context, i, f.id, this.compareBasketType, this.columnsInCompareMemberName);
        i.duplicateFamilyInfo = [f];
        if (r.hasDifference) {
            this.updateRows.push(i);
            this.sortRows();
        }
        else {
            this.identicalRows.push(i);
            this.sortRows();
        }
        this.errorRows.splice(this.errorRows.indexOf(i), 1);
        for (const e of this.errorRows) {
            if (e.duplicateFamilyInfo) {
                let x = e.duplicateFamilyInfo.findIndex(x => x.id == f.id);
                if (x >= 0) {
                    e.duplicateFamilyInfo.splice(x, 1);
                    if (e.duplicateFamilyInfo.length == 1)
                        this.actualMoveFromErrorToUpdate(e, e.duplicateFamilyInfo[0]);
                }
            }
        }
    }

    moveFromUpdateToAdd(r: excelRowInfo) {
        this.dialog.YesNoQuestion(use.language.moveTheFamily + " " + r.name + " " + use.language.toNewFamilies + "?", () => {
            let x = this.updateRows.indexOf(r);
            this.updateRows.splice(x, 1);
            this.newRows.push(r);
            this.sortRows();
        });

    }
    sortRows() {
        this.updateRows.sort((a, b) => a.rowInExcel - b.rowInExcel);
        this.identicalRows.sort((a, b) => a.rowInExcel - b.rowInExcel);
        this.newRows.sort((a, b) => a.rowInExcel - b.rowInExcel);
        this.errorRows.sort((a, b) => a.rowInExcel - b.rowInExcel);
    }

    async testImport() {
        if (this.settings.wasChanged())
            await this.settings.save();
        await this.iterateExcelFile(false);
    }

    async createImportReport() {
        let rows: importReportRow[] = [];
        let addRows = (from: excelRowInfo[], status: string, updateRows?: boolean) => {
            for (const f of from) {
                let r: importReportRow = {
                    "excelLine": f.rowInExcel,
                    "import-status": status,
                    "error": f.error
                };
                if (f.created) {
                    r["import-status"] = use.language.addedToDb;
                    f.error = '';
                }
                for (const col of this.columnsInCompare) {

                    let v = f.values[keyFromColumnInCompare(col)];
                    if (v)
                        r[col.c.caption] = updateRows ? v.existingDisplayValue : v.newDisplayValue;
                    if (r[col.c.caption] === undefined)
                        r[col.c.caption] = '';
                }
                rows.push(r);
            }
        };
        addRows(this.newRows, use.language.notImported);
        addRows(this.updateRows, use.language.existsWithAnUpdate, true);
        addRows(this.identicalRows, use.language.existsIdenticat);
        addRows(this.errorRows, use.language.error);
        rows.sort((a, b) => a["excelLine"] - b["excelLine"]);
        await jsonToXlsx(this.busy, rows, Sites.getOrganizationFromContext(this.context) + ' import summary ' + new Date().toLocaleString('he').replace(/:/g, '-').replace(/\./g, '-').replace(/,/g, '') + this.filename);
    }

    async updateFamily(i: duplicateFamilyInfo) {
        let f = await this.context.for(Families).findFirst(f => f.id.isEqualTo(i.id));
        f.showFamilyDialog();

    }
}
interface importReportRow {
    "excelLine": number;
    "import-status": string;
    "error"?: string;
    [caption: string]: any;
}


const excelSettingsSave = 'excelSettingsSave';
const excelLastFileName = 'excelLastFileName';


interface excelColumn {
    excelField: string;
    field: columnUpdater;
    title: string;
}
interface additionalColumns {
    field?: columnUpdater,
    value?: string
}
interface storedInfo {
    storedColumns: storedColumnSettings[],
    additionalColumns: storedAdditionalColumnSettings[]
}
interface storedColumnSettings {
    excelField: string;
    columnKey: string;
}
interface storedAdditionalColumnSettings {
    columnKey: string;
    value: string;
}
interface columnUpdater {
    key: string;
    name: string;
    searchNames?: string[];
    updateFamily: (val: string, f: Families, h: columnUpdateHelper) => Promise<void>;
    columns: FieldMetadata[];
}
class columnUpdateHelper {
    constructor(private context: Context, private dialog: DialogService, private autoAdd: boolean, public fd: ActiveFamilyDeliveries) {

    }
    laterSteps: laterSteps[] = [];
    gotVolunteerPhone = false;

    async lookupAndInsert<T extends EntityBase, dataType, Y>(
        c: { new(...args: any[]): T; },
        getSearchField: ((entity: FilterFactories<T>) => FilterFactory<dataType>),
        val: dataType,
        getResult: (entity: T) => Y,
        updateResultTo: FieldRef<any,Y>,
        additionalUpdates?: ((entity: T) => void)) {
        let x = await this.context.for(c).findFirst({ createIfNotFound: true, where: e => (getSearchField(e).isEqualTo(val)) });
        if (x.isNew()) {
            let s = updateResultTo.metadata.caption + " \"" + val + "\" " + use.language.doesNotExist;
            if (this.autoAdd || await this.dialog.YesNoPromise(s + ", " + use.language.questionAddToApplication + "?")) {

                if (additionalUpdates)
                    additionalUpdates(x);
                await x.save();
                this.dialog.refreshFamiliesAndDistributionCenters();
            }
            else {
                throw s;
            }
        }
        updateResultTo.value = getResult(x);
    }
}
interface excelRowInfo {
    rowInExcel: number;
    name: string;
    tz: string;
    tz2: string;
    iDinExcel: string;
    idInHagai: string;
    address: string;
    phone1ForDuplicateCheck: string;
    phone2ForDuplicateCheck: string;
    phone3ForDuplicateCheck: string;
    phone4ForDuplicateCheck: string;
    valid: boolean;
    error?: string;
    otherExcelRow?: excelRowInfo;
    created?: boolean;
    distCenter: string;
    basketType: string;
    duplicateFamilyInfo?: duplicateFamilyInfo[];
    values: { [key: string]: updateColumns };
    userIgnoreError?: boolean;
}
interface updateColumns {

    existingValue?: any;
    existingDisplayValue?: string;
    newValue: any;
    newDisplayValue: any;
}
interface serverCheckResults {
    newRows: excelRowInfo[],
    identicalRows: excelRowInfo[],
    updateRows: excelRowInfo[],
    errorRows: excelRowInfo[]
}
function onlyNameMatch(f: duplicateFamilyInfo) {
    return (f.nameDup
        && !f.sameAddress
        && !f.phone1
        && !f.phone2
        && !f.phone3
        && !f.phone4
        && !f.tz
        && !f.tz2);
}

async function compareValuesWithRow(context: Context, info: excelRowInfo, withFamily: string, compareBasketType: boolean, columnsInCompareMemeberName: string[]) {
    let hasDifference = false;
    let basketType = await BasketType.fromId(info.basketType, context);
    let distCenter = await DistributionCenters.fromId(info.distCenter, context);
    let ef = await context.for(Families).findFirst(f => f.id.isEqualTo(withFamily));
    let fd = await context.for(ActiveFamilyDeliveries).findFirst({
        createIfNotFound: true,
        where: fd => {
            let r = fd.family.isEqualTo(ef.id).and(fd.distributionCenter.isEqualTo(distCenter).and(DeliveryStatus.isNotAResultStatus(fd.deliverStatus)));
            if (compareBasketType)
                return r.and(fd.basketType.isEqualTo(basketType));
            return r;
        }
    });
    for (const columnMemberName of columnsInCompareMemeberName) {
        let upd = info.values[columnMemberName];
        if (!upd) {
            upd = { newDisplayValue: '', newValue: '', existingDisplayValue: '', existingValue: '' };
            info.values[columnMemberName] = upd;
        }
        let col = columnFromKey(ef, fd, columnMemberName);
        upd.existingValue = col.inputValue;
        upd.existingDisplayValue = await getColumnDisplayValue(col);
        if (upd.existingValue == upd.newValue && upd.existingValue == "")
            upd.newDisplayValue = upd.existingDisplayValue;
        if (upd.existingDisplayValue != upd.newDisplayValue) {
            if (col == ef.$.groups) {
                let existingString = ef.groups.evilGet();
                let newVal = upd.newValue;
                if (!newVal || newVal.toString() == '') {
                    upd.newValue = upd.existingValue;
                    upd.newDisplayValue = upd.existingDisplayValue;
                }
                else if (existingString && existingString.trim().length > 0) {
                    let existingArray = existingString.toString().split(',').map(x => x.trim());
                    for (const val of newVal.split(',').map(x => x.trim())) {
                        if (existingArray.indexOf(val) < 0)
                            existingArray.push(val);
                    }
                    upd.newValue = existingArray.join(', ');
                    upd.newDisplayValue = upd.newValue;
                }
            }
            if (upd.existingDisplayValue != upd.newDisplayValue) {
                hasDifference = true;
            }
        }
    }
    return { ef, hasDifference };
}

async function getColumnDisplayValue(c: FieldRef<any>) {
    await c.load();
    let v = c.displayValue;

    return v?.trim();
}
interface laterSteps {
    step: number,
    what: () => Promise<void>
}

export function fixPhone(phone: string, defaultPrefix: string) {
    if (!phone)
        return phone;
    if (phone.startsWith('0'))
        return phone;
    if ((phone.startsWith('o') || phone.startsWith('O')) && phone[1] >= '0' && phone[1] <= '9')
        return '0' + phone.substring(1, 100);
    if (phone.length == 8 || phone.length == 9)
        return '0' + phone;
    if (phone.length == 7 && defaultPrefix && defaultPrefix.length > 0)
        return defaultPrefix + phone;
    return phone;
}
export function processPhone(input: string): phoneResult[] {
    if (!input)
        return [];
    let result = [];
    let temp: string[] = [];
    let currentText = '';
    for (let i = 0; i < input.length; i++) {
        let char = input[i];
        if (char == "–")
            char = '-';
        switch (char) {
            case ' ':
            case '/':
            case '\\':
            case ',':
            case '-':
            case '|':

                if ((temp.length == 0 || temp[i - 1] != char))
                    if (currentText.length > 0) {
                        temp.push(currentText);
                        temp.push(char);
                        currentText = '';
                    }
                    else if (char == '-') {
                        if (temp.length > 0)
                            temp.push(temp.pop().trim() + char);
                        else temp.push(char);
                    }
                break;
            default:
                let d = isDigit(char);
                if (d && (currentText == 'o' || currentText == 'O'))
                    currentText = '0';
                let only = onlyDigits(currentText);
                if (d == only || currentText == '')
                    currentText += char;
                else {
                    temp.push(currentText);
                    currentText = char;
                }
                break;
        }
    }
    if (currentText > '')
        temp.push(currentText);
    let temp2 = [];
    while (temp.length > 0) {
        let c = temp.pop();
        if (c == ' ' || c == ',' || c == '-' || c == "/") {
            let prev = temp2.pop();
            if (prev) {
                let next = temp.pop();
                if (next === undefined)
                    next = '';
                let p = onlyDigits(prev);
                let n = onlyDigits(next);
                if (c == ' ' && prev == "-") {
                    c = prev;
                    prev = temp.pop();
                    if (!prev)
                        continue;
                    p = onlyDigits(prev);
                }
                if (p == n) {
                    if (!p) {

                        temp.push(next + c + prev);
                        continue;

                    }
                    if (p) {
                        if (next.length < 2 && c == ' ') {
                            temp.push(next + prev);
                            continue;
                        }


                        if (!next.startsWith('0') && prev.startsWith('0') && prev.length < 4) {
                            temp.push(prev + c + next);
                            continue;
                        }
                        if (c == '/' && prev.length < 4 && next.length > 6) {
                            let x = next.substring(0, next.length - prev.length) + prev;
                            temp2.push(x);
                            temp2.push(next);
                            continue;
                        }
                        if ((c == '-' || c == ' ') && next.length < 7 && prev.length < 9) {
                            temp.push(next + c + prev);
                            continue;
                        }


                    }
                }

                temp2.push(prev);
                temp2.push(next);
                continue;
            }
            else
                continue;
        }

        temp2.push(c);
    }
    temp2.reverse();
    let current = { phone: '', comment: '' };
    for (const item of temp2) {
        if (item.trim().length == 0)
            continue;
        if (onlyDigits(item)) {
            if (current.phone) {
                if (current.phone.length < 5) {
                    current.phone += item;
                }
                else {
                    result.push(current);
                    current = { phone: item, comment: '' };
                }
            }
            else current.phone = item;
        }
        else {
            if (current.comment) {
                result.push(current);
                current = { phone: '', comment: item };
            } else
                current.comment = item;
        }
    }
    if (current.phone)
        result.push(current);
    else if (current.comment && result.length > 0) {
        result[0].comment += ' ' + current.comment;

    }
    if (result.length == 0 || result[0].phone.length < 7)
        return [{ phone: input, comment: '' }];

    return result;
}
export function parseAndUpdatePhone(input: string, f: Families, defaultPrefix: string) {
    let r = processPhone(input);
    let i = 1;
    for (const p of r) {
        while (i <= 4 && f.$['phone' + i].value && f.$['phone' + i].value.thePhone)
            i++;
        if (i == 4)
            return;
        f.$['phone' + i].value = new Phone(fixPhone(p.phone, defaultPrefix));
        let col = f.$['phone' + i + 'Description'];
        if (p.comment) {
            if (col.value)
                col.value += ", ";
            else col.value = '';
            col.value += p.comment;
        }

    }
}
function onlyDigits(input: string) {
    for (let index = 0; index < input.length; index++) {
        const element = input[index];
        if (element != ' ' && !isDigit(element))
            return false;
    }
    return true;
}
function isDigit(c: string) {
    switch (c) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case '-':
        case '+':
            return true;
    }
    return false;
}
export interface phoneResult {
    phone: string,
    comment: string
}


interface columnInCompare {

    e: EntityMetadata,
    c: FieldMetadata

}
function keyFromColumnInCompare(c: columnInCompare) {
    return c.e.key + '.' + c.c.key;
}
function columnFromKey(f: Families, fd: ActiveFamilyDeliveries, key: string): FieldRef<any> {
    let split = key.split('.');
    if (split[0] == f._.repository.metadata.key)
        return f.$[split[1]];
    else
        return fd.$[split[1]];
}