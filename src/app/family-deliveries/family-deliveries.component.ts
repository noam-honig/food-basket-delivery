import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { distCenterAdminGuard } from '../auth/guards';
import { Roles } from '../auth/roles';
import { Route } from '@angular/router';
import { Remult, EntityFilter } from 'remult';
import { DataControlInfo, DataControlSettings, GridSettings, InputField } from '@remult/angular/interfaces';
import { BusyService, openDialog, RouteHelperService } from '@remult/angular';
import { FamilyDeliveresStatistics, FamilyDeliveryStats, groupStats } from './family-deliveries-stats';
import { MatTabGroup } from '@angular/material/tabs';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt, leaveComponent } from '../custom-reuse-controller-router-strategy';

import * as chart from 'chart.js';
import { colors } from '../families/stats-action';
import { BasketType, quantityHelper } from '../families/BasketType';


import { FamilyDeliveries, ActiveFamilyDeliveries, MessageStatus } from '../families/FamilyDeliveries';
import { Families } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ArchiveDeliveries, DeleteDeliveries, NewDelivery, UpdateBasketType, UpdateCourier, UpdateDeliveriesStatus, UpdateDistributionCenter, UpdateFamilyDefaults, UpdateQuantity } from './family-deliveries-actions';


import { saveToExcel } from '../shared/saveToExcel';
import { ApplicationSettings, getCustomColumnVisible } from '../manage/ApplicationSettings';
import { use } from '../translate'


import { sortColumns } from '../shared/utils';
import { getLang } from '../sites/sites';

import { GroupsValue } from '../manage/groups';
import { UpdateAreaForDeliveries, updateGroupForDeliveries, UpdateStatusForDeliveries } from '../families/familyActions';
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver';
import { PrintVolunteersComponent } from '../print-volunteers/print-volunteers.component';
import { DeliveryImagesComponent } from '../delivery-images/delivery-images.component';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { PrintStickersComponent } from '../print-stickers/print-stickers.component';
import { PrintVolunteerComponent } from '../print-volunteer/print-volunteer.component';

import { getDeliveryGridButtons } from './getDeliveryGridButtons';
import { FamilyDeliveriesController } from './family-deliveries.controller';

@Component({
  selector: 'app-family-deliveries',
  templateUrl: './family-deliveries.component.html',
  styleUrls: ['./family-deliveries.component.scss']
})
export class FamilyDeliveriesComponent implements OnInit, OnDestroy {
  showChart = true;
  static route: Route = {
    path: 'deliveries',
    component: FamilyDeliveriesComponent,
    canActivate: [distCenterAdminGuard]
  }
  limit = 25;
  groupsColumn: DataControlSettings<ActiveFamilyDeliveries>;
  statusColumn: DataControlSettings<ActiveFamilyDeliveries>;
  normalColumns: DataControlInfo<ActiveFamilyDeliveries>[];
  deliverySummary: DataControlSettings<ActiveFamilyDeliveries>;
  currentStatFilter: FamilyDeliveresStatistics = undefined;
  searchString = '';
  async doSearch() {
    if (this.deliveries.currentRow && this.deliveries.currentRow._.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.refreshFamilyGrid());
  }
  async refreshFamilyGrid() {
    this.deliveries.page = 1;
    await this.deliveries.reloadData();
  }
  async newFamily() {
    let family = this.remult.repo(Families).create();
    family.name = this.searchString;
    this.dialog.updateFamilyDialog({
      family,
      onSave: async () => {
        await family.showNewDeliveryDialog(this.dialog, this.settings);
        this.refresh();
      }

    })
  }

