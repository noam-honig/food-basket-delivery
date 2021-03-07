import { Component, OnInit } from "@angular/core";
import { Context } from "@remult/core";
import { GeneralImportFromExcelComponent } from "../import-gifts/import-from-excel.component";
import { HelperGifts } from "./HelperGifts";
@Component({
  selector: "app-helper-gifts",
  templateUrl: "./helper-gifts.component.html",
  styleUrls: ["./helper-gifts.component.scss"]
})
export class HelperGiftsComponent implements OnInit {
  constructor(private context: Context) { }
  gifts = this.context.for(HelperGifts).gridSettings({
    allowUpdate: true,
    allowInsert: true,
    numOfColumnsInGrid: 7,

    orderBy: hg => [{ column: hg.dateGranted, descending: false }],
    rowsInPage: 100
    ,
    gridButtons: [
      {
        name: "יבוא מאקסל",
        click: () => {
          this.context.openDialog(
            GeneralImportFromExcelComponent,
            x =>
            (x.args = {
              title: "יבוא מתנות מאקסל",
              excelFileLoaded: async data => {
                await HelperGifts.importUrls(data.map(d => d[0]));
                this.gifts.reloadData();
              }
            })
          );
        }
      }
    ]
  });

  ngOnInit() { }
}
