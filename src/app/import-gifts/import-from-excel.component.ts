import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, Context, SelectValueDialogComponent } from '@remult/core';
import * as xlsx from 'xlsx';

@Component({
  selector: 'app-import-from-excel',
  templateUrl: './import-from-excel.component.html'
})
export class GeneralImportFromExcelComponent implements OnInit {

  constructor(private context: Context, private busy: BusyService, private dialog: MatDialogRef<any>) { }

  ngOnInit() {

  }
  args: {
    excelFileLoaded?: (result: any[][], sheetName: string,fileName:string) => void;
    title: string;
    readOtherFile?: (result: any) => void;
  };
  async fileChange(eventArgs: any) {

    var files = eventArgs.target.files, file;
    if (!files || files.length == 0) return;
    file = files[0];
    var fileReader = new FileReader();
    if (this.args.readOtherFile) {
      fileReader.onload = (e:any) => {
        this.args.readOtherFile(e.target.result);
        this.dialog.close();
      };
      fileReader.readAsText(file);
    }
    else {
      fileReader.onload = async (e: any) => {
        let sheets: string[];
        let getJsonArray: (sheet: string) => any[][];
        await this.busy.doWhileShowingBusy(async () => {

          // pre-process data
          var binary = "";
          var bytes = new Uint8Array(e.target.result);
          var length = bytes.byteLength;
          for (var i = 0; i < length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          // call 'xlsx' to read the file
          var oFile = (await import('xlsx')).read(binary, { type: 'binary', cellDates: true, cellStyles: true });
          sheets = oFile.SheetNames;
          getJsonArray = (sheet: string) =>  xlsx.utils.sheet_to_json(oFile.Sheets[sheet],{header:1})


        });
        let sheet = sheets[0];
        if (sheets.length > 1) {
          await this.context.openDialog(SelectValueDialogComponent, x => x.args({
            title: 'בחר גליון',
            values: sheets.map(x => ({ caption: x })),
            onSelect: x => sheet = x.caption
          }));
        }
        this.args.excelFileLoaded(getJsonArray(sheet), sheet,file.name);
        this.dialog.close();
      };
      fileReader.readAsArrayBuffer(file);
    }
  }

}