  clearSearch() {
    this.searchString = '';
    this.doSearch();
  }
  stats = new FamilyDeliveryStats(this.remult);
  @ViewChild('myTab', { static: false }) myTab: MatTabGroup;
  basketStats: statsOnTabBasket = {
    name: getLang(this.remult).remainingByBaskets,
    rule: FamilyDeliveries.readyAndSelfPickup(),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  assignedButNotOutBaskets: statsOnTabBasket = {
    name: getLang(this.remult).assignedButNotOutBaskets,
    rule: {
      messageStatus: MessageStatus.notSent,
      $and: [FamilyDeliveries.onTheWayFilter()]
    },
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  selfPickupBaskets: statsOnTabBasket = {
    name: getLang(this.remult).selfPickupByBaskets,
    rule: { deliverStatus: DeliveryStatus.SelfPickup },
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };

  basketsInEvent: statsOnTabBasket = {
    name: getLang(this.remult).byBaskets,
    rule: {},
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  basketsDelivered: statsOnTabBasket = {
    name: getLang(this.remult).deliveredByBaskets,
    rule: { deliverStatus: DeliveryStatus.isSuccess() },
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };

  cityStats: statsOnTab = {
    name: getLang(this.remult).remainingByCities,
    showTotal: true,
    rule: FamilyDeliveries.readyFilter(),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };

  statTabs: statsOnTab[] = [
    {
      name: getLang(this.remult).deliveries,
      showTotal: true,
      rule: {},
      stats: [
        this.stats.enquireDetails,
        this.stats.waitForAdmin,
        this.stats.ready,
        this.stats.special,
        this.stats.selfPickup,
        this.stats.frozen,
        this.stats.onTheWay,
        this.stats.delivered,
        this.stats.problem

      ],
      moreStats: [],
      fourthColumn: () => this.deliverySummary
    },

    this.basketsInEvent,
    this.basketStats,
    this.assignedButNotOutBaskets,
    this.selfPickupBaskets,
    this.basketsDelivered,
    {
      name: getLang(this.remult).remainingByGroups,
      rule: FamilyDeliveries.readyFilter(),
      stats: [
        this.stats.ready,
        this.stats.special
      ],
      moreStats: [],
      fourthColumn: () => this.groupsColumn,
      refreshStats: async x => {
        let areas = await FamilyDeliveriesController.getGroups(this.dialog.distCenter, true);
        this.prepComplexStats(areas.map(g => ({ name: g.name, count: g.totalReady })),
          x,
          g => ({ groups: { $contains: g }, $and: [FamilyDeliveries.readyFilter()] }),
          g => ({ groups: { "!=": [new GroupsValue(g), new GroupsValue('')] }, $and: [FamilyDeliveries.readyFilter()] }));
      }
    },
    {
      name: getLang(this.remult).byGroups,
      rule: {},
      stats: [
        this.stats.ready,
        this.stats.special
      ],
      moreStats: [],
      fourthColumn: () => this.groupsColumn,
      refreshStats: async x => {
        let areas = await FamilyDeliveriesController.getGroups(this.dialog.distCenter);
        this.prepComplexStats(areas.map(g => ({ name: g.name, count: g.totalReady })),
          x,
          g => ({ groups: { $contains: g } }),
          g => ({ groups: { "!=": [new GroupsValue(g), new GroupsValue('')] } }));
      }
    },
    this.cityStats,
    {
      name: getLang(this.remult).requireFollowUp,
      showTotal: true,
      rule: { needsWork: true },
      stats: [
        this.stats.needWork
      ],
      moreStats: [],
      fourthColumn: () => this.deliverySummary
    }
  ]
  tabChanged() {
    this.currentStatFilter = undefined;
    this.searchString = '';
    let prevTabColumn = this.currentTabStats.fourthColumn();

    this.refreshFamilyGrid();
    this.updateChart();

    let cols = this.deliveries.columns;
    let currentTabColumn = this.currentTabStats.fourthColumn();
    if (prevTabColumn != currentTabColumn && prevTabColumn == cols.items[3]) {

      let origIndex = cols.items.indexOf(currentTabColumn);
      cols.moveCol(currentTabColumn, -origIndex + 3);
    }


  }
  clearStat() {
    this.currentStatFilter = undefined;
    this.searchString = '';
    this.refreshFamilyGrid();

  }
  currentTabStats: statsOnTab = { name: '', stats: [], moreStats: [], rule: undefined, fourthColumn: () => this.deliverySummary };
  previousTabStats: statsOnTab = this.currentTabStats;
  options: chart.ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: 'right',
      onClick: (event: MouseEvent, legendItem: any) => {
        this.setCurrentStat(this.pieChartStatObjects[legendItem.index]);
        return false;
      }
    },
  };
  public chartClicked(e: any): void {
    if (e.active && e.active.length > 0) {
      this.setCurrentStat(this.pieChartStatObjects[e.active[0]._index]);

    }
  }
  setCurrentStat(s: FamilyDeliveresStatistics) {
    this.currentStatFilter = s;
    this.searchString = '';
    this.refreshFamilyGrid();
  }
  public pieChartLabels: string[] = [];
  public pieChartData: number[] = [];
  pieChartStatObjects: FamilyDeliveresStatistics[] = [];
  public colors: Array<any> = [
    {
      backgroundColor: []

    }];

  public pieChartType: chart.ChartType = 'pie';
  async updateChart() {
    this.currentTabStats = this.statTabs[this.myTab.selectedIndex];
    if (this.currentTabStats.refreshStats)
      await this.currentTabStats.refreshStats(this.currentTabStats);
    this.pieChartData = [];
    this.pieChartStatObjects = [];
    this.pieChartLabels.splice(0);
    this.colors[0].backgroundColor.splice(0);
    let stats = this.currentTabStats.stats;

    stats.forEach(s => {
      if (s.value > 0) {
        this.pieChartLabels.push(s.name + ' ' + s.value);
        this.pieChartData.push(s.value);
        if (s.color != undefined)
          this.colors[0].backgroundColor.push(s.color);
        this.pieChartStatObjects.push(s);

      }
    });
    if (this.pieChartData.length == 0) {
      this.pieChartData.push(0);
      this.pieChartLabels.push(getLang(this.remult).empty);
    }
    if (this.colors[0].backgroundColor.length == 0) {
      this.colors[0].backgroundColor.push(colors.green, colors.blue, colors.yellow, colors.red, colors.orange, colors.gray);
    }
  }
  statTotal(t: statsOnTab) {
    if (!t.showTotal)
      return;
    let r = 0;
    t.stats.forEach(x => r += +x.value);
    return " - " + r;
  }

  [reuseComponentOnNavigationAndCallMeWhenNavigatingToIt]() {
    this.suspend = false;

    this.refresh();
  }
  suspend = false;
  [leaveComponent]() {

    this.suspend = true;
  }
  refresh() {
    if (this.suspend)
      return;
    this.refreshFamilyGrid();
    this.refreshStats();
  }

  isAdmin = this.remult.isAllowed(Roles.admin);
  canAdd = this.remult.isAllowed(Roles.familyAdmin);
  refreshStats() {
    if (this.suspend)
      return;

    this.busy.donotWait(async () => this.stats.getData(this.dialog.distCenter).then(st => {
      this.basketStats.stats.splice(0);
      this.cityStats.stats.splice(0);
      this.cityStats.moreStats.splice(0);



      this.basketStatsCalc(st.baskets, this.basketStats, b => b.unassignedDeliveries,
        id => ({
          basketType: id, $and: [
            FamilyDeliveries.readyFilter()
          ]
        }));
      this.basketStatsCalc(st.baskets, this.basketsInEvent, b => b.inEventDeliveries, id => ({ basketType: id }));
      this.basketStatsCalc(st.baskets, this.assignedButNotOutBaskets, b => b.smsNotSent,
        id => ({
          basketType: id,
          $and: [this.assignedButNotOutBaskets.rule]
        }));
      this.basketStatsCalc(st.baskets, this.selfPickupBaskets, b => b.selfPickup,
        id => ({
          basketType: id,
          $and: [this.selfPickupBaskets.rule]
        }));
      this.basketStatsCalc(st.baskets, this.basketsDelivered, b => b.successDeliveries,
        id => ({
          basketType: id,
          deliverStatus: DeliveryStatus.isSuccess()
        }));
      this.prepComplexStats(st.cities, this.cityStats,
        c => ({ $and: [FamilyDeliveries.readyFilter()], city: c }),
        c => ({ $and: [FamilyDeliveries.readyFilter()], city: { "!=": c } }));

      this.updateChart();
    }));
  }
  private basketStatsCalc<T extends { boxes: number, boxes2: number, name: string, basket: BasketType }>(baskets: T[], stats: statsOnTabBasket, getCount: (x: T) => number, equalToFilter: (id: BasketType) => EntityFilter<FamilyDeliveries>) {
    stats.stats.splice(0);
    stats.totalBoxes1 = 0;

    stats.totalBoxes2 = 0;
    let toTake = new quantityHelper();

    baskets.forEach(b => {
      let fs = new FamilyDeliveresStatistics(b.name, equalToFilter(b.basket),
        undefined);
      fs.value = getCount(b);
      stats.stats.push(fs);
      stats.totalBoxes1 += +b.boxes * +fs.value;
      stats.totalBoxes2 += +b.boxes2 * +fs.value;
      if (fs.value > 0)
        toTake.parseComment(b?.basket?.whatToTake, fs.value);

    });
    stats.toBrind = toTake.toString(", ");
    stats.stats.sort((a, b) => b.value - a.value);
  }

  private prepComplexStats<type extends { name: string, count: number }>(
    cities: type[],
    stats: statsOnTab,
    equalToFilter: (item: string) => EntityFilter<FamilyDeliveries>,
    differentFromFilter: (item: string) => EntityFilter<FamilyDeliveries>
  ) {
    stats.stats.splice(0);
    stats.moreStats.splice(0);
    let i = 0;
    let lastFs: FamilyDeliveresStatistics;
    let firstCities = [];
    cities.sort((a, b) => b.count - a.count);
    cities.forEach(b => {
      if (b.count == 0)
        return;
      let fs = new FamilyDeliveresStatistics(b.name, equalToFilter(b.name), undefined);
      fs.value = +b.count;
      i++;
      if (i <= 8) {
        stats.stats.push(fs);
        firstCities.push(b.name);
      }
      if (i > 8) {
        if (!lastFs) {
          let x = stats.stats.pop();
          firstCities.pop();
          let r: EntityFilter<FamilyDeliveries> = { $and: [differentFromFilter(firstCities[0])] };
          for (let index = 1; index < firstCities.length; index++) {
            r.$and.push(differentFromFilter(firstCities[index]));
          }

          lastFs = new FamilyDeliveresStatistics(getLang(this.remult).allOthers, r, undefined);
          stats.moreStats.push(x);
          lastFs.value = x.value;
          stats.stats.push(lastFs);
        }
      }
      if (i > 8) {
        lastFs.value += fs.value;
        stats.moreStats.push(fs);
      }
    });
    stats.moreStats.sort((a, b) => a.name.localeCompare(b.name));
  }
  getToTake() {
    let x: statsOnTabBasket = this.currentTabStats;
    return x.toBrind;
  }
  showTotalBoxes() {
    let x: statsOnTabBasket = this.currentTabStats;
    if (x && (x.totalBoxes1 + x.totalBoxes2)) {
      let r = getLang(this.remult).total + ' ' + BasketType.boxes1Name + ': ' + x.totalBoxes1;

      if (x.totalBoxes2)
        r += ', ' + getLang(this.remult).total + ' ' + BasketType.boxes2Name + ': ' + x.totalBoxes2;

      return r;
    }
    return undefined;
  }
  constructor(
    private remult: Remult,
    public dialog: DialogService,
    private busy: BusyService,
    public settings: ApplicationSettings,
    public route: RouteHelperService
  ) {

    if (!settings.usingSelfPickupModule)
      this.statTabs.splice(this.statTabs.indexOf(this.selfPickupBaskets), 1);
    dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);
    dialog.onStatusChange(() => this.refreshStats(), this.destroyHelper);
  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }

