import { Component, OnInit } from '@angular/core';
import { GridSettings, Column, Entity, RunOnServer, DirectSQL } from 'radweb';
import { Context } from 'radweb';
import { Helpers } from '../helpers/helpers';
import { myThrottle, HasAsyncGetTheValue } from '../model-shared/types';

import { Families, parseAddress, duplicateFamilyInfo } from '../families/families';

import { BasketType } from '../families/BasketType';
import { FamilySources } from '../families/FamilySources';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DialogService } from '../select-popup/dialog';
import { BusyService } from 'radweb';
import { SelectService } from '../select-popup/select-service';
import { isUndefined } from 'util';
import { Roles } from '../auth/roles';
@Component({
    selector: 'app-stam-test',
    templateUrl: './import-from-excel.component.html',
    styleUrls: ['./import-from-excel.component.scss']
})
export class ImportFromExcelComponent implements OnInit {



    constructor(private context: Context, private dialog: DialogService, private busy: BusyService, private select: SelectService) {

    }

    cell: string;

    oFile: import('xlsx').WorkBook;
    worksheet: import('xlsx').WorkSheet;

    excelColumns: excelColumn[] = [];
    additionalColumns: additionalColumns[] = [];
    columns: columnUpdater[] = [];
    page = 0;
    rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    getViewRow(r: number) {
        return this.page * 10 + r;
    }
    getData() {
        return this.getTheData(this.cell);
    }
    getTheData(cell: string) {
        let val = this.worksheet[cell];
        if (!val)
            return '';
        return val.w.trim();
    }
    columnsInCompare: Column<any>[] = [];
    updatedColumns = new Map<string, boolean>();
    totalRows: number;
    filename: string;
    commentExcelColumn: string;
    rowInfo(row: number) {
        let r = this.getViewRow(row);
        return this.excelRowInfo.find(x => x.rowInExcel == r);
    }
    getColInfo(i: excelRowInfo, col: Column<any>) {
        return ImportFromExcelComponent.actualGetColInfo(i, col.__getMemberName());
    }
    static actualGetColInfo(i: excelRowInfo, colMemberName: string) {
        let r = i.values.find(x => x.key == colMemberName);
        if (!r) {
            r = {

                key: colMemberName,
                newDisplayValue: '',
                existingDisplayValue: '',
                newValue: ''
            };
            //  i.values.push(r);
        }
        return r;
    }
    async updateAllCol(col: Column<any>) {
        let count = this.getColUpdateCount(col);
        this.dialog.YesNoQuestion("האם לעדכן את השדה " + col.caption + " ל" + count + " משפחות?", () => {
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

                    if (rowsToUpdate.length == 50) {
                        allRows.push(...await ImportFromExcelComponent.updateColsOnServer(rowsToUpdate, col.__getMemberName()));
                        if (new Date().valueOf() - lastDate > 1000) {
                            this.dialog.Info(i.rowInExcel + ' ' + (i.name));
                        }
                        rowsToUpdate = [];
                    }



                }
                if (rowsToUpdate.length > 0) {
                    allRows.push(...await ImportFromExcelComponent.updateColsOnServer(rowsToUpdate, col.__getMemberName()));
                }
                allRows.sort((a, b) => a.rowInExcel - b.rowInExcel);
                this.updateRows = allRows;
            });
        });
    }
    @RunOnServer({ allowed: Roles.admin })
    static async updateColsOnServer(rowsToUpdate: excelRowInfo[], columnMemberName: string, context?: Context) {
        for (const r of rowsToUpdate) {
            await ImportFromExcelComponent.actualUpdateCol(r, columnMemberName, context);
        }
        return rowsToUpdate;
    }
    async updateCol(i: excelRowInfo, col: Column<any>) {
        await ImportFromExcelComponent.actualUpdateCol(i, col.__getMemberName(), this.context);
    }
    static async actualUpdateCol(i: excelRowInfo, colMemberName: string, context: Context) {
        let c = ImportFromExcelComponent.actualGetColInfo(i, colMemberName);
        if (c.existingDisplayValue == c.newDisplayValue)
            return;
        let f = await context.for(Families).findFirst(f => f.id.isEqualTo(i.duplicateFamilyInfo[0].id));
        let val = c.newValue;
        if (val === null)
            val = '';
        f.__getColumnByJsonName(colMemberName).value = val;
        await f.save();
        c.existingDisplayValue = await getColumnDisplayValue(f.__getColumnByJsonName(colMemberName));
        c.existingValue = f.__getColumnByJsonName(colMemberName).value;
    }
    async clearColumnUpdate(i: excelRowInfo, col: Column<any>) {
        let c = this.getColInfo(i, col);
        c.newDisplayValue = c.existingDisplayValue;
        c.newValue = c.existingValue;
    }

    getColUpdateCount(col: Column<any>) {
        let i = 0;
        let key = col.__getMemberName();
        for (const r of this.updateRows) {
            let c = r.values.find(x => x.key == key);
            if (c && c.newDisplayValue != c.existingDisplayValue)
                i++;
        }
        return i;
    }
    excelRowInfo: excelRowInfo[] = [];
    async fileChange(eventArgs: any) {

        var files = eventArgs.target.files, file;
        if (!files || files.length == 0) return;
        file = files[0];
        var fileReader = new FileReader();
        fileReader.onload = async (e: any) => {
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
            this.worksheet = this.oFile.Sheets[this.oFile.SheetNames[0]];
            let sRef = this.worksheet["!ref"];
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
            let colPrefix = '';
            let colName = 'A';
            let colIndex = 0;
            this.excelColumns = [];
            while (true) {
                this.excelColumns.push({
                    excelColumn: colPrefix + colName,
                    column: undefined,
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
                    this.commentExcelColumn = colPrefix + colName;
                    this.excelRowInfo = [];
                    this.worksheet[this.commentExcelColumn + "1"] = {
                        w: 'הערות קליטה',
                        t: 's',
                        v: 'הערות קליטה'
                    };
                    this.worksheet["!ref"] = sRef.replace(maxLetter, this.commentExcelColumn);
                    break;
                }
            }
            for (const col of this.excelColumns) {

                let searchName = col.title;
                switch (searchName) {
                    case "טלפון":
                        searchName = this.f.phone1.caption;
                        break;
                    case "הערות":
                        searchName = this.f.internalComment.caption;
                        break;
                    case "נפשות":
                        searchName = this.f.familyMembers.caption;
                        break;
                    case "רחוב":
                    case "בית":
                    case "עיר":
                    case "ישוב":
                        searchName = this.f.address.caption;
                        break;
                    case "מס נפשות":
                        searchName = this.f.familyMembers.caption;
                        break;
                    case 'טלפון נייד':
                        searchName = this.f.phone2.caption;
                        break;

                    case "שם פרטי":
                    case "משפחה":
                    case "שם משפחה":
                    case "איש קשר":
                        searchName = this.f.name.caption;
                        break;
                    case "ת.ז.":
                    case 'ת"ז':
                        searchName = this.f.tz.caption;
                        break;
                }

                for (const up of this.columns) {
                    if (searchName == up.name) {
                        col.column = up;
                        break;
                    }
                }

            }
        };
        fileReader.readAsArrayBuffer(file);
    }
    async test(row: number) {
        let x = this.excelRowInfo.findIndex(x => x.rowInExcel == row);
        if (x >= 0) {
            this.excelRowInfo.splice(x, 1);
        }
        let f = await this.readLine(row, false, true);


    }
    async readLine(row: number, actualImport = false, preview = false): Promise<excelRowInfo> {
        let f = this.context.for(Families).create();
        f._disableAutoDuplicateCheck = true;
        let info: excelRowInfo = {
            comment: '',
            tz: undefined,
            phone1: undefined,
            phone2: undefined,
            valid: true,
            rowInExcel: row,
            name: undefined,
            values: []
        };
        this.excelRowInfo.push(info);

        function addNote(c: Column<any>, what: string) {
            if (info.comment)
                info.comment += '\r\n';
            info.comment += c + ': ' + what;

        }
        let newVals = new Map<string, any>();
        for (const c of this.excelColumns) {
            if (c.column) {
                let val = this.getTheData(c.excelColumn + row);
                if (val && val.length > 0)
                    await c.column.updateFamily(val, f, async (col, val, x) => {
                        newVals.set(col.__getMemberName(), val);
                        if (actualImport)
                            await x.save();
                    });
            }
        }
        for (const v of this.additionalColumns) {
            await v.column.updateFamily(v.value, f, async (col, val, x) => {
                newVals.set(col.__getMemberName(), val);
                if (actualImport)
                    await x.save();
            });
        }
        if (f.phone1.displayValue == f.phone2.displayValue)
            f.phone2.value = '';

        if (!f.name.value) {

            info.error = 'שורה ללא שם';
        }
        else {
            info.name = f.name.value;
            info.tz = f.tz.value;
            info.phone1 = f.phone1.value;
            info.phone2 = f.phone2.value;


            for (const col of f.__iterateColumns()) {
                if (col.value != undefined) {
                    let newVal = await getColumnDisplayValue(col);
                    let val: updateColumns = {
                        key: col.__getMemberName(),

                        newValue: col.value,
                        newDisplayValue: newVal
                    };
                    let x = newVals.get(col.__getMemberName());
                    if (x) {
                        val.newDisplayValue = x;
                        val.comment = 'ערך חדש';
                    }

                    this.updatedColumns.set(col.__getMemberName(), true);
                    info.values.push(val);

                }
            }

        }


        for (const c of f.__iterateColumns()) {
            if (c.error) {
                addNote(c, c.error);
                info.valid = false;
            }
        }
        if (!info.valid) {
            info.comment = 'שורה לא תקלט!\r\n - ' + info.comment;
            f.error = info.comment;
        }
        if (info.comment) {

            this.worksheet[this.commentExcelColumn + row] = {
                w: info.comment,
                t: 's',
                v: info.comment
            };
        }



        if (preview)
            this.select.updateFamiliy({ f: f, disableSave: true, message: info.comment });

        return info;

    }


    f: Families;

    ngOnInit() {
        let stam = localStorage.getItem('myTest');


        if (stam) {
            //    this.excelRowInfo = JSON.parse(stam);
        }


        let updateCol = (col: Column<any>, val: string, seperator: string = ' ') => {

            if (col.value) {
                col.value = (col.value + seperator + val).trim();
            } else
                col.value = val;
        }
        this.f = this.context.for(Families).create();
        try {
            this.errorRows = JSON.parse(localStorage.getItem("errorRows"));
            this.newRows = JSON.parse(localStorage.getItem("newRows"));
            this.updateRows = JSON.parse(localStorage.getItem("updateRows"));
            this.identicalRows = JSON.parse(localStorage.getItem("identicalRows"));
            this.columnsInCompare = JSON.parse(localStorage.getItem("columnsInCompare")).map(x => this.f.__getColumnByJsonName(x));
        }
        catch (err) {
            console.log(err);
        }


        let addColumns = (cols: Column<any>[]) => {
            for (const col of cols) {
                this.columns.push({
                    key: col.__getMemberName(),
                    name: col.caption,
                    updateFamily: async (v, f) => {
                        updateCol(f.__getColumn(col), v);
                    }
                });
            }
        };
        addColumns([
            this.f.name,
            this.f.postalCode
        ]);
        this.columns.push({
            key: 'address',
            name: 'כתובת',
            updateFamily: async (v, f) => {
                let r = parseAddress(v);
                if (r.address)
                    updateCol(f.address, r.address);
                if (r.dira)
                    updateCol(f.appartment, r.dira);
                if (r.floor)
                    updateCol(f.floor, r.floor);
                if (r.knisa)
                    updateCol(f.entrance, r.knisa);
            }
        });
        this.columns.push({
            key: 'city',
            name: 'עיר',
            updateFamily: async (v, f) => {
                updateCol(f.address, v);
            }
        });
        this.columns.push({
            key: 'boxes',
            name: 'מספר ארגזים',
            updateFamily: async (v, f, saveNewDependentValue) => {
                let x = await this.context.for(BasketType).lookupAsync(b => b.boxes.isEqualTo(+v));
                if (x.isNew()) {
                    x.boxes.value = +v;
                    x.name.value = v + ' ארגזים';
                    await saveNewDependentValue(f.basketType, x.name.value, x);
                }
                f.basketType.value = x.id.value;
            }
        });
        this.columns.push({
            key: 'basketType',
            name: 'סוג סל',
            updateFamily: async (v, f, saveNewDependentValue) => {
                let x = await this.context.for(BasketType).lookupAsync(b => b.name.isEqualTo(v));
                if (x.isNew()) {
                    x.boxes.value = 1;
                    x.name.value = v;
                    await saveNewDependentValue(f.basketType, v, x);
                }
                f.basketType.value = x.id.value;
            }
        });
        this.columns.push({
            key: 'familySource',
            name: this.f.familySource.caption,
            updateFamily: async (v, f, saveNewDependentValue) => {
                let x = await this.context.for(FamilySources).lookupAsync(b => b.name.isEqualTo(v));
                if (x.isNew()) {
                    x.name.value = v;
                    await saveNewDependentValue(f.familySource, v, x);
                }
                f.familySource.value = x.id.value;
            }
        });
        this.columns.push({
            key: 'selfPickup',
            name: 'באים לקחת',
            updateFamily: async (v, f) => {
                if (v == "כן") {
                    f.defaultSelfPickup.value = true;
                    if (f.deliverStatus.value == DeliveryStatus.ReadyForDelivery)
                        f.deliverStatus.value = DeliveryStatus.SelfPickup;
                }
            }
        });
        this.columns.push({
            key: 'fixedCourier',
            name: this.f.fixedCourier.caption,
            updateFamily: async (v, f, saveNewDependentValue) => {
                let x = await this.context.for(Helpers).lookupAsync(b => b.name.isEqualTo(v));
                if (x.isNew()) {
                    x.name.value = v;
                    await saveNewDependentValue(f.fixedCourier, v, x);
                }
                f.fixedCourier.value = x.id.value;
            }
        });
        this.columns.push({
            key: 'courier',
            name: this.f.courier.caption,
            updateFamily: async (v, f, saveNewDependentValue) => {
                let x = await this.context.for(Helpers).lookupAsync(b => b.name.isEqualTo(v));
                if (x.isNew()) {
                    x.name.value = v;
                    await saveNewDependentValue(f.courier, v, x);
                }
                f.courier.value = x.id.value;
            }
        });
        this.columns.push({
            key: 'deliverStatus',
            name: this.f.deliverStatus.caption,
            updateFamily: async (v, f, saveNewDependentValue) => {
                switch (v) {
                    case DeliveryStatus.NotInEvent.toString():
                        f.deliverStatus.value = DeliveryStatus.NotInEvent;
                        break;
                    case DeliveryStatus.ReadyForDelivery.toString():
                        f.deliverStatus.value = DeliveryStatus.ReadyForDelivery;
                        if (f.defaultSelfPickup.value)
                            f.deliverStatus.value = DeliveryStatus.SelfPickup;
                        break;
                    case DeliveryStatus.SelfPickup.toString():
                        f.deliverStatus.value = DeliveryStatus.SelfPickup;
                        break;
                    default:
                        f.deliverStatus.error = 'ערך לא ברור';
                        break;

                }
            }
        });
        addColumns([this.f.phone1,
        this.f.phone2,
        this.f.familyMembers,
        this.f.iDinExcel,
        this.f.tz,
        this.f.floor,
        this.f.appartment,
        this.f.entrance,
        ]);
        for (const col of [this.f.phone1Description,
        this.f.phone2Description,
        this.f.internalComment,
        this.f.deliveryComments,
        this.f.addressComment,


        this.f.groups]) {
            this.columns.push({
                key: col.__getMemberName(),
                name: col.caption,
                updateFamily: async (v, f) => {
                    updateCol(f.__getColumn(col), v, ', ');
                }
            });
        }

        this.columns.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0);

    }
    async doImport() {
        this.dialog.YesNoQuestion("האם אתה בטוח שאתה מעוניין לקלוט " + (this.totalRows - 1) + " משפחות מאקסל?", async () => {
            await this.iterateExcelFile(true);
        });
    }
    errorRows: excelRowInfo[] = [];
    newRows: excelRowInfo[] = [];
    identicalRows: excelRowInfo[] = [];
    updateRows: excelRowInfo[] = [];


    async iterateExcelFile(actualImport = false) {

        this.errorRows = [];
        this.newRows = [];
        this.updateRows = [];
        this.identicalRows = [];
        let rows: excelRowInfo[] = [];
        let usedTz = new Map<string, number>();
        let usedPhone = new Map<string, number>();
        await this.busy.doWhileShowingBusy(async () => {

            for (let index = 2; index <= this.totalRows; index++) {
                let f = await this.readLine(index);
                if (f.error) {
                    this.errorRows.push(f);
                }
                else {

                    let exists = (val: string, map: Map<string, number>, caption: string) => {
                        let origVal = val;
                        if (!val)
                            return false;
                        val = val.replace(/\D/g, '');
                        if (val.length == 0)
                            return false;
                        let x = map.get(val);
                        if (x > 0 && x < index) {
                            f.error = caption + ' - ' + origVal + ' - כבר קיים בקובץ בשורה ' + x;
                            return true;
                        }
                        map.set(val, index);
                        return false;
                    };


                    if (exists(f.tz, usedTz, 'תעודת זהות') || exists(f.phone1, usedPhone, 'טלפון 1') || exists(f.phone2, usedPhone, 'טלפון 2')) {
                        this.errorRows.push(f);
                    }
                    else
                        rows.push(f);
                }

                if (rows.length == 200) {
                    this.dialog.Info((index - 1) + ' ' + (f.name ? f.name : 'ללא שם') + ' ' + (f.error ? f.error : ''));
                    let r = await this.checkExcelInput(rows);
                    this.errorRows.push(...r.errorRows);
                    this.newRows.push(...r.newRows);
                    this.updateRows.push(...r.updateRows);
                    this.identicalRows.push(...r.identicalRows);
                    rows = [];
                }
            }
            if (rows.length > 0) {

                let r = await this.checkExcelInput(rows);
                this.errorRows.push(...r.errorRows);
                this.newRows.push(...r.newRows);
                this.updateRows.push(...r.updateRows);
                this.identicalRows.push(...r.identicalRows);
            }

            this.columnsInCompare = [];
            for (let c of this.f.__iterateColumns()) {
                if (this.updatedColumns.get(c.__getMemberName()))
                    this.columnsInCompare.push(c);
            }
            this.errorRows.sort((a, b) => a.rowInExcel - b.rowInExcel);
            localStorage.setItem("errorRows", JSON.stringify(this.errorRows));
            localStorage.setItem("newRows", JSON.stringify(this.newRows));
            localStorage.setItem("updateRows", JSON.stringify(this.updateRows));
            localStorage.setItem("identicalRows", JSON.stringify(this.identicalRows));

            localStorage.setItem("columnsInCompare", JSON.stringify(this.columnsInCompare.map(x => x.__getMemberName())));
        });


    }
    displayDupInfo(info: duplicateFamilyInfo) {
        let r = [];


        if (info.tz) {
            r.push(' מספר זהות זהה');
        }
        if (info.phone1 || info.phone2) {
            r.push(' מספר טלפון זהה');
        }
        if (info.nameDup) {
            r.push(" שם זהה");
        }
        return info.address + ": " + r.join(', ');
    }
    @RunOnServer({ allowed: Roles.admin })
    async checkExcelInput(excelRowInfo: excelRowInfo[], context?: Context, directSql?: DirectSQL) {
        let result: serverCheckResults = {
            errorRows: [],
            identicalRows: [],
            newRows: [],
            updateRows: []
        } as serverCheckResults;
        for (const info of excelRowInfo) {
            info.duplicateFamilyInfo = await Families.checkDuplicateFamilies(info.name, info.tz, info.phone1, info.phone2, undefined, true, context, directSql);

            if (!info.duplicateFamilyInfo || info.duplicateFamilyInfo.length == 0) {
                result.newRows.push(info);
            } else if (info.duplicateFamilyInfo.length > 1) {
                info.error = 'משפחה קיימת יותר מפעם אחת בבסיס נתונים';
                result.errorRows.push(info);
            } else {
                let ef = await context.for(Families).findFirst(f => f.id.isEqualTo(info.duplicateFamilyInfo[0].id));
                let hasDifference = false;
                for (const upd of info.values) {
                    let col = ef.__getColumnByJsonName(upd.key);
                    upd.existingValue = col.value;
                    upd.existingDisplayValue = await getColumnDisplayValue(col);
                    if (upd.existingDisplayValue != upd.newDisplayValue) {
                        hasDifference = true;
                        if (col == ef.groups) {
                            let existingString = ef.groups.value;
                            let newVal = upd.newValue;
                            if (!newVal || newVal.toString() == '') {
                                upd.newValue = upd.existingValue;
                                upd.newDisplayValue = upd.existingDisplayValue;
                            }
                            else if (existingString && existingString.trim().length > 0) {
                                let existingArray = existingString.toString().split(',').map(x => x.trim())
                                for (const val of newVal.split(',').map(x => x.trim())) {
                                    if (existingArray.indexOf(val) < 0)
                                        existingArray.push(val);
                                }
                                upd.newValue = existingArray.join(', ');
                                upd.newDisplayValue = upd.newValue;
                            }
                        }
                    }
                }
                if (hasDifference) {
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
                excelColumn: item.excelColumn,
                columnKey: item.column ? item.column.key : undefined
            });
        }
        for (const item of this.additionalColumns) {
            save.additionalColumns.push({
                value: item.value,
                columnKey: item.column ? item.column.key : undefined
            });
        }
        localStorage.setItem(excelSettingsSave, JSON.stringify(save));
    }
    loadSettings() {
        let loaded = JSON.parse(localStorage.getItem(excelSettingsSave)) as storedInfo;
        if (loaded) {
            for (const excelItem of this.excelColumns) {
                for (const loadedItem of loaded.storedColumns) {
                    if (loadedItem.excelColumn == excelItem.excelColumn) {
                        excelItem.column = undefined;
                        for (const col of this.columns) {
                            if (col.key == loadedItem.columnKey) {
                                excelItem.column = col;
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
                            column: col,
                            value: loadedItem.value
                        });
                    }
                }
            }

        }
    }
    async testImport() {
        this.excelRowInfo = [];
        await this.iterateExcelFile(false);

    }

}


