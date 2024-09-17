import { Component, OnInit, ViewChild } from '@angular/core'
import { FieldMetadata, FieldsMetadata, FieldRef, remult } from 'remult'

import { DialogService } from '../select-popup/dialog'
import { BusyService } from '../common-ui-elements'
import { MatStepper } from '@angular/material/stepper'

import { ApplicationSettings } from '../manage/ApplicationSettings'
import { Helpers } from '../helpers/helpers'
import { fixPhone } from '../import-from-excel/import-from-excel.component'
import { Phone } from '../model-shared/phone'
import {
  duplicateHelperInfo,
  excelRowInfo,
  getColumnDisplayValue,
  ImportHelpersFromExcelController
} from './import-helpers-from-excel.controller'
import { use } from '../translate'
@Component({
  selector: 'app-import-helpers-from-excel',
  templateUrl: './import-helpers-from-excel.component.html',
  styleUrls: ['./import-helpers-from-excel.component.scss']
})
export class ImportHelpersFromExcelComponent implements OnInit {
  constructor(
    private dialog: DialogService,
    private busy: BusyService,
    public settings: ApplicationSettings
  ) {}

  cell: string

  oFile: import('xlsx').WorkBook
  worksheet: import('xlsx').WorkSheet

  excelColumns: excelColumn[] = []
  additionalColumns: additionalColumns[] = []
  columns: columnUpdater[] = []

  rows: number[] = []

  getData() {
    return this.getTheData(this.cell)
  }
  getTheData(cell: string) {
    let val = this.worksheet[cell]
    if (!val || !val.w) return ''
    return val.w.trim()
  }
  columnsInCompare: FieldMetadata[] = []

  totalRows: number
  filename: string

  getColInfo(i: excelRowInfo, col: FieldMetadata) {
    return ImportHelpersFromExcelController.actualGetColInfo(i, col.key)
  }

  async addAll() {
    let count = this.newRows.length
    this.dialog.YesNoQuestion('האם להוסיף ' + count + ' מתנדבים?', () => {
      this.busy.doWhileShowingBusy(async () => {
        let rowsToInsert: excelRowInfo[] = []
        let lastDate = new Date().valueOf()
        for (const i of this.newRows) {
          rowsToInsert.push(i)

          if (rowsToInsert.length == 35) {
            await ImportHelpersFromExcelController.insertHelperRows(
              rowsToInsert
            )
            if (new Date().valueOf() - lastDate > 1000) {
              this.dialog.Info(i.rowInExcel + ' ' + i.name)
            }
            this.identicalRows.push(...rowsToInsert)
            rowsToInsert = []
          }
        }
        if (rowsToInsert.length > 0) {
          await ImportHelpersFromExcelController.insertHelperRows(rowsToInsert)
          this.identicalRows.push(...rowsToInsert)
        }
        this.newRows = []
        this.identicalRows.sort((a, b) => a.rowInExcel - b.rowInExcel)
      })
    })
  }

  async updateAllCol(col: FieldMetadata) {
    let count = this.getColUpdateCount(col)
    let message =
      'האם לעדכן את השדה ' + col.caption + ' ל' + count + ' מתנדבים?'

    this.dialog.YesNoQuestion(message, () => {
      this.busy.doWhileShowingBusy(async () => {
        let rowsToUpdate: excelRowInfo[] = []
        let allRows: excelRowInfo[] = []
        let lastDate = new Date().valueOf()
        for (const i of this.updateRows) {
          let cc = this.getColInfo(i, col)
          if (cc.newDisplayValue != cc.existingDisplayValue) {
            rowsToUpdate.push(i)
          } else allRows.push(i)

          if (rowsToUpdate.length == 35) {
            allRows.push(
              ...(await ImportHelpersFromExcelController.updateHelperColsOnServer(
                rowsToUpdate,
                col.key
              ))
            )
            if (new Date().valueOf() - lastDate > 1000) {
              this.dialog.Info(i.rowInExcel + ' ' + i.name)
            }
            rowsToUpdate = []
          }
        }
        if (rowsToUpdate.length > 0) {
          allRows.push(
            ...(await ImportHelpersFromExcelController.updateHelperColsOnServer(
              rowsToUpdate,
              col.key
            ))
          )
        }
        allRows.sort((a, b) => a.rowInExcel - b.rowInExcel)
        this.updateRows = allRows
      })
    })
  }

