import { Entity, Context, EntityBase, Repository, EntityField, DateOnlyValueConverter } from '@remult/core';
import { BusyService, GridSettings } from '@remult/angular';

import { DateTimeColumn } from "../model-shared/types";

import { foreachSync } from "./utils";
import { use } from '../translate';
import { ApplicationSettings } from '../manage/ApplicationSettings';

export async function saveToExcel<E extends EntityBase, T extends GridSettings<E>>(settings: ApplicationSettings,
  context: Repository<E>,
  grid: T,
  fileName: string,
  busy: BusyService,
  hideColumn?: (e: E, c: EntityField<any>) => boolean,
  excludeColumn?: (e: E, c: EntityField<any>) => boolean,
  moreColumns?: (e: E, addColumn: (caption: string, v: string, t: import('xlsx').ExcelDataType) => void) => void) {
  await busy.doWhileShowingBusy(async () => {
    let XLSX = await import('xlsx');
    if (!hideColumn)
      hideColumn = () => false;
    if (!excludeColumn)
      excludeColumn = () => false;

    let wb = XLSX.utils.book_new();

    wb.Workbook = { Views: [{ RTL: use.language.languageCode == 'iw' }] };
    let ws = {

    } as import('xlsx').WorkSheet;
    ws["!cols"] = [];


    let maxChar = 'A';
    let titleRow = 1;
    if (settings.requireConfidentialityApprove) {
      titleRow = 2;
      ws["C1"] = {
        v: settings.lang.infoIsConfidential
      };
      ws["!merges"] = [{ s: { c: 2, r: 0 }, e: { c: 15, r: 0 } }]
      maxChar = "C";
      ws['!rows'] = [{ hpt: 50 }]

    }
    let rowNum = titleRow + 1;


    let rows = context.iterate(grid.getFilterWithSelectedRows());

    if (true)

      for await (const f of rows) {
        let colPrefix = '';
        let colName = 'A';
        let colIndex = 0;

        let addColumn = (caption: string, v: string, t: import('xlsx').ExcelDataType, hidden?: boolean) => {

          if (rowNum == titleRow + 1) {
            ws[colPrefix + colName + titleRow] = { v: caption };
            ws["!cols"].push({
              wch: caption.length,
              hidden: hidden
            });
          }

          ws[colPrefix + colName + (rowNum.toString())] = {
            v: v, t: t
          };
          maxChar = colPrefix + colName;
          {
            let i = colName.charCodeAt(0);
            i++;
            colName = String.fromCharCode(i);
            if (colName > 'Z') {
              colName = 'A';
              if (colPrefix == 'A')
                colPrefix = 'B';
              else if (colPrefix == 'B')
                colPrefix = 'C';
              else
                colPrefix = 'A';
            }
          }
          let col = ws["!cols"][colIndex++];
          if (v) {
            let len = v.length;
            if (len > col.wch) {
              col.wch = len;
            }
          }
        };
        for (const c of f.$) {
          try {
            if (!excludeColumn(<E>f, c)) {
              let v = c.displayValue;
              if (v == undefined)
                v = '';

              await c.value.load();


              if (c.defs.dataType == Date) {
                addColumn('תאריך ' + c.defs.caption, c.value ? DateOnlyValueConverter.toJson(c.value) : undefined, "d", false);
                addColumn('שעת ' + c.defs.caption, c.value ? c.value.getHours().toString() : undefined, "n", false);
                addColumn('מלא ' + c.defs.caption, c.displayValue, "s", true);
              }
              else
                addColumn(c.defs.caption, v.toString(), "s", hideColumn(<E>f, c))

            }
          } catch (err) {

            console.error(err, c.defs.key, f._.toApiPojo());
          }
        }

        if (moreColumns)
          await moreColumns(<E>f, addColumn);
        rowNum++;

      }




    ws["!ref"] = "A1:" + maxChar + rowNum;
    ws["!autofilter"] = { ref: "A" + titleRow + ":" + maxChar + rowNum };


    XLSX.utils.book_append_sheet(wb, ws, 'test');
    XLSX.writeFile(wb, fileName + '.xlsx');
  });
}
export async function jsonToXlsx(busy: BusyService, rows: any[], fileName: string) {
  await busy.doWhileShowingBusy(async () => {
    let XLSX = await import('xlsx');


    let wb = XLSX.utils.book_new();

    wb.Workbook = { Views: [{ RTL: use.language.languageCode == 'iw' }] };
    let ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
    XLSX.writeFile(wb, fileName + '.xlsx');
  });
}