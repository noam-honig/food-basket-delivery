import { Component, OnInit, ViewChild } from '@angular/core'
import { EntityFilter, remult, Fields, getFields } from 'remult'

import {
  Families,
  sendWhatsappToFamily,
  canSendWhatsapp,
  buildFamilyMessage
} from './families'

import { YesNo } from './YesNo'

import { DialogService, DestroyHelper } from '../select-popup/dialog'

import { DomSanitizer } from '@angular/platform-browser'

import {
  DataControlInfo,
  DataControlSettings,
  GridSettings
} from '../common-ui-elements/interfaces'
import { BusyService, openDialog } from '../common-ui-elements'
import * as chart from 'chart.js'
import { Stats, FaimilyStatistics, colors } from './stats-action'

import {
  reuseComponentOnNavigationAndCallMeWhenNavigatingToIt,
  leaveComponent
} from '../custom-reuse-controller-router-strategy'

import { Phone } from '../model-shared/phone'
import { Route } from '@angular/router'

import { saveToExcel } from '../shared/saveToExcel'
import { AdminGuard, FamilyAdminGuard } from '../auth/guards'
import { Roles } from '../auth/roles'
import { MatTabGroup } from '@angular/material/tabs'

import {
  ApplicationSettings,
  getCustomColumnVisible,
  getSettings
} from '../manage/ApplicationSettings'

import { FamilyStatus } from './FamilyStatus'
import {
  NewDelivery,
  SendSmsToFamilies,
  UpdateArea,
  UpdateBasketType,
  UpdateDefaultDistributionList,
  UpdateDefaultVolunteer,
  UpdateFamilySource,
  updateGroup,
  UpdateQuantity,
  UpdateSelfPickup,
  UpdateStatus
} from './familyActions'

import { MergeFamiliesComponent } from '../merge-families/merge-families.component'
import { sortColumns } from '../shared/utils'
import { columnOrderAndWidthSaver } from './columnOrderAndWidthSaver'
import { BasketType } from './BasketType'
import { use } from '../translate'
import { ChartType } from 'chart.js'
import { GroupsValue } from '../manage/groups'
import { EditCustomMessageComponent } from '../edit-custom-message/edit-custom-message.component'
import {
  messageMerger,
  MessageTemplate
} from '../edit-custom-message/messageMerger'
import { makeId } from '../helpers/helpers'
import { UITools } from '../helpers/init-context'
import { FamiliesController } from './families.controller'
import { ChangeLogComponent } from '../change-log/change-log.component'
import { async } from 'rxjs/internal/scheduler/async'
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component'
import { DeliveryChanges } from './FamilyDeliveries'

@Component({
  selector: 'app-families',
  templateUrl: './families.component.html',
  styleUrls: ['./families.component.scss']
})
export class FamiliesComponent implements OnInit {
  limit = 25

  showHoverButton: boolean = false
  remult = remult
  constructor(
    public dialog: DialogService,
    private san: DomSanitizer,
    public busy: BusyService,
    public settings: ApplicationSettings
  ) {}

  filterBy(s: FaimilyStatistics) {
    this.families.get({
      where: s.rule,
      limit: this.limit,
      orderBy: { name: 'asc' }
    })
  }
  isAdmin = remult.isAllowed(Roles.admin)
  canAdd = remult.isAllowed(Roles.familyAdmin)

  resetRow() {
    var focus: Families
    if (this.families.currentRow.isNew()) {
      let i = this.families.items.indexOf(this.families.currentRow)
      if (i > 0) focus = this.families.items[i - 1]
    }
    this.families.currentRow._.undoChanges()
    if (focus) this.families.setCurrentRow(focus)
  }
  quickAdd() {
    let family = remult.repo(Families).create()
    family.name = this.searchString
    this.dialog.updateFamilyDialog({
      family,
      focusOnAddress: true,
      onSave: async () => {
        await family.showNewDeliveryDialog(this.dialog, this.settings)
        this.families.addNewRowToGrid(family)
        this.refreshStats()
      }
    })
  }
  changedRowsCount() {
    let r = 0
    this.families.items.forEach((f) => {
      if (f._.wasChanged()) r++
    })
    return r
  }
  async saveAll() {
    let wait = []
    this.families.items.forEach((f) => {
      if (f._.wasChanged()) wait.push(f.save())
    })
    await Promise.all(wait)
    this.refreshStats()
  }
  public pieChartLabels: string[] = []
  public pieChartData: number[] = []
  pieChartStatObjects: FaimilyStatistics[] = []
  public colors: Array<any> = [
    {
      backgroundColor: []
    }
  ]

