import {
  FieldMetadata,
  Sort,
  FieldsMetadata,
  EntityOrderBy,
  EntityFilter,
  FindOptions,
  getEntityRef,
  Repository,
  Filter,
  MembersToInclude
} from 'remult'

import { FieldCollection } from './column-collection'
import { DataAreaSettings, IDataAreaSettings } from './data-area-settings'
import {
  DataControlInfo,
  DataControlSettings,
  getFieldDefinition
} from './data-control-interfaces'
import { DataList } from './dataList'
import { FilterHelper } from './filter-helper'

const rowChangedKey = Symbol('rowChanged')

export class GridSettings<rowType = unknown> {
  addNewRowToGrid(v: rowType) {
    setTimeout(() => {
      const refId = getEntityRef(v).getId()
      const index = this.items.findIndex(
        (x) => getEntityRef(x).getId() == refId
      )
      if (index >= 0) this.items.splice(index, 1)
      this.items.splice(0, 0, v)
    }, 300)
  }
  addNewRow() {
    let r: any = this.restList.add()
    if (this.onNewRow) this.onNewRow(r)
    this.setCurrentRow(r)
  }
  undoChanges(r: rowType) {
    let helper = this.getRowHelper(r)
    helper.undoChanges()
    if (helper.isNew()) this.restList.removeItem(r)
  }
  constructor(
    public repository: Repository<rowType>,
    public settings?: IDataSettings<rowType>
  ) {
    if (!settings) this.settings = settings = {}
    if (this.settings.liveQuery === undefined) this.settings.liveQuery = true
    this.restList = new DataList<rowType>(
      repository,
      settings.listRefreshed,
      settings.liveQuery
    )
    if (repository) {
      this.filterHelper.filterRow = <rowType>repository.create()
      repository.addEventListener({
        validating: async (entity) => {
          if (this.onValidate) await this.onValidate(entity)
          if (this.onSavingRow) await this.onSavingRow(entity)
        }
      })
    }

    this.columns = new FieldCollection<rowType>(
      () => this.currentRow,
      () => this.allowUpdate,
      this.filterHelper,
      () => (this.currentRow ? true : false),
      (a, b) => this.repository.getEntityRef(a).fields.find(b)
    )

    if (settings) {
      if (settings.columnSettings) {
        let x = settings.columnSettings(repository.metadata.fields)
        this.columns.add(...x)
      }
      if (settings.allowCrud !== undefined) {
        if (settings.allowUpdate === undefined)
          settings.allowUpdate = settings.allowCrud
        if (settings.allowDelete === undefined)
          settings.allowDelete = settings.allowCrud
        if (settings.allowInsert === undefined)
          settings.allowInsert = settings.allowCrud
      }
      if (settings.allowUpdate) this.allowUpdate = true
      if (settings.allowDelete) this.allowDelete = true
      if (settings.allowInsert) this.allowInsert = true
      if (settings.showDataArea) this.showDataArea = settings.showDataArea
      if (settings.showPagination === undefined) settings.showPagination = true

      if (settings.numOfColumnsInGrid != undefined)
        this.columns.numOfColumnsInGrid = settings.numOfColumnsInGrid

      if (settings.rowButtons) this._buttons = settings.rowButtons

      if (settings.rowCssClass) this.rowClass = settings.rowCssClass
      if (settings.saving) this.onSavingRow = settings.saving
      if (settings.enterRow) this.onEnterRow = settings.enterRow
      if (settings.newRow) this.onNewRow = settings.newRow
      if (settings.validation) this.onValidate = settings.validation
      if (settings.caption) this.caption = settings.caption
      if (!this.caption && repository) {
        this.caption = repository.metadata.caption
      }
      if (settings.page) this.page = settings.page

      if (settings.rowsInPage) this.rowsPerPage = settings.rowsInPage
      else this.rowsPerPage = 25

      if (this.rowsPerPageOptions.indexOf(this.rowsPerPage) < 0) {
        this.rowsPerPageOptions.push(this.rowsPerPage)
        this.rowsPerPageOptions.sort((a, b) => +a - +b)
      }

      if (settings.orderBy)
        this._currentOrderBy = Sort.translateOrderByToSort(
          this.repository.metadata,
          this.settings!.orderBy!
        )
    }
  }

