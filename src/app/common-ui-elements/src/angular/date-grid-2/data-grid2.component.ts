import {
  Component,
  OnChanges,
  Input,
  ViewChild,
  OnDestroy
} from '@angular/core'

import { DataFilterInfoComponent } from '../data-filter-info/data-filter-info.component'
import { FieldMetadata, Remult, Entity } from 'remult'
import { SelectValueDialogComponent } from '../add-filter-dialog/add-filter-dialog.component'
import { Directionality } from '@angular/cdk/bidi'

import { DataControlSettings, getFieldDefinition } from '../../../interfaces'
import { GridButton, GridSettings, RowButton } from '../../../interfaces'
import { openDialog } from '../common-ui-elements.module'
import { CommonUIElementsPluginsService } from '../CommonUIElementsPluginsService'

@Component({
  selector: 'data-grid',
  templateUrl: `./data-grid2.component.html`,
  styleUrls: ['./data-grid2.component.scss']
})
export class DataGrid2Component implements OnChanges, OnDestroy {
  constructor(
    private remult: Remult,
    dir: Directionality,
    public plugin: CommonUIElementsPluginsService
  ) {
    this.rightToLeft = dir.value === 'rtl'
  }
  ngOnDestroy(): void {
    this.settings.unsubscribe()
  }

  async addCol(c: DataControlSettings) {
    await openDialog(SelectValueDialogComponent, (x) =>
      x.args({
        values: this.settings.origList,
        onSelect: (col) => {
          this.settings.columns.addCol(c, col)
          this.settings.columns.numOfColumnsInGrid++
        }
      })
    )
  }
  getColFlex(map: DataControlSettings) {
    return '0 0 ' + this.getColWidth(map)
  }
  getColWidth(map: DataControlSettings) {
    let x = this.settings.columns.__dataControlStyle(map)
    if (!x) x = '200px'
    return x
  }

  test() {
    //this.dataGridDiv.nativeElement.scrollTop = 0;
  }
  rightToLeft = false

  getTotalRows() {
    if (this.settings.totalRows)
      return Math.ceil(this.settings.totalRows / this.settings.rowsPerPage)
    if (this.rightToLeft) return 'רבים'
    return 'many'
  }
  getBottomLine() {
    if (this.settings.items.length == 0) return ''
    let p = this.settings.page
    let firstRow = (p - 1) * this.settings.rowsPerPage + 1
    let lastRow = firstRow + this.settings.items.length - 1
    return (
      firstRow +
      ' - ' +
      lastRow +
      (this.rightToLeft ? ' מתוך ' : ' of ') +
      (this.settings.totalRows
        ? this.settings.totalRows
        : this.rightToLeft
        ? 'רבים'
        : 'many')
    )

    //{{rightToLeft?'עמוד':'Page'}} {{settings.page}} {{rightToLeft?' מתוך ':' of '}} {{getTotalRows()}}
  }
  tempDragColumn!: DataControlSettings
  dragStart(x: DataControlSettings) {
    this.tempDragColumn = x
  }
  dragOver(x: DataControlSettings, event: any) {
    event.preventDefault()
  }
  onDrop(x: DataControlSettings) {
    let oldPosition = this.settings.columns.items.indexOf(this.tempDragColumn)
    this.settings.columns.items.splice(oldPosition, 1)
    let newPosition = this.settings.columns.items.indexOf(x)
    if (newPosition == oldPosition) newPosition++
    this.settings.columns.items.splice(newPosition, 0, this.tempDragColumn)
    this.settings.columns.colListChanged()
  }
  @Input() width?: string
  @Input() height?: string
  _getHeight() {
    if (this.height) {
      if ((+this.height).toString() == this.height) return this.height + 'px'
      return this.height
    }
    return undefined
  }
  @Input() displayButtons = true
  @Input() displayVCR = true

  @Input() settings!: GridSettings
  prevSettings?: GridSettings

  getAreaSettings() {
    return this.settings as any
  }

  isFiltered(c: FieldMetadata | any) {
    return this.settings.columns.filterHelper.isFiltered(c)
  }
  //@ts-ignore
  @ViewChild(DataFilterInfoComponent) dataFilterInfo: DataFilterInfoComponent
  showFilterColumnDialog(dataControlSettings: DataControlSettings) {
    if (!dataControlSettings.field) return
    this.settings.initOrigList()
    this.dataFilterInfo.editFilter(
      getFieldDefinition(dataControlSettings.field)!
    )
  }