  deliveries: GridSettings<ActiveFamilyDeliveries> = new GridSettings(this.remult.repo(ActiveFamilyDeliveries), {
    allowUpdate: true,
    rowCssClass: f => f.getCss(),
    numOfColumnsInGrid: 5,

    knowTotalRows: true,

    rowsInPage: this.limit,
    where: () => {
      let index = 0;
      let result: EntityFilter<FamilyDeliveries>[] = [{
        name: { $contains: this.searchString },
        distributionCenter: this.dialog.filterDistCenter()
      }];

      if (this.currentStatFilter) {
        result.push(this.currentStatFilter.rule);
      } else {
        if (this.myTab)
          index = this.myTab.selectedIndex;
        if (index < 0 || index == undefined)
          index = 0;
        result.push(this.statTabs[index].rule);
      }
      return { $and: result };
    }
    , orderBy: { name: "asc" }
    ,
    columnSettings: deliveries => {
      let r: DataControlInfo<ActiveFamilyDeliveries>[] = [

        {
          field: deliveries.name,
          width: '200'
        },
        {
          field: deliveries.address,
          width: '250',
          cssClass: f => {
            if (!f.addressOk)
              return 'addressProblem';
            return '';
          }
        },
        {
          field: deliveries.basketType,
          cssClass: f => {
            if (f.isLargeQuantity())
              return 'largeDelivery';
            return '';
          }
        },
        {
          field: deliveries.quantity,
          width: '50',
          cssClass: f => {
            if (f.isLargeQuantity())
              return 'largeDelivery';
            return '';
          }
        },

        this.deliverySummary = {
          caption: getLang(this.remult).deliverySummary,
          field: deliveries.deliverStatus,
          readonly: true,
          valueList: async (c) => DeliveryStatus.getOptions(c)
          ,
          getValue: f => f.getDeliveryDescription(),
          width: '300'
        },
        { field: deliveries.createDate, width: '150' },
        {
          field: deliveries.distributionCenter,
          cssClass: f => {
            if (f.isDistCenterInactive())
              return 'addressProblem'
            else
              return '';
          }
        },
        this.statusColumn = { field: deliveries.deliverStatus },



        this.groupsColumn = { field: deliveries.groups },


        deliveries.deliveryComments,


        deliveries.special,
        deliveries.createUser,

        deliveries.familySource,

        { field: deliveries.addressOk, width: '110' },
        deliveries.floor,
        deliveries.appartment,
        deliveries.entrance,
        { field: deliveries.buildingCode, width: '50' },
        { field: deliveries.addressComment },
        { field: deliveries.city, width: '100' },
        deliveries.area,
        deliveries.phone1,
        deliveries.phone1Description,
        deliveries.phone2,
        deliveries.phone2Description,
        deliveries.phone3,
        deliveries.phone3Description,
        deliveries.phone4,
        deliveries.phone4Description,
        { field: deliveries.courier, width: (this.settings.isSytemForMlt ? '300' : '100') },

        deliveries.courierAssignUser,
        { field: deliveries.courierAssingTime, width: '150' },
        { field: deliveries.deliveryStatusUser, width: '100' },
        deliveries.deliveryStatusDate,
        { field: deliveries.courierComments, width: '300' },
        { field: deliveries.internalDeliveryComment, width: '400' },
        deliveries.needsWork,
        deliveries.needsWorkDate,
        deliveries.needsWorkUser,
        deliveries.fixedCourier,
        deliveries.familyMembers,
        { field: deliveries.messageStatus, width: '130' },
        deliveries.receptionComments,
        deliveries.numOfPhotos,
        deliveries.caller,
        deliveries.callerComment,
        deliveries.callerAssignDate,
        deliveries.lastCallDate
      ];
      for (const c of [deliveries.a1, deliveries.a2, deliveries.a3, deliveries.a4]) {
        if (getCustomColumnVisible(c)) {
          r.push(c);
        }
      }

      this.normalColumns = [
        deliveries.name
      ]
      if (this.settings.isSytemForMlt) {
        this.normalColumns.push(
          deliveries.city,
          //deliveries.distributionCenter,
          //deliveries.basketType,
          deliveries.deliverStatus,
          deliveries.quantity,
          deliveries.createDate,
          deliveries.courier,
          //          deliveries.internalDeliveryComment,
          //          deliveries.messageStatus,
          deliveries.courierComments,
          //deliveries.receptionComments
        );
      } else {
        this.normalColumns.push(
          deliveries.address,
          deliveries.basketType,
          deliveries.quantity,
          this.deliverySummary
        );
      }

      return r;
    },
    allowSelection: true,
    gridButtons: [
      {
        textInMenu: () => use.language.refresh,
        icon: 'refresh',
        click: () => this.refresh()
      },
      {
        textInMenu: () => this.showChart ? use.language.hidePie : use.language.showPie,
        icon: 'unfold_less',
        click: () => this.showChart = !this.showChart
      },
      ...[
        new NewDelivery(this.remult),
        new ArchiveDeliveries(this.remult),
        new DeleteDeliveries(this.remult),
        new UpdateDeliveriesStatus(this.remult),
        new UpdateBasketType(this.remult),
        new UpdateQuantity(this.remult),
        new UpdateDistributionCenter(this.remult),
        new UpdateCourier(this.remult),
        new UpdateFamilyDefaults(this.remult),
        new updateGroupForDeliveries(this.remult),
        new UpdateAreaForDeliveries(this.remult),
        new UpdateStatusForDeliveries(this.remult)
      ].map(a => a.gridButton({
        afterAction: async () => await this.refresh(),
        ui: this.dialog,
        userWhere: async () => (await this.deliveries.getFilterWithSelectedRows()).where,
        settings: this.settings
      })),
      {
        name: getLang(this.remult).printVolunteers,
        visible: () => this.remult.isAllowed(Roles.admin),
        click: async () => {
          this.route.navigateToComponent(PrintVolunteersComponent)
        }
      },
      {
        name: getLang(this.remult).printStickers,
        visible: () => this.remult.isAllowed(Roles.admin),
        click: async () => {
          this.route.navigateToComponent(PrintStickersComponent)
        }
      },
      {
        name: getLang(this.remult).printVolunteerPage,
        visible: () => this.remult.isAllowed(Roles.admin),
        click: async () => {
          this.route.navigateToComponent(PrintVolunteerComponent)
        }
      },
      {
        name: getLang(this.remult).whatToOrder,
        click: async () => {
          let items = new quantityHelper();
          let parcels = new quantityHelper();

          for await (const fd of this.remult.repo(ActiveFamilyDeliveries).query()) {
            parcels.add(fd.basketType?.name || '', fd.quantity);
            for (let item of fd.deliveryComments.split(',')) {
              item = item.trim();
              let reg = /(^\d*)(.*)/.exec(item);
              if (reg[1])
                items.add(reg[2], +reg[1])
              else items.add(reg[2], 1);
            }
          }
          const field = new InputField<string>({
            customInput: c => c.textArea(), caption: this.remult.state.lang.whatToOrder,
            defaultValue: () => items.toString() + "\n---------------\n" + parcels.toString()
          });
          this.dialog.inputAreaDialog({
            fields: [field],
            ok: () => { },
          });
        }
      },
      {
        name: getLang(this.remult).exportToExcel,
        click: async () => {

          let includeFamilyInfo = await this.dialog.YesNoPromise(this.settings.lang.includeFamilyInfoInExcelFile);
          await saveToExcel(this.settings, this.remult.repo(ActiveFamilyDeliveries), this.deliveries, getLang(this.remult).deliveries, this.dialog, (d: ActiveFamilyDeliveries, c) => c == d.$.id || c == d.$.family, undefined,
            async (fd, addColumn) => {
              await fd.basketType?.addBasketTypes(fd.quantity, addColumn);
              fd.addStatusExcelColumn(addColumn);
              if (includeFamilyInfo)
                await fd.addFamilyInfoToExcelFile(addColumn);

            }, async deliveries => {
              if (includeFamilyInfo) {
                await FamilyDeliveries.loadFamilyInfoForExcepExport(this.remult, deliveries);
              }
            });
        }
        , visible: () => this.remult.isAllowed(Roles.admin)
      }

    ]
    ,
    rowButtons: [
      {
        name: '',
        icon: 'edit',
        showInLine: true,
        click: async fd => {
          fd.showDetailsDialog({
            refreshDeliveryStats: () => this.refreshStats(),
            reloadDeliveries: () => this.deliveries.reloadData(),
            ui: this.dialog
          });
        }
        , textInMenu: () => getLang(this.remult).deliveryDetails
      },
      {
        name: '',
        icon: 'photo_camera',

        click: async fd => {
          openDialog(DeliveryImagesComponent, x => x.args = fd);
        }
        , textInMenu: () => getLang(this.remult).photos_taken_by_volunteer,
        visible: fd => fd.numOfPhotos > 0
      },
      {
        icon: 'info',
        textInMenu: () => use.language.infoAboutUpdates,
        click: async (fd) => {

          openDialog(InputAreaComponent, x => x.args = {
            title: use.language.infoAboutUpdates + " " + use.language.for + " " + fd.name,
            ok: () => { },
            fields: [
              [fd.$.deliveryStatusUser,
              fd.$.deliveryStatusDate],
              [fd.$.courierAssignUser,
              fd.$.courierAssingTime],
              [fd.$.createUser,
              fd.$.createDate],
            ]
          });
        }
      },
      ...getDeliveryGridButtons({
        remult: this.remult,
        deliveries: () => this.deliveries,
        ui: this.dialog,
        refresh: () => this.refresh(),
        settings: this.settings,
        showAllBeforeNew: this.settings.isSytemForMlt
      })
    ]
  });


  ngOnInit() {
    this.refreshStats();
    this.deliveries.columns.numOfColumnsInGrid = this.normalColumns.length;
    sortColumns(this.deliveries, this.normalColumns);
    new columnOrderAndWidthSaver(this.deliveries).load('active-deliveries-component');
  }
}

interface statsOnTabBasket extends statsOnTab {
  totalBoxes1?: number;
  totalBoxes2?: number;
  toBrind?: string;
}
interface statsOnTab {
  name: string,
  stats: FamilyDeliveresStatistics[],
  moreStats: FamilyDeliveresStatistics[],
  showTotal?: boolean,
  rule: EntityFilter<ActiveFamilyDeliveries>,
  fourthColumn: () => DataControlSettings,
  refreshStats?: (stats: statsOnTab) => Promise<void>
}




interface totalItem {
  name: string,
  quantity: number
}