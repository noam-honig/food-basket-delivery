import { Component, OnInit } from "@angular/core";
import { Remult } from "remult";
import { GridSettings } from "@remult/angular/interfaces";
import { GeneralImportFromExcelComponent } from "../import-gifts/import-from-excel.component";
import { HelperGifts } from "./HelperGifts";
import { openDialog } from "@remult/angular";
@Component({
  selector: "app-helper-gifts",
  templateUrl: "./helper-gifts.component.html",
  styleUrls: ["./helper-gifts.component.scss"]
})
export class HelperGiftsComponent implements OnInit {
  constructor(private remult: Remult) { }
  gifts = new GridSettings(this.remult.repo(HelperGifts), {
    allowUpdate: true,
    allowInsert: true,
    numOfColumnsInGrid: 7,

    orderBy: { dateGranted: "asc" },
    rowsInPage: 100
    ,
    gridButtons: [
      {
        name: "יבוא מאקסל",
        click: () => {
          openDialog(
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