const excelSettingsSave = 'excelSettingsSave';


interface excelColumn {
    excelColumn: string;
    column: columnUpdater;
    title: string;
}
interface additionalColumns {
    column?: columnUpdater,
    value?: string
}
interface storedInfo {
    storedColumns: storedColumnSettings[],
    additionalColumns: storedAdditionalColumnSettings[]
}
interface storedColumnSettings {
    excelColumn: string;
    columnKey: string;
}
interface storedAdditionalColumnSettings {
    columnKey: string;
    value: string;
}
interface columnUpdater {
    key: string;
    name: string;
    updateFamily: (val: string, f: Families, saveNewDependentValue: ((c: Column<any>, v: any, e: Entity<any>) => Promise<void>)) => Promise<void>;
}
interface excelRowInfo {
    rowInExcel: number;
    name: string;
    tz: string;
    phone1: string;
    phone2: string;
    valid: boolean;
    error?: string;
    comment?: string;
    duplicateFamilyInfo?: duplicateFamilyInfo[];
    values: updateColumns[];
}
interface updateColumns {
    key: string;
    existingValue?: any;
    existingDisplayValue?: string;
    comment?: string;
    newValue: any;
    newDisplayValue: any;
}
interface serverCheckResults {
    newRows: excelRowInfo[],
    identicalRows: excelRowInfo[],
    updateRows: excelRowInfo[],
    errorRows: excelRowInfo[]
}
async function getColumnDisplayValue(c: Column<any>) {
    let v = c.displayValue;
    let getv: HasAsyncGetTheValue = <any>c as HasAsyncGetTheValue;
    if (getv && getv.getTheValue) {
        v = await getv.getTheValue();
    }
    return v;
}