  getButtonCssClass(b: RowButton<any>, row: any) {
    if (!b.cssClass) return ''
    if (typeof b.cssClass === 'function')
      return (<(row: any) => string>b.cssClass)(row)
    return b.cssClass.toString()
  }
  getButtonText(b: RowButton<any>, row: any) {
    if (!b.textInMenu) return b.name
    if (typeof b.textInMenu === 'function') {
      if (!row) return ''
      //@ts-ignore
      return b.textInMenu(row)
    }
    return <string>b.textInMenu
  }
  clickOnselectCheckboxFor(row: any, e: MouseEvent) {
    this.settings.clickOnselectCheckboxFor(row, e.shiftKey)
  }
  hasVisibleButton(record: any) {
    return this.rowButtons.find((b) => b.visible!(record))
  }
  hasVisibleGridButtons() {
    return this.gridButtons.find((b) => b.visible!())
  }
  rowButtons: RowButton<any>[] = []
  gridButtons: GridButton[] = []
  keys: string[] = []
  private addButton(b: RowButton<any>) {
    if (!b.click) b.click = (r) => {}
    if (!b.visible) b.visible = (r) => true
    if (!b.cssClass) b.cssClass = (r) => 'btn'
    else if (!(typeof b.cssClass === 'function')) {
      let x = b.cssClass
      b.cssClass = <any>((r: any) => x)
    }

    this.rowButtons.push(b)
    return b
  }
  rowClicked(row: any) {
    this.settings.setCurrentRow(row)
  }

  page = 1
  nextPage() {
    this.page++
  }
  previousPage() {
    if (this.page <= 1) return
    this.page--
  }
  wasThereAChangeToTheRow(row: any) {
    return this.settings.wasThereAChangeToTheRow(row)
  }

  showSaveAllButton() {
    return Boolean(
      this.settings.items.find((x) => this.wasThereAChangeToTheRow(x))
    )
  }
  saveAllText() {
    return this.rightToLeft
      ? 'שמור ' +
          this.settings.items.filter((x) => this.wasThereAChangeToTheRow(x))
            .length +
          ' שורות'
      : 'save ' +
          this.settings.items.filter((x) => this.wasThereAChangeToTheRow(x))
            .length +
          ' rows'
  }
  async saveAllClick() {
    await Promise.all(
      this.settings.items
        .filter((x) => this.wasThereAChangeToTheRow(x))
        .map((x) => this.settings.saveRow(x))
    )
  }

  ngOnChanges(): void {
    if (!this.settings) return
    if (this.prevSettings) this.prevSettings.unsubscribe()
    this.prevSettings = this.settings

    this.rowButtons = []
    this.gridButtons = []
    this.gridButtons.push({
      visible: () => this.showSaveAllButton(),
      textInMenu: () => this.saveAllText(),
      click: async () => {
        await this.saveAllClick()
      }
    })
    this.gridButtons.push({
      icon: 'filter_alt',
      textInMenu: () => (this.rightToLeft ? 'סינון' : 'Filter'),
      click: () => this.dataFilterInfo.showAddAnotherFilterDialog(),
      visible: () => true
    })
    this.settings.columns.setContext(this.remult)
    if (this.settings.settings!.gridButtons) {
      this.gridButtons.push(
        ...this.settings.settings!.gridButtons.map((x) => {
          if (!x.visible) x.visible = () => true
          return x
        })
      )
    }

    if (this.settings.allowUpdate) {
      this.addButton({
        name: '',
        icon: 'check',
        cssClass: 'glyphicon glyphicon-ok btn-success',
        visible: (r) => this.wasThereAChangeToTheRow(r),
        showInLine: true,
        textInMenu: () => (this.rightToLeft ? 'שמור' : 'save'),
        click: (r) => {
          this.settings.saveRow(r)
        }
      })
      this.addButton({
        name: '',
        icon: 'cancel',
        cssClass: 'btn btn-danger glyphicon glyphicon-ban-circle',
        visible: (r) => this.wasThereAChangeToTheRow(r),
        showInLine: true,
        textInMenu: () => (this.rightToLeft ? 'בטל שינוים' : 'cancel'),

        click: (r) => {
          this.settings.undoChanges(r)
        }
      })
    }

    if (this.settings.allowDelete)
      this.addButton({
        name: '',
        visible: (r) => {
          return r && !this.settings.getRowHelper(r).isNew()
        },
        icon: 'delete',
        //       showInLine: true,
        textInMenu: () => (this.rightToLeft ? 'מחק' : 'Delete'),
        click: async (r) => {
          if (this.settings.settings!.confirmDelete) {
            if (!(await this.settings.settings!.confirmDelete(r))) return
          }
          this.settings.getRowHelper(r).delete()
        },

        cssClass: 'btn-danger glyphicon glyphicon-trash'
      })
    if (this.settings._buttons)
      for (let b of this.settings._buttons) {
        this.addButton(b)
      }
    if (this.settings && !this.settings.loaded) {
      this.settings.reloadData()
    }
  }

  _getRowClass(row: any) {
    let r = 'dataGridRow '
    if (this.settings.rowClass) r += this.settings.rowClass(row)
    if (row == this.settings.currentRow) r += ' active'

    return r
  }
  _getRowColumnClass(col: any, row: any) {
    return this.settings.columns._getColumnClass(col, row) + ' dataGridDataCell'
  }
}