  currList!: DataControlSettings[]
  origList!: DataControlSettings[]
  origNumOfColumns!: number
  showSelectColumn = false

  initOrigList() {
    if (!this.origList) {
      this.origList = []
      this.origNumOfColumns = this.columns.numOfColumnsInGrid
      this.origList.push(...this.columns.items)
    }
  }
  userChooseColumns() {
    this.initOrigList()
    if (!this.currList) {
      this.resetColumns()
    }
    this.showSelectColumn = !this.showSelectColumn
  }
  resetColumns() {
    this.currList = []
    this.columns.items = this.currList
    this.columns.numOfColumnsInGrid = this.origNumOfColumns
    for (let i = 0; i < this.origList.length; i++) {
      // if (i < this.columns.numOfColumnsInGrid)
      this.currList.push(this.origList[i])
    }
  }

  deleteCol(c: DataControlSettings) {
    this.columns.deleteCol(c)
    this.columns.numOfColumnsInGrid--
  }

  noam!: string

  addArea(settings: IDataAreaSettings<rowType>) {
    let col = new FieldCollection<rowType>(
      () => this.currentRow,
      () => this.allowUpdate,
      this.filterHelper,
      () => (this.currentRow ? true : false),
      (a, b) => this.repository.getEntityRef(a).fields.find(b)
    )
    col.numOfColumnsInGrid = 0

    return new DataAreaSettings<rowType>(
      settings,
      col,
      this.repository.metadata.fields
    )
  }
  currentRow!: rowType
  setCurrentRow(row: rowType) {
    if (this.currentRow != row) {
      this.currentRow = row
      if (this.onEnterRow && row) {
        this.onEnterRow(row)
      }
    }
  }
  nextRow() {
    if (!this.currentRow && this.items.length > 0)
      this.setCurrentRow(this.items[0])
    if (this.currentRow) {
      let currentRowPosition = this.items.indexOf(this.currentRow)
      if (currentRowPosition < this.items.length - 1)
        this.setCurrentRow(this.items[currentRowPosition + 1])
      else
        this.nextPage().then(() => {
          if (this.items.length > 0) this.setCurrentRow(this.items[0])
        })
    }
  }
  previousRowAllowed() {
    return (
      (this.currentRow && this.items.indexOf(this.currentRow) > 0) ||
      this.page > 1
    )
  }
  previousRow() {
    if (!this.previousRowAllowed()) return

    let currentRowPosition = this.items.indexOf(this.currentRow)
    if (currentRowPosition > 0)
      this.setCurrentRow(this.items[currentRowPosition - 1])
    else {
      if (this.page > 1)
        this.previousPage()!.then(() => {
          if (this.items.length > 0)
            this.setCurrentRow(this.items[this.items.length - 1])
        })
    }
  }
  deleteCurentRow() {
    if (!this.deleteCurrentRowAllowed) return
    this.currentRowAsRestListItemRow()!.delete()
  }
  currentRowAsRestListItemRow() {
    if (!this.currentRow) return undefined
    return this.getRowHelper(this.currentRow)
  }
  getRowHelper(item: rowType) {
    return this.repository.getEntityRef(item)
  }
  cancelCurrentRowChanges() {
    if (
      this.currentRowAsRestListItemRow() &&
      this.currentRowAsRestListItemRow()
    )
      (this.currentRowAsRestListItemRow() as any)!.undoChanges()
  }
  deleteCurrentRowAllowed() {
    return (
      this.currentRowAsRestListItemRow() &&
      this.currentRowAsRestListItemRow()!.delete! &&
      this.allowDelete &&
      !this.currentRowAsRestListItemRow()!.isNew()
    )
  }
  currentRowChanged() {
    return (
      this.currentRowAsRestListItemRow() &&
      this.currentRowAsRestListItemRow()!.wasChanged()
    )
  }
  wasThereAChangeToTheRow(row: any) {
    let result = row[rowChangedKey]
    if (result == undefined) {
      const helper = this.getRowHelper(row)
      helper.subscribe({
        reportObserved: () => {},
        reportChanged: () => {
          row[rowChangedKey] = -1
        }
      })
      result = row[rowChangedKey] = -1
    }
    if (result == -1) {
      row[rowChangedKey] = result = this.getRowHelper(row).wasChanged() ? 1 : 0
    }
    return result == 1
  }
  saveCurrentRow() {
    this.saveRow(this.currentRow)
  }