  public pieChartType: ChartType = 'pie'
  currentStatFilter: FaimilyStatistics = undefined

  options: chart.ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: 'right',
      onClick: (event: MouseEvent, legendItem: any) => {
        this.setCurrentStat(this.pieChartStatObjects[legendItem.index])
        return false
      }
    }
  }
  public chartClicked(e: any): void {
    if (e.active && e.active.length > 0) {
      this.setCurrentStat(this.pieChartStatObjects[e.active[0]._index])
    }
  }
  setCurrentStat(s: FaimilyStatistics) {
    this.currentStatFilter = s
    this.searchString = ''
    this.refreshFamilyGrid()
  }
  @Fields.string()
  filterPhone = ''
  searchString = ''
  async doSearch() {
    if (this.families.currentRow && this.families.currentRow._.wasChanged())
      return
    this.busy.donotWait(async () => await this.refreshFamilyGrid())
  }
  async refreshFamilyGrid() {
    this.families.page = 1
    await this.families.reloadData()
  }

  clearSearch() {
    this.searchString = ''
    this.doSearch()
  }
  stats = new Stats()
  async saveToExcel() {
    await saveFamiliesToExcel(
      this.families,
      this.dialog,
      this.settings.lang.families
    )
  }

  normalColumns: DataControlInfo<Families>[]
  addressProblemColumns: DataControlInfo<Families>[]
  addressByGoogle: DataControlInfo<Families>

  families: GridSettings<Families> = new GridSettings(remult.repo(Families), {
    allowUpdate: true,
    allowInsert: this.canAdd,

    rowCssClass: (f) => f.status.getCss(),
    numOfColumnsInGrid: 5,
    enterRow: async (f) => {
      if (f.isNew()) {
        f.basketType = await remult.context.defaultBasketType()
        f.quantity = 1
        f.special = YesNo.No
      } else {
      }
    },

    rowsInPage: this.limit,
    where: () => {
      let index = 0
      let result: EntityFilter<Families>[] = []
      if (this.filterPhone) result.push(Families.filterPhone(this.filterPhone))

      if (this.currentStatFilter) {
        result.push(this.currentStatFilter.rule)
      } else {
        if (this.myTab) index = this.myTab.selectedIndex
        if (index < 0 || index == undefined) index = 0

        result.push(this.statTabs[index].rule)
      }
      if (this.searchString) {
        result.push({ name: { $contains: this.searchString } })
      }

      return { $and: result }
    },
    orderBy: { name: 'asc' },
    knowTotalRows: true,

    columnSettings: (families) => {
      let r: DataControlInfo<Families>[] = [
        {
          field: families.name,
          width: '200'
        },
        {
          field: families.address,
          width: '250',
          clickIcon: 'edit',
          click: (family) => {
            this.dialog.updateFamilyDialog({ family, focusOnAddress: true })
          },
          cssClass: (f) => {
            if (!f.addressOk) return 'addressProblem'
            return ''
          }
        },
        families.phone1,
        families.groups,

        families.email,

        families.familyMembers,
        families.familySource,
        {
          field: families.internalComment,
          width: '300'
        },
        families.tz,
        families.tz2,
        families.iDinExcel,

        families.createUser,
        families.createDate,
        families.lastUpdateDate,

        { field: families.addressOk, width: '70' },
        { field: families.floor, width: '50' },
        { field: families.appartment, width: '50' },
        { field: families.entrance, width: '50' },
        { field: families.buildingCode, width: '50' },
        { field: families.addressComment },
        families.city,
        families.area,
        families.postalCode,
        families.addressByGoogle,
        {
          caption: this.settings.lang.googleApiProblem,
          getValue: (f) => f.addressHelper.getGeocodeInformation.whyProblem()
        },
        families.phone1Description,
        families.phone2,
        families.phone2Description,
        families.phone3,
        families.phone3Description,
        families.phone4,
        families.phone4Description,

        families.defaultSelfPickup,
        families.status,
        families.statusUser,
        families.statusDate,
        Families.getPreviousDeliveryColumn(families),
        families.previousDeliveryComment,
        families.previousDeliveryDate,
        families.socialWorker,
        families.socialWorkerPhone1,
        families.socialWorkerPhone2,
        families.birthDate,
        families.nextBirthday,
        families.basketType,
        families.quantity,
        families.deliveryComments,
        families.fixedCourier,
        families.defaultDistributionCenter,
        families.special,
        families.numOfActiveReadyDeliveries,
        families.numOfSuccessfulDeliveries
      ]
      for (const c of [
        families.custom1,
        families.custom2,
        families.custom3,
        families.custom4
      ]) {
        if (getCustomColumnVisible(c)) {
          r.push(c)
        }
      }
      this.normalColumns = [families.name, families.address, families.phone1]
      if (this.settings.isSytemForMlt) {
        this.normalColumns.push(families.email, families.createDate)
      } else {
        this.normalColumns.push(families.groups)
      }
      this.addressProblemColumns = [
        families.name,
        families.addressByGoogle,
        families.addressOk,
        families.address,
        families.appartment,
        families.floor,
        families.entrance,
        families.addressComment
      ]
      return r
    },
    gridButtons: [
      {
        textInMenu: () => use.language.filterPhone,
        icon: 'phone',
        click: async () => {
          await this.dialog.inputAreaDialog({
            fields: [getFields(this).filterPhone],
            ok: () => {
              this.refreshFamilyGrid()
            },
            cancel: () => {
              this.filterPhone = ''
              this.refreshFamilyGrid()
            }
          })
        }
      },
      {
        textInMenu: () => use.language.refresh,
        icon: 'refresh',
        click: () => this.refresh()
      },
      {
        textInMenu: () =>
          this.showChart ? use.language.hidePie : use.language.showPie,
        icon: 'unfold_less',
        click: () => (this.showChart = !this.showChart)
      },
      ...[
        new NewDelivery(),
        new updateGroup(),
        new UpdateArea(),
        new UpdateStatus(),
        new UpdateSelfPickup(),
        new UpdateDefaultVolunteer(),
        new UpdateDefaultDistributionList(),
        new UpdateBasketType(),
        new UpdateQuantity(),
        new UpdateFamilySource()
      ].map((x) =>
        x.gridButton({
          afterAction: async () => await this.refresh(),
          ui: this.dialog,
          userWhere: async () =>
            (await this.families.getFilterWithSelectedRows()).where,
          settings: this.settings
        })
      ),
      {
        name: use.language.sendMessageToFamilies,
        visible: () =>
          remult.isAllowed(Roles.admin) && this.settings.allowSmsToFamily,
        click: async () => {
          let message = await this.families.items[0].createSelfOrderMessage()
          openDialog(
            EditCustomMessageComponent,
            (edit) =>
              (edit.args = {
                message,
                templateText:
                  this.settings.familySelfOrderMessage ||
                  defaultSelfOrderMessage,
                helpText: '',
                title: this.settings.lang.sendMessageToFamilies,
                buttons: [
                  {
                    name: use.language.save,
                    click: async () => {
                      this.settings.familySelfOrderMessage =
                        edit.args.templateText
                      await this.settings.save()
                      edit.ref.close()
                    }
                  },
                  {
                    name: 'שלח',

                    click: async () => {
                      this.settings.familySelfOrderMessage =
                        edit.args.templateText
                      await this.settings.save()
                      await new SendSmsToFamilies().runAction({
                        afterAction: async () => await this.refresh(),
                        ui: this.dialog,
                        userWhere: async () =>
                          (
                            await this.families.getFilterWithSelectedRows()
                          ).where,
                        settings: this.settings
                      })
                      edit.ref.close()
                    }
                  }
                ]
              })
          )
        }
      },
      {
        name: this.settings.lang.exportToExcelBasic,
        click: async () =>
          await saveToExcel<Families, GridSettings<Families>>(
            await remult.context.getSettings(),
            remult.repo(Families),
            this.families,
            'families-short',
            this.dialog,
            (f, c) => c == f.$.id || c == f.$.addressApiResult,
            (f, c) =>
              ![
                f.$.id,
                f.$.name,
                f.$.phone1,
                f.$.address,
                f.$.floor,
                f.$.appartment,
                f.$.entrance,
                f.$.addressComment
              ].includes(c),
            async (f, addColumn) => {
              for (const c of [f.$.area, f.$.custom2, f.$.familySource]) {
                addColumn(c.metadata.caption, c.displayValue, 's')
              }
            }
          ),
        visible: () => this.isAdmin
      },

      {
        name: this.settings.lang.exportToExcel,
        click: () => this.saveToExcel(),
        visible: () => this.isAdmin
      },
      {
        name: this.settings.lang.mergeFamilies,
        click: async () => {
          await openDialog(
            MergeFamiliesComponent,
            (x) => (x.families = [...this.families.selectedRows]),
            (y) => {
              if (y.merged) this.refresh()
            }
          )
        },
        visible: () => this.isAdmin && this.families.selectedRows.length > 1
      }
    ],
    allowSelection: true,
    rowButtons: [
      {
        name: '',
        icon: 'edit',
        showInLine: true,
        click: async (family) => {
          this.dialog.updateFamilyDialog({ family })
        },
        textInMenu: () => this.settings.lang.familyDetails
      },

      {
        name: this.settings.lang.newDelivery,
        icon: 'add_shopping_cart',
        click: async (f) => {
          await f.showNewDeliveryDialog(this.dialog, this.settings)
        },
        visible: (f) => !f.isNew()
      },
      {
        name: this.settings.lang.sendWhatsAppToFamily,
        click: (f) => sendWhatsappToFamily(f),
        visible: (f) => canSendWhatsapp(f),
        icon: 'textsms'
      },
      {
        name: use.language.editFamilyWhatsappMessage,
        visible: () => this.remult.isAllowed(Roles.admin),
        click: async (f) => {
          let messageMerge = buildFamilyMessage(f)
          const message = await messageMerge.fetchTemplateRow()
          openDialog(
            EditCustomMessageComponent,
            (edit) =>
              (edit.args = {
                message: messageMerge,
                templateText: message.template,
                helpText: '',
                title: 'ערוך מבנה הודעת וטסאפ למשפחה',
                buttons: [
                  {
                    name: 'שלח הודעה',
                    click: async () => {
                      message.template = edit.args.templateText
                      await message.save()
                      sendWhatsappToFamily(
                        f,
                        undefined,
                        messageMerge.merge(edit.args.templateText)
                      )
                      edit.ref.close()
                    }
                  },
                  {
                    name: 'שמור',
                    click: async () => {
                      message.template = edit.args.templateText
                      await message.save()
                      edit.ref.close()
                    }
                  }
                ]
              })
          )
        }
      },
      {
        name: this.settings.lang.familyDeliveries,
        click: async (f) => {
          f.showDeliveryHistoryDialog({
            settings: this.settings,
            ui: this.dialog
          })
        },
        visible: (f) => !f.isNew()
      },
      {
        name: this.settings.lang.sendSelfOrderLink,
        visible: () => this.settings.familySelfOrderEnabled,
        click: async (f) => {
          let message = await f.createSelfOrderMessage()
          sendWhatsappToFamily(
            f,
            undefined,
            message.merge(this.settings.familySelfOrderMessage)
          )
        }
      },
      {
        name: 'עריכת קישור להזמנה עצמית',
        visible: () => this.settings.familySelfOrderEnabled,
        click: async (f) => {
          let message = await f.createSelfOrderMessage()
          openDialog(
            EditCustomMessageComponent,
            (edit) =>
              (edit.args = {
                message,
                templateText:
                  this.settings.familySelfOrderMessage ||
                  defaultSelfOrderMessage,
                helpText: '',
                title: this.settings.lang.sendSelfOrderLink,
                buttons: [
                  {
                    name: 'שלח הודעה',
                    click: async () => {
                      this.settings.familySelfOrderMessage =
                        edit.args.templateText
                      await this.settings.save()
                      sendWhatsappToFamily(
                        f,
                        undefined,
                        message.merge(edit.args.templateText)
                      )
                      edit.ref.close()
                    }
                  }
                ]
              })
          )
        }
      },
      {
        name: use.language.changeLog,
        visible: (h) => remult.isAllowed(Roles.admin),
        click: (h) =>
          openDialog(ChangeLogComponent, (x) => (x.args = { for: h }))
      },
      {
        name: use.language.assignHistory,
        visible: (h) => remult.repo(DeliveryChanges).metadata.apiReadAllowed,
        click: (h) =>
          openDialog(
            GridDialogComponent,
            (x) =>
              (x.args = {
                title: use.language.assignHistory + ' - ' + h.name,
                settings: new GridSettings(remult.repo(DeliveryChanges), {
                  numOfColumnsInGrid: 8,
                  columnSettings: (x) => [
                    x.courier,
                    x.previousCourier,
                    x.status,
                    x.previousDeliveryStatus,
                    x.deleted,
                    x.userName,
                    x.changeDate,
                    x.appUrl,
                    x.apiUrl
                  ],
                  where: {
                    familyId: h.id
                  }
                })
              })
          )
      }
    ]
  })

  destroyHelper = new DestroyHelper()

  ngOnDestroy(): void {
    this.destroyHelper.destroy()
  }

  groupsTotals: statsOnTab = {
    name: this.settings.lang.byGroups,
    rule: { status: FamilyStatus.Active },
    stats: [],
    moreStats: []
  }
  addressProblem: statsOnTab = {
    rule: {
      addressOk: false,
      status: FamilyStatus.Active,
      defaultSelfPickup: false
    },
    moreStats: [],
    name: this.settings.lang.adderssProblems,
    stats: [this.stats.problem],
    showTotal: true
  }
  statTabs: statsOnTab[] = [
    {
      rule: { status: FamilyStatus.Active },
      showTotal: true,
      name: this.settings.lang.activeFamilies,
      stats: [this.stats.active],
      moreStats: []
    },
    this.groupsTotals,
    this.addressProblem,
    {
      rule: { status: FamilyStatus.Active },
      showTotal: false,
      name: this.settings.lang.defaultVolunteer,
      stats: [],
      moreStats: [],
      refreshStats: async (x) => {
        let familiesByVolunteer = await Families.getDefaultVolunteers()
        this.prepComplexStats(
          familiesByVolunteer.map((g) => ({
            name: g.name,
            count: g.count,
            id: g.id
          })),
          x,
          (g) => ({ status: FamilyStatus.Active, fixedCourier: g.id }),
          (g) => ({ status: FamilyStatus.Active, fixedCourier: { '!=': g.id } })
        )
      }
    },
    {
      rule: { status: FamilyStatus.Active },
      showTotal: false,
      name: this.settings.lang.city,
      stats: [],
      moreStats: [],
      refreshStats: async (x) => {
        let areas = await FamiliesController.getCities()
        this.prepComplexStats(
          areas.map((g) => ({ name: g.city, count: g.count })),
          x,
          (g) => ({ status: FamilyStatus.Active, city: g.name }),
          (g) => ({ status: FamilyStatus.Active, city: { '!=': g.name } })
        )
      }
    },

    {
      rule: { status: FamilyStatus.Active },
      showTotal: false,
      name: this.settings.lang.region,
      stats: [],
      moreStats: [],
      refreshStats: async (x) => {
        let areas = await Families.getAreas()
        this.prepComplexStats(
          areas.map((g) => ({ name: g.area, count: g.count })),
          x,
          (g) => ({ status: FamilyStatus.Active, area: g.name }),
          (g) => ({ status: FamilyStatus.Active, area: { '!=': g.name } })
        )
      }
    },

    {
      rule: {},
      showTotal: true,
      name: this.settings.lang.allFamilies,
      stats: [
        this.stats.active,
        this.stats.frozen,
        this.stats.outOfList,
        this.stats.toDelete
      ],
      moreStats: []
    }
  ]

  async tabChanged() {
    this.currentStatFilter = undefined
    this.searchString = ''
    await this.refreshFamilyGrid()
    this.updateChart()
    this.columnSaver.suspend = true
    if (this.cols) {
      sortColumns(this.families, this.cols)
      this.cols = undefined
    }
    if (this.currentTabStats == this.addressProblem) {
      this.cols = [...this.families.columns.items]
      this.cols.splice(this.families.columns.numOfColumnsInGrid)
      this.prevNumOfCols = this.families.columns.numOfColumnsInGrid

      sortColumns(this.families, this.addressProblemColumns)
    }
    this.columnSaver.suspend = false
  }
  clearStat() {
    this.currentStatFilter = undefined
    this.searchString = ''
    this.refreshFamilyGrid()
  }
  cols: DataControlSettings<Families>[]
  prevNumOfCols = 5
  currentTabStats: statsOnTab = {
    name: '',
    stats: [],
    moreStats: [],
    rule: undefined
  }
  previousTabStats: statsOnTab = this.currentTabStats
  showChart = true
  async updateChart() {
    this.currentTabStats = this.statTabs[this.myTab.selectedIndex]
    if (this.currentTabStats.refreshStats)
      await this.currentTabStats.refreshStats(this.currentTabStats)
    this.pieChartData = []
    this.pieChartStatObjects = []
    this.pieChartLabels.splice(0)
    this.colors[0].backgroundColor.splice(0)
    let stats = this.currentTabStats.stats

    stats.forEach((s) => {
      if (s.value > 0) {
        this.pieChartLabels.push(s.name + ' ' + s.value)
        this.pieChartData.push(s.value)
        if (s.color != undefined) this.colors[0].backgroundColor.push(s.color)
        this.pieChartStatObjects.push(s)
      }
    })
    if (this.pieChartData.length == 0) {
      this.pieChartData.push(0)
      this.pieChartLabels.push(use.language.empty)
    }
    if (this.colors[0].backgroundColor.length == 0) {
      this.colors[0].backgroundColor.push(
        colors.green,
        colors.blue,
        colors.yellow,
        colors.red,
        colors.orange,
        colors.gray
      )
    }
  }

  refreshStats() {
    if (this.suspend) return

    this.busy.donotWait(async () =>
      this.stats.getData(this.dialog.distCenter).then((st) => {
        this.groupsTotals.stats.splice(0)
        this.prepComplexStats(
          st.groups.map((g) => ({ name: g.name, count: g.total })),
          this.groupsTotals,
          (g) => ({
            status: FamilyStatus.Active,
            groups: { $contains: g.name }
          }),
          (g) => ({
            status: FamilyStatus.Active,
            groups: { '!=': new GroupsValue(g.name) }
          })
        )

        this.updateChart()
      })
    )
  }

  private prepComplexStats<type extends { name: string; count: number }>(
    cities: type[],
    stats: statsOnTab,
    equalToFilter: (item: type) => EntityFilter<Families>,
    differentFromFilter: (item: type) => EntityFilter<Families>
  ) {
    stats.stats.splice(0)
    stats.moreStats.splice(0)
    let i = 0
    let lastFs: FaimilyStatistics
    let firstCities = []
    cities.sort((a, b) => b.count - a.count)
    cities.forEach((b) => {
      if (b.count == 0) return
      let fs = new FaimilyStatistics(b.name, equalToFilter(b), undefined)
      fs.value = +b.count
      i++
      if (i <= 8) {
        stats.stats.push(fs)
        firstCities.push(b)
      }
      if (i > 8) {
        if (!lastFs) {
          let x = stats.stats.pop()
          firstCities.pop()
          let differentFilter: EntityFilter<Families> = {
            $and: [differentFromFilter(firstCities[0])]
          }
          for (let index = 1; index < firstCities.length; index++) {
            differentFilter.$and.push(differentFromFilter(firstCities[index]))
          }
          lastFs = new FaimilyStatistics(
            this.settings.lang.allOthers,
            differentFilter,
            undefined
          )
          stats.moreStats.push(x)
          lastFs.value = x.value
          stats.stats.push(lastFs)
        }
      }
      if (i > 8) {
        lastFs.value += fs.value
        stats.moreStats.push(fs)
      }
    })
    stats.moreStats.sort((a, b) => a.name.localeCompare(b.name))
  }

  columnSaver = new columnOrderAndWidthSaver(this.families)
  @ViewChild('myTab', { static: false }) myTab: MatTabGroup

  ngOnInit() {
    this.refreshStats()
    sortColumns(this.families, this.normalColumns)
    this.columnSaver.load('families')
  }

  statTotal(t: statsOnTab) {
    if (!t.showTotal) return
    let r = 0
    t.stats.forEach((x) => (r += +x.value))
    return ' - ' + r
  }

  [reuseComponentOnNavigationAndCallMeWhenNavigatingToIt]() {
    this.suspend = false

    this.refreshStats()
  }
  suspend = false;
  [leaveComponent]() {
    this.suspend = true
  }
  refresh() {
    this.refreshFamilyGrid()
  }

  static route: Route = {
    path: 'families',
    component: FamiliesComponent,
    canActivate: [FamilyAdminGuard]
  }
}

