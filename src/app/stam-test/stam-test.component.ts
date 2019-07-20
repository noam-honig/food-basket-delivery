import { Component, OnInit } from '@angular/core';
import { GridSettings, Column } from 'radweb';
import { Context } from '../shared/context';
import { Helpers } from '../helpers/helpers';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { myThrottle } from '../model-shared/types';
import * as XLSX from 'xlsx';
import { Families } from '../families/families';
@Component({
  selector: 'app-stam-test',
  templateUrl: './stam-test.component.html',
  styleUrls: ['./stam-test.component.scss']
})
export class StamTestComponent implements OnInit {


  
  constructor(private context: Context) { }
  cell: string;
  column:string;
  oFile: XLSX.WorkBook;
  worksheet: XLSX.WorkSheet;

  excelColumns: excelColumn[] = [];
  columns: Column<any>[] = [];
  rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  getData() {
    return this.getTheData(this.cell);
  }
  getTheData(cell: string) {
    let val = this.worksheet[cell];
    if (!val)
      return '';
    return val.w;
  }
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
      let rows = 0
      let maxLetter = 'A';
      for (let index = 0; index < to.length; index++) {
        const element = to[index];
        if ('1234567890'.indexOf(element) >= 0) {
          maxLetter = to.substring(0, index );
          rows = +to.substring(index, 20);
          break;
        }

      }

      if (!rows) {
        debugger;
      }
      let colPrefix = '';
      let colName = 'A';
      let colIndex = 0;
      while (true) {

        if (colPrefix + colName == maxLetter)
          break;
        this.excelColumns.push({
          excelColumn: colPrefix + colName,
          title: this.getTheData(colPrefix + colName + 1)
        });
        let j = colName.charCodeAt(0);
        j++;
        colName = String.fromCharCode(j);
        if (colName > 'Z') {
          colName = 'A';
          colPrefix = 'A';
        }
      }
      console.log(this.excelColumns);

    };
    fileReader.readAsArrayBuffer(file);
  }
  f: Families;
  ngOnInit() {
    this.f = this.context.for(Families).create();
    this.columns = [
      this.f.name,
      this.f.address,
      this.f.id,
    ];
  }

}
interface importStructure {
  excelColumn: string;
  column: string;
}

interface excelColumn {
  excelColumn: string;
  title: string;
}