  allowUpdate = false
  allowInsert = false
  allowDelete = false
  showDataArea = false

  _buttons: RowButton<any>[] = []

  rowClass?: (row: any) => string
  onSavingRow?: (row: any) => Promise<any> | any
  onValidate?: (row: rowType) => Promise<any> | any
  onEnterRow!: (row: rowType) => void
  onNewRow!: (row: rowType) => void
  saveRow(s: rowType) {
    this.restList.save(s)
  }
  caption!: string

  filterHelper = new FilterHelper<rowType>(() => {
    this.page = 1
    this.reloadData()
  }, this.repository)

  columns: FieldCollection<rowType>

  page = 1
  nextPage() {
    this.page++
    return this.reloadData()
  }
  previousPage() {
    if (this.page <= 1) return
    this.page--
    return this.reloadData()
  }
  firstPage() {
    this.page = 1
    return this.reloadData()
  }
  selectedRows: rowType[] = []
  selectedChanged(row: rowType) {
    if (this.isSelected(row)) {
      this.selectedRows.splice(this.selectedRows.indexOf(row), 1)
      this._selectedAll = false
    } else {
      this.selectedRows.push(row)

      this._selectedAll = this.selectedRows.length == this.totalRows
    }
  }
  lastSelectedRowWithShift!: rowType
  clickOnselectCheckboxFor(row: rowType, shift: boolean) {
    if (shift) {
      if (!this.lastSelectedRowWithShift) {
        this.lastSelectedRowWithShift = row
      } else {
        let found = false
        for (const rule of this.items) {
          if (found) {
            if (rule == row || rule == this.lastSelectedRowWithShift) {
              this.lastSelectedRowWithShift = undefined!
              return
            } else this.selectedChanged(rule)
          } else found = rule == row || rule == this.lastSelectedRowWithShift
        }
      }
    }

    this.lastSelectedRowWithShift = row
  }
  isSelected(row: rowType) {
    return this.selectedRows.indexOf(row) >= 0
  }
  selectAllIntermitent() {
    return (
      this.selectedRows.length > 0 &&
      (this.selectedRows.length != this.items.length || !this._selectedAll)
    )
  }
  selectAllChecked() {
    return (
      this.selectedRows.length > 0 &&
      this.selectedRows.length == this.items.length &&
      this._selectedAll
    )
  }
  private _selectedAll = false
  selectAllChanged(e: { checked: boolean }) {
    this.selectedRows.splice(0)
    if (e.checked) {
      this.selectedRows.push(...this.items)
      this._selectedAll = true
    } else this._selectedAll = false
  }
  rowsPerPage!: number
  rowsPerPageOptions = [10, 25, 50, 100]
  get(options: FindOptions<rowType>) {
    if (options.where) this.settings!.where = () => options.where!
    if (options.orderBy)
      this._currentOrderBy = Sort.translateOrderByToSort(
        this.repository.metadata,
        options.orderBy
      )
    this.page = 1
    return this.reloadData()
  }

  _currentOrderBy!: Sort
  sort(column: FieldMetadata | any) {
    let done = false
    if (this._currentOrderBy && this._currentOrderBy.Segments.length > 0) {
      if (this._currentOrderBy.Segments[0].field.key == column.key) {
        this._currentOrderBy.Segments[0].isDescending =
          !this._currentOrderBy.Segments[0].isDescending
        done = true
      }
    }
    if (!done) this._currentOrderBy = new Sort({ field: column })
    this.reloadData()
  }
  sortedAscending(column: FieldMetadata | any) {
    if (!this._currentOrderBy) return false
    if (!column) return false
    return (
      this._currentOrderBy.Segments.length > 0 &&
      this._currentOrderBy.Segments[0].field.key == column.key &&
      !this._currentOrderBy.Segments[0].isDescending
    )
  }
  sortedDescending(column: FieldMetadata | any) {
    if (!this._currentOrderBy) return false
    if (!column) return false
    return (
      this._currentOrderBy.Segments.length > 0 &&
      this._currentOrderBy.Segments[0].field.key == column.key &&
      !!this._currentOrderBy.Segments[0].isDescending
    )
  }