interface statsOnTab {
  name: string
  stats: FaimilyStatistics[]
  moreStats: FaimilyStatistics[]
  showTotal?: boolean
  rule: EntityFilter<Families>
  refreshStats?: (stats: statsOnTab) => Promise<void>
}
export async function saveFamiliesToExcel(
  gs: GridSettings<Families>,
  ui: UITools,
  name
) {
  await saveToExcel<Families, GridSettings<Families>>(
    await remult.context.getSettings(),
    remult.repo(Families),
    gs,
    name,
    ui,
    (f, c) => c == f.$.id || c == f.$.addressApiResult,
    (f, c) => false,
    async (f, addColumn) => {
      let x = f.addressHelper.getGeocodeInformation
      let street = f.address
      let house = ''
      let lastName = ''
      let firstName = ''
      if (f.name != undefined) lastName = f.name.trim()
      let i = lastName.lastIndexOf(' ')
      if (i >= 0) {
        firstName = lastName.substring(i, lastName.length).trim()
        lastName = lastName.substring(0, i).trim()
      }
      {
        try {
          for (const addressComponent of x.info.results[0].address_components) {
            switch (addressComponent.types[0]) {
              case 'route':
                street = addressComponent.short_name
                break
              case 'street_number':
                house = addressComponent.short_name
                break
            }
          }
        } catch {}
      }
      addColumn('X' + use.language.lastName, lastName, 's')
      addColumn('X' + use.language.firstName, firstName, 's')
      addColumn('X' + use.language.streetName, street, 's')
      addColumn('X' + use.language.houseNumber, house, 's')
      function fixPhone(p: Phone) {
        if (!p || !p.thePhone) return ''
        else return p.thePhone.replace(/\D/g, '')
      }
      addColumn('X' + use.language.phone1, fixPhone(f.phone1), 's')
      addColumn('X' + use.language.phone2, fixPhone(f.phone2), 's')
      addColumn('X' + use.language.phone3, fixPhone(f.phone3), 's')
      addColumn('X' + use.language.phone4, fixPhone(f.phone4), 's')
      addColumn('X' + use.language.phone1 + 'orig', f.phone1?.thePhone, 's')
      addColumn('X' + use.language.phone2 + 'orig', f.phone2?.thePhone, 's')
      addColumn('X' + use.language.phone3 + 'orig', f.phone3?.thePhone, 's')
      addColumn('X' + use.language.phone4 + 'orig', f.phone4?.thePhone, 's')
      await f.basketType?.addBasketTypes(f.quantity, addColumn)
    }
  )
}

function test(arr: any) {
  console.log(arr)
  return arr
}
const defaultSelfOrderMessage = `שלום !משפחה!,
אתם מוזמנים לבחור מה אתם רוצים במשלוח הבא, בלחיצה על הקישור:
!קישור!
בברכה
!ארגון!
`
