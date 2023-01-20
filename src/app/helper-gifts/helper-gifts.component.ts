import { Component, OnInit } from "@angular/core";
import { remult } from "remult";
import { GridSettings } from "../common-ui-elements/interfaces";
import { GeneralImportFromExcelComponent } from "../import-gifts/import-from-excel.component";
import { HelperGifts } from "./HelperGifts";
import { openDialog } from "../common-ui-elements";
@Component({
  selector: "app-helper-gifts",
  templateUrl: "./helper-gifts.component.html",
  styleUrls: ["./helper-gifts.component.scss"]
})
export class HelperGiftsComponent implements OnInit {
  gifts = new GridSettings(remult.repo(HelperGifts), {
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