  totalRows!: number
  unsubscribe = () => {}
  loaded = false
  async reloadData() {
    let opt: FindOptions<rowType> = await this._internalBuildFindOptions()
    this.columns.autoGenerateColumnsBasedOnData(this.repository.metadata)
    if (!this.loaded) {
      this.loaded = true
      if (this.settings?.columnOrderStateKey) {
        new columnOrderAndWidthSaver(this).load(
          this.settings.columnOrderStateKey
        )
      }
    }
    this.unsubscribe()
    let resolved = false
    return new Promise<rowType[]>((res) => {
      this.unsubscribe = this.restList.get(opt, (rows) => {
        this.selectedRows = this.selectedRows.map((s) => {
          let id = getEntityRef(s).getId()
          let r = rows.find((r) => getEntityRef(r).getId() == id)
          if (r !== undefined) return r
          return s
        })
        let currentRow =
          this.currentRow &&
          this.restList.items.find(
            (y) =>
              this.repository.getEntityRef(y).getId() ===
              this.repository.getEntityRef(this.currentRow).getId()
          )
        if (this.restList.items.length == 0) {
          this.setCurrentRow(undefined!)
        } else {
          this.setCurrentRow(currentRow || this.restList.items[0])
        }
        if (this.settings?.rowsLoaded) {
          this.settings?.rowsLoaded(this.restList.items)
        }
        if (!resolved) {
          resolved = true
          res(this.restList.items)
        }
        return this.restList
      })
      if (this.settings && !(this.settings.knowTotalRows === false)) {
        this.refreshCount = () =>
          this.restList.count(opt.where).then((x) => {
            this.totalRows = x
          })
        this.refreshCount()
      }
    })
  }
  refreshCount = () => {}

  restList: DataList<rowType>
  async _internalBuildFindOptions() {
    let opt: FindOptions<rowType> = {}
    if (this.settings!.where) {
      opt.where = await Filter.resolve(this.settings!.where)
    }
    if (this.settings?.include) opt.include = this.settings.include
    if (this.settings!.orderBy) opt.orderBy = this.settings!.orderBy

    if (this._currentOrderBy)
      opt.orderBy = this._currentOrderBy.toEntityOrderBy()

    opt.limit = this.rowsPerPage
    if (this.page > 1) opt.page = this.page
    this.filterHelper.addToFindOptions(opt)
    return opt
  }
  async getFilterWithSelectedRows() {
    let r = await this._internalBuildFindOptions()
    if (this.selectedRows.length > 0 && !this._selectedAll) {
      r.where = {
        $and: [
          r.where,
          this.repository.metadata.idMetadata.createIdInFilter(
            this.selectedRows
          )
        ]
      } as EntityFilter<rowType>
    }
    return r
  }

  get items(): rowType[] {
    if (this.restList) return this.restList.items
    return undefined!
  }
}
export interface IDataSettings<rowType> {
  rowsLoaded?: (items: rowType[]) => void
  allowUpdate?: boolean
  allowInsert?: boolean
  allowDelete?: boolean
  allowCrud?: boolean
  showDataArea?: boolean
  showPagination?: boolean
  allowSelection?: boolean
  confirmDelete?: (r: rowType) => Promise<boolean>
  columnOrderStateKey?: string
  columnSettings?: (row: FieldsMetadata<rowType>) => DataControlInfo<rowType>[]
  areas?: { [areaKey: string]: DataControlInfo<rowType>[] }

