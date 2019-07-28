import { Component, OnInit } from '@angular/core';
import { GridSettings, Column } from 'radweb';
import { Context } from '../shared/context';
import { Helpers } from '../helpers/helpers';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { myThrottle } from '../model-shared/types';
import * as XLSX from 'xlsx';
import { Families, parseAddress } from '../families/families';
import { async } from 'q';
import { BasketType } from '../families/BasketType';
@Component({
  selector: 'app-stam-test',
  templateUrl: './stam-test.component.html',
  styleUrls: ['./stam-test.component.scss']
})
export class StamTestComponent implements OnInit {



  constructor(private context: Context) { }
  cell: string;

  oFile: XLSX.WorkBook;
  worksheet: XLSX.WorkSheet;

  excelColumns: excelColumn[] = [];
  columns: columnUpdater[] = [];
  rows = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
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
  fileChange(eventArgs: any) {

    var files = eventArgs.target.files, file;
    if (!files || files.length == 0) return;
    file = files[0];
    var fileReader = new FileReader();
    fileReader.onload = (e: any) => {
      var filename = file.name;
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
        if (colPrefix + colName == maxLetter)
          break;
        let j = colName.charCodeAt(0);
        j++;
        colName = String.fromCharCode(j);
        if (colName > 'Z') {
          colName = 'A';
          colPrefix = 'A';
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
          case "שם פרטי":
          case "משפחה":
            searchName = this.f.name.caption;
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
    let f = await this.readFamily(row);
    let rel = {};
    for (const c of f.__iterateColumns()) {
      if (c.value) {
        rel[c.caption] = c.value;

      }
    }
    console.table(rel);
    return f;

  }
  async readFamily(row: number) {
    let f = this.context.for(Families).create();
    f._disableAutoDuplicateCheck = true;
    for (const c of this.excelColumns) {
      if (c.column) {
        await c.column.updateFamily(this.getTheData(c.excelColumn + row), f);
      }
    }
    return f;
  }

  f: Families;
  ngOnInit() {

    let updateCol = (col: Column<any>, val: string) => {

      if (col.value) {
        col.value += ' ' + val;
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
        updateCol(f.address, r.address);
        updateCol(f.appartment, r.dira);
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
      updateFamily: async (v, f) => {
        let x = await this.context.for(BasketType).lookupAsync(b => b.boxes.isEqualTo(+v));
        if (x.isNew()) {
          x.boxes.value = +v;
          x.name.value = v+' ארגזים';
          await x.save();
        }
        f.basketType.value = x.id.value;
      }
    });
    addColumns([this.f.phone1,
    this.f.phone1Description,
    this.f.phone2,
    this.f.phone2Description,
    this.f.internalComment,
    this.f.deliveryComments,
    this.f.familyMembers
    ]);
  }
  async doImport() {
    for (let index = 2; index <= this.totalRows; index++) {
      let f = await this.test(index);
      if (f.name.value)
        await f.save();

    }
  }

}


interface excelColumn {
  excelColumn: string;
  column: columnUpdater;
  title: string;
}
interface columnUpdater {
  key: string;
  name: string;
  updateFamily: (val: string, f: Families) => Promise<void>;
}