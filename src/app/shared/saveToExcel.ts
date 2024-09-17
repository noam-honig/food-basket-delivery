import { EntityBase, Repository, FieldRef, ValueConverters } from 'remult'
import { BusyService } from '../common-ui-elements'

import { use } from '../translate'
import { ApplicationSettings } from '../manage/ApplicationSettings'

import { HelpersBase } from '../helpers/helpers'
import { GridSettings } from '../common-ui-elements/interfaces'
import { UITools } from '../helpers/init-context'
export async function saveToExcel<
  E extends EntityBase,
  T extends GridSettings<E>
>(
  settings: ApplicationSettings,
  repo: Repository<E>,
  grid: T,
  fileName: string,
  ui: UITools,
  hideColumn?: (e: E, c: FieldRef<E, any>) => boolean,
  excludeColumn?: (e: E, c: FieldRef<E, any>) => boolean,
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
  await ui.doWhileShowingBusy(async () => {
    let XLSX = await import('xlsx')
    if (!hideColumn) hideColumn = () => false
    if (!excludeColumn) excludeColumn = () => false

    let wb = XLSX.utils.book_new()

    wb.Workbook = { Views: [{ RTL: use.language.languageCode == 'iw' }] }
    let ws = {} as import('xlsx').WorkSheet
    ws['!cols'] = []

    let maxChar = 'A'
    let titleRow = 1
    if (settings.requireConfidentialityApprove) {
      titleRow = 2
      ws['C1'] = {
        v: settings.lang.infoIsConfidential
      }
      ws['!merges'] = [{ s: { c: 2, r: 0 }, e: { c: 15, r: 0 } }]
      maxChar = 'C'
      ws['!rows'] = [{ hpt: 50 }]
    }
    let rowNum = titleRow + 1

    let rows = repo.query(await grid.getFilterWithSelectedRows())
    let currentPage = await rows.paginator()
    while (currentPage != null) {
      if (loadPage) await loadPage(currentPage.items)
      for (const f of currentPage.items) {
        let colIndex = 0
        let colName = 'A'

        let addColumn = (
          caption: string,
          v: string,
          t: import('xlsx').ExcelDataType,
          hidden?: boolean
        ) => {
          if (rowNum == titleRow + 1) {
            ws[colName + titleRow] = { v: caption }
            ws['!cols'].push({
              wch: caption.length,
              hidden: hidden
            })
          }

          ws[colName + rowNum.toString()] = {
            v: v,
            t: t
          }

          maxChar = colName
          let col = ws['!cols'][colIndex++]
          colName = XLSX.utils.encode_col(colIndex)
          if (v) {
            let len = v.length
            if (len > col.wch) {
              col.wch = len
            }
          }
        }
        for (const c of f.$) {
          try {
            if (!excludeColumn(<E>f, c)) {
              let v = c.displayValue
              if (v == undefined) v = ''

              if (c.metadata.valueType == Date) {
                if (
                  c.metadata.valueConverter !== <any>ValueConverters.DateOnly
                ) {
                  addColumn(
                    'תאריך ' + c.metadata.caption,
                    c.value
                      ? ValueConverters.DateOnly.toJson(c.value)
                      : undefined,
                    'd',
                    false
                  )
                  addColumn(
                    'שעת ' + c.metadata.caption,
                    c.value ? c.value.getHours().toString() : undefined,
                    'n',
                    false
                  )
                  addColumn(
                    'מלא ' + c.metadata.caption,
                    c.displayValue,
                    's',
                    true
                  )
                } else
                  addColumn(
                    c.metadata.caption,
                    c.value
                      ? ValueConverters.DateOnly.toJson(c.value)
                      : undefined,
                    'd',
                    false
                  )
              } else if (c.metadata.valueType === Number)
                addColumn(
                  c.metadata.caption,
                  v.toString(),
                  'n',
                  hideColumn(<E>f, c)
                )
              else
                addColumn(
                  c.metadata.caption,
                  v.toString(),
                  's',
                  hideColumn(<E>f, c)
                )
              if (
                c.metadata.caption == use.language.volunteer ||
                c.metadata.caption == use.language.defaultVolunteer
              ) {
                let val = ''
                if (c.value instanceof HelpersBase)
                  val = c.value.$.phone.displayValue
                addColumn(
                  c.metadata.caption + ' ' + use.language.phone,
                  val,
                  's',
                  false
                )
              }
            }
          } catch (err) {
            console.error(err, c.metadata.key, f._.toApiJson())
          }
        }

        if (moreColumns) await moreColumns(<E>f, addColumn)
        rowNum++
      }
      if (currentPage.hasNextPage) {
        currentPage = await currentPage.nextPage()
      } else currentPage = undefined
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

    wb.Workbook = { Views: [{ RTL: use.language.languageCode == 'iw' }] }
    let ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1')
    XLSX.writeFile(wb, fileName + '.xlsx')
  })
}