  rowCssClass?: (row: rowType) => string
  rowButtons?: RowButton<rowType>[]
  gridButtons?: GridButton[]
  include?: MembersToInclude<rowType>
  /** filters the data
   * @example
   * await taskRepo.find({where: { completed:false }})
   * @see For more usage examples see [EntityFilter](https://remult.dev/docs/entityFilter.html)
   */
  where?:
    | EntityFilter<rowType>
    | (() => EntityFilter<rowType> | Promise<EntityFilter<rowType>>)
  /** Determines the order in which the result will be sorted in
   * @see See [EntityOrderBy](https://remult-ts.github.io/guide/ref__entityorderby) for more examples on how to sort
   */
  orderBy?: EntityOrderBy<rowType>
  /** Determines the number of rows returned by the request, on the browser the default is 25 rows
   * @example
   * this.products = await this.remult.repo(Products).gridSettings({
   *  rowsInPage:10,
   *  page:2
   * })
   */
  rowsInPage?: number
  /** Determines the page number that will be used to extract the data
   * @example
   * this.products = await this.remult.repo(Products).gridSettings({
   *  rowsInPage:10,
   *  page:2
   * })
   */
  page?: number
  __customFindData?: any
  knowTotalRows?: boolean
  saving?: (r: rowType) => void
  validation?: (r: rowType) => void
  enterRow?: (r: rowType) => void
  newRow?: (r: rowType) => void
  numOfColumnsInGrid?: number
  caption?: string
  listRefreshed?: VoidFunction
  liveQuery?: boolean
}
export interface RowButton<rowType> {
  name?: string
  visible?: (r: rowType) => boolean
  click: (r: rowType) => void
  showInLine?: boolean
  textInMenu?: string | ((row: rowType) => string)
  icon?: string
  cssClass?: string | ((row: rowType) => string)
}

export interface GridButton {
  name?: string
  visible?: () => boolean
  click: () => void
  textInMenu?: () => string
  icon?: string
  cssClass?: string | (() => string)
}

const storageEntryName = 'grid-state'
export class columnOrderAndWidthSaver {
  suspend = false
  constructor(private grid: GridSettings<any>) {}
  getStorage() {
    let state = localStorage.getItem(storageEntryName)
    if (state) {
      let st = JSON.parse(state)
      if (st) return st
    }
    return {}
  }
  load(key: string) {
    let items: storedColumn[] = this.getStorage()[key]
    if (items) {
      let cols = items
        .map((x) => {
          let r: DataControlSettings | undefined
          r = this.grid.columns.items.find((c) => c.caption == x.caption)
          if (!r)
            r = this.grid.columns.items.find(
              (c) => c.field && getFieldDefinition(c.field)?.key == x.key
            )
          if (x.width && r) r.width = x.width
          return r!
        })
        .filter((x) => x !== undefined)
      if (cols.length > 0) sortColumns(this.grid, cols)
    }
    this.grid.columns.onColListChange(() => {
      if (this.suspend) return
      let x: storedColumn[] = []
      for (
        let index = 0;
        index <= this.grid.columns.numOfColumnsInGrid;
        index++
      ) {
        const element = this.grid.columns.items[index]
        if (element)
          x.push({
            caption: element.caption,
            key: getFieldDefinition(element.field!)?.key,
            width: element.width!
          })
      }
      let s = this.getStorage()
      s[key] = x
      localStorage.setItem(storageEntryName, JSON.stringify(s))
    })
  }
}
export interface storedColumn {
  key?: string
  caption?: string
  width: string
}

export function sortColumns(
  list: GridSettings<any>,
  columns: DataControlInfo<any>[]
) {
  if (list.origList && list.origList.length > 0) list.resetColumns()
  list.columns.items.sort((a, b) =>
    a.caption! > b.caption! ? 1 : a.caption! < b.caption! ? -1 : 0
  )
  list.columns.numOfColumnsInGrid = columns.length
  for (let index = 0; index < columns.length; index++) {
    const origItem = columns[index]
    let item: DataControlSettings<any>
    let defs = origItem as FieldMetadata<any>
    if (defs && defs.valueType) {
      item = list.columns.items.find((x) => x.field == defs)!
    } else item = origItem as DataControlSettings<any>
    let origIndex = list.columns.items.indexOf(item)
    list.columns.moveCol(item, -origIndex + index)
  }
}