  async updateCol(i: excelRowInfo, col: FieldMetadata) {
    await ImportHelpersFromExcelController.actualUpdateCol(i, col.key)
  }

  async clearColumnUpdate(i: excelRowInfo, col: FieldMetadata) {
    let c = this.getColInfo(i, col)
    c.newDisplayValue = c.existingDisplayValue
    c.newValue = c.existingValue
  }

  getColUpdateCount(col: FieldMetadata) {
    let i = 0
    let key = col.key
    for (const r of this.updateRows) {
      let c = r.values[key]
      if (c && c.newDisplayValue != c.existingDisplayValue) i++
    }
    return i
  }

  async fileChange(eventArgs: any) {
    var files = eventArgs.target.files,
      file
    if (!files || files.length == 0) return
    file = files[0]
    var fileReader = new FileReader()
    fileReader.onload = async (e: any) => {
      this.filename = file.name
      // pre-process data
      var binary = ''
      var bytes = new Uint8Array(e.target.result)
      var length = bytes.byteLength
      for (var i = 0; i < length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      // call 'xlsx' to read the file
      this.oFile = (await import('xlsx')).read(binary, {
        type: 'binary',
        cellDates: true,
        cellStyles: true
      })
      this.worksheet = this.oFile.Sheets[this.oFile.SheetNames[0]]
      let sRef = this.worksheet['!ref']
      let to = sRef.substr(sRef.indexOf(':') + 1)

      let maxLetter = 'A'
      for (let index = 0; index < to.length; index++) {
        const element = to[index]
        if ('1234567890'.indexOf(element) >= 0) {
          maxLetter = to.substring(0, index)
          this.totalRows = +to.substring(index, 20)
          break
        }
      }

      if (!this.totalRows) {
        debugger
      }
      let colPrefix = ''
      let colName = 'A'
      let colIndex = 0
      this.excelColumns = []
      while (true) {
        this.excelColumns.push({
          excelColumn: colPrefix + colName,
          column: undefined,
          title: this.getTheData(colPrefix + colName + 1)
        })
        let done = false
        if (colPrefix + colName == maxLetter) done = true
        let j = colName.charCodeAt(0)
        j++
        colName = String.fromCharCode(j)
        if (colName > 'Z') {
          colName = 'A'
          if (colPrefix == 'A') colPrefix = 'B'
          else colPrefix = 'A'
        }
        if (done) {
          break
        }
      }
      for (const col of this.excelColumns) {
        let searchName = col.title
        for (const up of this.columns) {
          if (
            searchName == up.name ||
            (up.searchNames && up.searchNames.indexOf(searchName) >= 0)
          ) {
            col.column = up
            break
          }
        }
      }
      this.rows = []
      for (let index = 2; index <= this.totalRows; index++) {
        this.rows.push(index)
      }
      this.stepper.next()
    }
    fileReader.readAsArrayBuffer(file)
  }

  async readLine(row: number): Promise<excelRowInfo> {
    let f = remult.repo(Helpers).create()

    let helper = new columnUpdateHelper()
    for (const c of this.excelColumns) {
      if (c.column) {
        let val = this.getTheData(c.excelColumn + row)
        if (val && val.length > 0) await c.column.updateFamily(val, f, helper)
      }
    }
    for (const v of this.additionalColumns) {
      await v.column.updateFamily(v.value, f, helper)
    }
    helper.laterSteps.sort((a, b) => a.step - b.step)
    for (const s of helper.laterSteps) {
      s.what()
    }

    f.phone = new Phone(Phone.fixPhoneInput(f.phone?.thePhone))

    let info: excelRowInfo = {
      name: f.name,
      phone: f.phone?.thePhone,

      valid: true,
      rowInExcel: row,
      values: {}
    }
    if (!f.name) {
      info.error = this.settings.lang.lineWithNoName
    }
    for (const c of f.$) {
      if (c.error) {
        if (c.error) {
          c.error += ', '
        }
        c.error += c.error + ': ' + c.error
        info.valid = false
      }
      if (c) {
        info.values[c.metadata.key] = {
          newDisplayValue: await getColumnDisplayValue(c),
          newValue: c.value
        }
      }
    }

    return info
  }
  excelPage: number
  newRowsPage: number
  updateRowsPage: number
  existingFamiliesPage: number
  errorRowsPage: number
  helper: FieldsMetadata<Helpers>
  @ViewChild('stepper', { static: true }) stepper: MatStepper

  async ngOnInit() {
    let updateCol = (col: FieldRef, val: string, seperator: string = ' ') => {
      if (col.inputValue) {
        col.inputValue = (col.inputValue + seperator + val).trim()
      } else col.inputValue = val
    }
    this.helper = remult.repo(Helpers).metadata.fields
    if (false) {
      try {
        this.errorRows = JSON.parse(sessionStorage.getItem('errorRowsHelpers'))
        this.newRows = JSON.parse(sessionStorage.getItem('newRowsHelpers'))
        this.updateRows = JSON.parse(
          sessionStorage.getItem('updateRowsHelpers')
        )
        this.identicalRows = JSON.parse(
          sessionStorage.getItem('identicalRowsHelpers')
        )
        this.columnsInCompare = JSON.parse(
          sessionStorage.getItem('columnsInCompareHelpers')
        ).map((x) => this.helper.find(x))
        if (this.columnsInCompare.length > 0) {
          setTimeout(() => {
            this.stepper.next()
            this.stepper.next()
          }, 100)
        }
      } catch (err) {
        console.log(err)
      }
    }

    let addColumn = (col: FieldMetadata, searchNames?: string[]) => {
      this.columns.push({
        key: col.key,
        name: col.caption,
        updateFamily: async (v, f) => {
          updateCol(f.$.find(col), v)
        },
        searchNames: searchNames,
        columns: [col]
      })
    }

    addColumn(this.helper.name)
    addColumn(this.helper.eventComment)
    addColumn(this.helper.preferredDistributionAreaAddress)
    addColumn(this.helper.preferredFinishAddress)
    addColumn(this.helper.email)
    addColumn(this.helper.eventComment)
    addColumn(this.helper.company)
    addColumn(this.helper.socialSecurityNumber)
    this.columns.push({
      key: 'firstName',
      name: 'שם פרטי',
      updateFamily: async (v, f, h) => {
        h.laterSteps.push({ step: 2, what: () => updateCol(f.$.name, v) })
      },
      columns: [this.helper.name],
      searchNames: ['פרטי']
    })
    this.columns.push({
      key: 'city',
      name: 'עיר אזור חלוקה',
      updateFamily: async (v, f, h) => {
        h.laterSteps.push({
          step: 2,
          what: async () => updateCol(f.$.preferredDistributionAreaAddress, v)
        })
      },
      columns: [this.helper.preferredFinishAddress],
      searchNames: ['עיר']
    })

    for (const c of [this.helper.phone]) {
      this.columns.push({
        key: c.key,
        name: c.caption,
        columns: [c],
        updateFamily: async (v, f) => {
          f.$.find(c).value = new Phone(
            fixPhone(v, this.settings.defaultPrefixForExcelImport).replace(
              /\D/g,
              ''
            )
          )
        }
      })
    }

    this.columns.sort((a, b) =>
      a.name > b.name ? 1 : a.name < b.name ? -1 : 0
    )
  }
  async doImport() {
    this.dialog.YesNoQuestion(
      'האם אתה בטוח שאתה מעוניין לקלוט ' +
        (this.totalRows - 1) +
        ' משפחות מאקסל?',
      async () => {
        await this.iterateExcelFile(true)
      }
    )
  }
  errorRows: excelRowInfo[] = []
  newRows: excelRowInfo[] = []
  identicalRows: excelRowInfo[] = []
  updateRows: excelRowInfo[] = []

  async iterateExcelFile(actualImport = false) {
    this.errorRows = []
    this.newRows = []
    this.updateRows = []
    this.identicalRows = []
    let rows: excelRowInfo[] = []
    let usedTz = new Map<number, number>()
    let usedPhone = new Map<number, number>()
    this.stepper.next()
    await this.busy.doWhileShowingBusy(async () => {
      let updatedColumns = new Map<FieldMetadata, boolean>()

      for (const cu of [
        ...this.excelColumns.map((f) => f.column),
        ...this.additionalColumns.map((f) => f.column)
      ]) {
        if (cu)
          for (const c of cu.columns) {
            updatedColumns.set(c, true)
          }
      }
      this.columnsInCompare = []
      for (let c of this.helper) {
        if (updatedColumns.get(c)) this.columnsInCompare.push(c)
      }
      let columnsInCompareMemberName = this.columnsInCompare.map((x) => x.key)

      await new Promise((resolve) =>
        setTimeout(() => {
          resolve({})
        }, 500)
      )
      try {
        for (let index = 2; index <= this.totalRows; index++) {
          let f = await this.readLine(index)
          if (f.error) {
            this.errorRows.push(f)
          } else {
            let exists = (
              val: string,
              map: Map<number, number>,
              caption: string
            ) => {
              let origVal = val
              if (!val) return false
              val = val.replace(/\D/g, '')
              if (val.length == 0) return false
              let x = map.get(+val)
              if (x > 0 && x < index) {
                f.error =
                  caption + ' - ' + origVal + ' - כבר קיים בקובץ בשורה ' + x
                return true
              }
              map.set(+val, index)
              return false
            }

            if (exists(f.phone, usedPhone, 'טלפון')) {
              this.errorRows.push(f)
            } else rows.push(f)
          }

          if (rows.length == 200) {
            this.dialog.Info(
              index -
                1 +
                ' ' +
                (f.name ? f.name : 'ללא שם') +
                ' ' +
                (f.error ? f.error : '')
            )
            let r =
              await ImportHelpersFromExcelController.checkExcelInputHelpers(
                rows,
                columnsInCompareMemberName
              )
            this.errorRows.push(...r.errorRows)
            this.newRows.push(...r.newRows)
            this.updateRows.push(...r.updateRows)
            this.identicalRows.push(...r.identicalRows)
            rows = []
          }
        }
        if (rows.length > 0) {
          let r = await ImportHelpersFromExcelController.checkExcelInputHelpers(
            rows,
            columnsInCompareMemberName
          )
          this.errorRows.push(...r.errorRows)
          this.newRows.push(...r.newRows)
          this.updateRows.push(...r.updateRows)
          this.identicalRows.push(...r.identicalRows)
        }

        let check = new Map<string, excelRowInfo[]>()
        let collected: excelRowInfo[][] = []
        for (const row of this.updateRows) {
          if (row.duplicateHelperInfo && row.duplicateHelperInfo.length == 1) {
            let rowInfo: excelRowInfo[]
            if ((rowInfo = check.get(row.duplicateHelperInfo[0].id))) {
              rowInfo.push(row)
            } else {
              let arr = [row]
              check.set(row.duplicateHelperInfo[0].id, arr)
              collected.push(arr)
            }
          }
        }
        this.errorRows.sort((a, b) => a.rowInExcel - b.rowInExcel)
        for (const iterator of collected) {
          if (iterator.length > 1) {
            for (const row of iterator) {
              row.error =
                'אותה משפחה באתר מתאימה למספר שורות באקסל: ' +
                iterator.map((x) => x.rowInExcel.toString()).join(', ')
              this.errorRows.push(row)
              this.updateRows.splice(this.updateRows.indexOf(row), 1)
            }
          }
        }

        sessionStorage.setItem(
          'errorRowsHelpers',
          JSON.stringify(this.errorRows)
        )
        sessionStorage.setItem('newRowsHelpers', JSON.stringify(this.newRows))
        sessionStorage.setItem(
          'updateRowsHelpers',
          JSON.stringify(this.updateRows)
        )
        sessionStorage.setItem(
          'identicalRowsHelpers',
          JSON.stringify(this.identicalRows)
        )

        sessionStorage.setItem(
          'columnsInCompare',
          JSON.stringify(columnsInCompareMemberName)
        )
      } catch (err) {
        this.stepper.previous()
        this.dialog.Error('הקליטה הופסקה - ' + err)
      }
    })
  }
  displayDupInfo(info: duplicateHelperInfo) {
    return 'טלפון זהה'
  }

  saveSettings() {
    let save: storedInfo = {
      storedColumns: [],
      additionalColumns: []
    }
    for (const item of this.excelColumns) {
      save.storedColumns.push({
        excelColumn: item.excelColumn,
        columnKey: item.column ? item.column.key : undefined
      })
    }
    for (const item of this.additionalColumns) {
      save.additionalColumns.push({
        value: item.value,
        columnKey: item.column ? item.column.key : undefined
      })
    }
    localStorage.setItem(excelSettingsSave, JSON.stringify(save))
  }
  loadSettings() {
    let loaded = JSON.parse(
      localStorage.getItem(excelSettingsSave)
    ) as storedInfo
    if (loaded) {
      for (const excelItem of this.excelColumns) {
        for (const loadedItem of loaded.storedColumns) {
          if (loadedItem.excelColumn == excelItem.excelColumn) {
            excelItem.column = undefined
            for (const col of this.columns) {
              if (col.key == loadedItem.columnKey) {
                excelItem.column = col
              }
            }
          }
        }
      }
      this.additionalColumns = []
      for (const loadedItem of loaded.additionalColumns) {
        for (const col of this.columns) {
          if (col.key == loadedItem.columnKey) {
            this.additionalColumns.push({
              column: col,
              value: loadedItem.value
            })
          }
        }
      }
    }
  }
  moveFromErrorToAdd(r: excelRowInfo) {
    this.dialog.YesNoQuestion(
      'להעביר את המתנדב ' + r.name + ' למתנדבים להוספה?',
      () => {
        let x = this.errorRows.indexOf(r)
        this.errorRows.splice(x, 1)
        this.newRows.push(r)
        this.newRows.sort((a, b) => a.rowInExcel - b.rowInExcel)
      }
    )
  }

  async testImport() {
    await this.iterateExcelFile(false)
  }
}

const excelSettingsSave = 'excelSettingsSaveHelper'

interface excelColumn {
  excelColumn: string
  column: columnUpdater
  title: string
}
interface additionalColumns {
  column?: columnUpdater
  value?: string
}
interface storedInfo {
  storedColumns: storedColumnSettings[]
  additionalColumns: storedAdditionalColumnSettings[]
}
interface storedColumnSettings {
  excelColumn: string
  columnKey: string
}
interface storedAdditionalColumnSettings {
  columnKey: string
  value: string
}
interface columnUpdater {
  key: string
  name: string
  searchNames?: string[]
  updateFamily: (
    val: string,
    f: Helpers,
    h: columnUpdateHelper
  ) => Promise<void>
  columns: FieldMetadata[]
}
class columnUpdateHelper {
  laterSteps: laterSteps[] = []
}

interface laterSteps {
  step: number
  what: () => void
}
