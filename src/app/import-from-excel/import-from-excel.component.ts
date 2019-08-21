import { Component, OnInit } from '@angular/core';
import { GridSettings, Column, Entity } from 'radweb';
import { Context } from '../shared/context';
import { Helpers } from '../helpers/helpers';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { myThrottle, HasAsyncGetTheValue } from '../model-shared/types';
import * as XLSX from 'xlsx';
import { Families, parseAddress } from '../families/families';
import { async } from 'q';
import { BasketType } from '../families/BasketType';
import { FamilySources } from '../families/FamilySources';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DialogService } from '../select-popup/dialog';
import { BusyService } from '../select-popup/busy-service';
import { SelectService } from '../select-popup/select-service';
@Component({
    selector: 'app-stam-test',
    templateUrl: './import-from-excel.component.html',
    styleUrls: ['./import-from-excel.component.scss']
})
export class ImportFromExcelComponent implements OnInit {



    constructor(private context: Context, private dialog: DialogService, private busy: BusyService, private select: SelectService) { }
    cell: string;

    oFile: XLSX.WorkBook;
    worksheet: XLSX.WorkSheet;

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
    totalRows: number;
    filename: string;
    commentExcelColumn: string;
    fileChange(eventArgs: any) {

        var files = eventArgs.target.files, file;
        if (!files || files.length == 0) return;
        file = files[0];
        var fileReader = new FileReader();
        fileReader.onload = (e: any) => {
            this.filename = file.name;
            // pre-process data
            var binary = "";
            var bytes = new Uint8Array(e.target.result);
            var length = bytes.byteLength;
            for (var i = 0; i < length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            // call 'xlsx' to read the file
            this.oFile = XLSX.read(binary, { type: 'binary', cellDates: true, cellStyles: true });
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
                    colPrefix = 'A';
                }
                if (done) {
                    this.commentExcelColumn = colName;
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
                    case "שם פרטי":
                    case "משפחה":
                    case "שם משפחה":
                        searchName = this.f.name.caption;
                        break;
                    case "ת.ז.":
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
        let f = await this.readLine(row, false, true);


    }
    async readLine(row: number, actualImport = false, preview = false) {
        let f = this.context.for(Families).create();
        f._disableAutoDuplicateCheck = true;
        let importNotes = '';

        function addNote(c: string, what: string) {
            if (importNotes)
                importNotes += ', ';
            importNotes += c + ': ' + what;

        }

        for (const c of this.excelColumns) {
            if (c.column) {
                let val = this.getTheData(c.excelColumn + row);
                if (val && val.length > 0)
                    await c.column.updateFamily(val, f, async x => {
                        addNote(c.column.name, 'חדש');
                        if (actualImport)
                            await x.save();
                    });
            }
        }
        for (const v of this.additionalColumns) {
            await v.column.updateFamily(v.value, f, async x => {
                addNote(v.column.name, 'חדש');
                if (actualImport)
                    await x.save();
            });
        }
        let rel = {};
        for (const c of f.__iterateColumns()) {
            if (c.value) {
                let v = c.displayValue;
                let getv: HasAsyncGetTheValue = <any>c as HasAsyncGetTheValue;
                if (getv && getv.getTheValue) {
                    v = await getv.getTheValue();
                }

                rel[c.caption] = v;

            }
        }
        await f.checkDuplicateFamilies();
        if (!f.name.value) {
            f.name.error = 'ערך חסר';
        }
        var error = false;
        for (const c of f.__iterateColumns()) {
            if (c.error) {
                addNote(c.caption, c.error);
                error = true;
            }
        }
        if (error) {
            importNotes = 'שורה לא תקלט! - ' + importNotes;
            f.error = importNotes;
        }
        if (importNotes) {
            rel["הערות קליטה"] = importNotes;
            this.worksheet[this.commentExcelColumn + row] = {
                w: importNotes,
                t: 's',
                v: importNotes
            };
        }
        console.table(rel);
        this.select.updateFamiliy({ f: f, disableSave: true, message: importNotes });
        return f;

    }


    f: Families;
    ngOnInit() {

        let updateCol = (col: Column<any>, val: string) => {

            if (col.value) {
                col.value = (col.value + ' ' + val).trim();
            } else
                col.value = val;
        }
        this.f = this.context.for(Families).create();
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
                    updateCol(f.addressComment, 'כניסה ' + r.knisa);
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
                    await saveNewDependentValue(x);
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
                    await saveNewDependentValue(x);
                }
                f.basketType.value = x.id.value;
            }
        });
        this.columns.push({
            key: 'familySource',
            name: 'מקור משפחה',
            updateFamily: async (v, f, saveNewDependentValue) => {
                let x = await this.context.for(FamilySources).lookupAsync(b => b.name.isEqualTo(v));
                if (x.isNew()) {
                    x.name.value = v;
                    await saveNewDependentValue(x);
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
                    await saveNewDependentValue(x);
                }
                f.fixedCourier.value = x.id.value;
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
        this.f.phone1Description,
        this.f.phone2,
        this.f.phone2Description,
        this.f.internalComment,
        this.f.deliveryComments,
        this.f.addressComment,
        this.f.familyMembers,
        this.f.iDinExcel,
        this.f.tz,
        this.f.floor,
        this.f.appartment,
        this.f.familyMembers,
        this.f.groups


        ]);
        this.columns.push({
            key: 'knisa',
            name: 'כניסה',
            updateFamily: async (v, f) => {
                if (v) {
                    updateCol(f.addressComment, 'כניסה ' + v);
                }
            }
        });
        this.columns.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0);

    }
    async doImport() {
        this.dialog.YesNoQuestion("האם אתה בטוח שאתה מעוניין לקלוט " + (this.totalRows - 1) + " משפחות מאקסל?", async () => {
            await this.iterateExcelFile(true);
        });
    }
    async iterateExcelFile(actualImport = false) {
        let i = 0;
        await this.busy.doWhileShowingBusy(async () => {
            for (let index = 2; index <= this.totalRows; index++) {
                let f = await this.readLine(index);
                if (!f.error) {
                    i++;
                    if (actualImport) {
                        //   await f.save();

                    }
                }
                this.dialog.Info((index - 1) + ' ' + f.name.value + ' ' + (f.error ? f.error : ''));

            }
            XLSX.writeFile(this.oFile, "דוח " + (actualImport ? "" : "סימולצית ") + "קליטה - " + this.filename);
        });
        this.dialog.YesNoQuestion('יקלטו ' + i + ' משפחות מתוך ' + (this.totalRows - 1) + ' שורות');
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
                    if (loadedItem.excelColumn == excelItem.excelColumn)
                        for (const col of this.columns) {
                            if (col.key == loadedItem.columnKey) {
                                excelItem.column = col;
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
    testImport() {
        this.iterateExcelFile(false);
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
    updateFamily: (val: string, f: Families, saveNewDependentValue: ((e: Entity<any>) => Promise<void>)) => Promise<void>;
}