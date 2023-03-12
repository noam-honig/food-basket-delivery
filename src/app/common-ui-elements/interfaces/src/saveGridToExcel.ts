import {
  EntityBase,
  Repository,
  FieldRef,
  ValueConverters,
  getEntityRef
} from 'remult'
import { terms } from '../../../terms'
import type { BusyService } from '../../src/angular/wait/busy-service'
import { GridSettings } from './grid-settings'
export async function saveToExcel<
  E = any,
  T extends GridSettings<E> = GridSettings<any>
>(
  grid: T,
  fileName: string,
  busyService: BusyService,
  hideColumn?: (e: E, c: FieldRef<any>) => boolean,
  excludeColumn?: (e: E, c: FieldRef<any>) => boolean,
  moreColumns?: (
    e: E,
    addfield: (
      caption: string,
      v: string,
      t: import('xlsx').ExcelDataType
    ) => void
  ) => void,
  loadPage?: (items: E[]) => Promise<void>
) {
  await busyService.doWhileShowingBusy(async () => {
    let XLSX = await import('xlsx')
    if (!hideColumn) hideColumn = () => false
    if (!excludeColumn) excludeColumn = () => false

    let wb = XLSX.utils.book_new()

    wb.Workbook = { Views: [{ RTL: terms.RTL }] }
    let ws = {} as import('xlsx').WorkSheet
    ws['!cols'] = []

    let maxChar = 'A'
    let titleRow = 1
    let rowNum = titleRow + 1

    let rows = grid.repository.query(await grid.getFilterWithSelectedRows())
    let currentPage = await rows.paginator()
    while (currentPage != null) {
      if (loadPage) await loadPage(currentPage.items)
      for (const f of currentPage.items) {
        let colPrefix = ''
        let colName = 'A'
        let colIndex = 0

        let addColumn = (
          caption: string,
          v: string,
          t: import('xlsx').ExcelDataType,
          hidden?: boolean
        ) => {
          if (rowNum == titleRow + 1) {
            ws[colPrefix + colName + titleRow] = { v: caption }
            ws['!cols']!.push({
              wch: caption.length,
              hidden: hidden
            })
          }

          ws[colPrefix + colName + rowNum.toString()] = {
            v: v,
            t: t
          }
          maxChar = colPrefix + colName
          {
            let i = colName.charCodeAt(0)
            i++
            colName = String.fromCharCode(i)
            if (colName > 'Z') {
              colName = 'A'
              if (colPrefix == 'A') colPrefix = 'B'
              else if (colPrefix == 'B') colPrefix = 'C'
              else colPrefix = 'A'
            }
          }
          let col = ws['!cols']![colIndex++]
          if (v) {
            let len = v.length
            if (len > col.wch!) {
              col.wch = len
            }
          }
        }
        for (const c of getEntityRef(f).fields) {
          try {
            if (!excludeColumn(<E>f, c)) {
              let v = c.displayValue
              if (v == undefined) v = ''

              if (c.metadata.valueType == Date) {
                addColumn(
                  c.metadata.caption,
                  c.value
                    ? ValueConverters.DateOnly.toJson!(c.value)
                    : undefined,
                  'd',
                  false
                )
              } else
                addColumn(
                  c.metadata.caption,
                  v.toString(),
                  's',
                  hideColumn(<E>f, c)
                )
            }
          } catch (err) {
            console.error(err, c.metadata.key, getEntityRef(f).toApiJson())
          }
        }

        if (moreColumns) await moreColumns(<E>f, addColumn)
        rowNum++
      }
      if (currentPage.hasNextPage) {
        currentPage = await currentPage.nextPage()
      } else currentPage = undefined!
    }

    ws['!ref'] = 'A1:' + maxChar + rowNum
    ws['!autofilter'] = { ref: 'A' + titleRow + ':' + maxChar + rowNum }

    XLSX.utils.book_append_sheet(wb, ws, 'test')
    XLSX.writeFile(wb, fileName + '.xlsx')
  })
}
export async function jsonToXlsx(
  busy: BusyService,
  rows: any[],
  fileName: string
) {
  await busy.doWhileShowingBusy(async () => {
    let XLSX = await import('xlsx')

    let wb = XLSX.utils.book_new()

    wb.Workbook = { Views: [{ RTL: terms.RTL }] }
    let ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1')
    XLSX.writeFile(wb, fileName + '.xlsx')
  })
}
