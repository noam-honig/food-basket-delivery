import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { distCenterAdminGuard, Roles } from '../auth/roles';
import { Route } from '@angular/router';
import { Remult, Filter, AndFilter, BackendMethod, SqlDatabase, FilterFactories } from 'remult';
import { BusyService, DataControlInfo, DataControlSettings, GridSettings, openDialog, RouteHelperService, RowButton } from '@remult/angular';
import { FamilyDeliveresStatistics, FamilyDeliveryStats, groupStats } from './family-deliveries-stats';
import { MatTabGroup } from '@angular/material/tabs';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt, leaveComponent } from '../custom-reuse-controller-router-strategy';

import * as chart from 'chart.js';
import { colors } from '../families/stats-action';
import { BasketType } from '../families/BasketType';


import { FamilyDeliveries, ActiveFamilyDeliveries, MessageStatus } from '../families/FamilyDeliveries';
import { canSendWhatsapp, Families, sendWhatsappToFamily } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ArchiveDeliveries, DeleteDeliveries, NewDelivery, UpdateBasketType, UpdateCourier, UpdateDeliveriesStatus, UpdateDistributionCenter, UpdateFamilyDefaults, UpdateQuantity } from './family-deliveries-actions';


import { saveToExcel } from '../shared/saveToExcel';
import { ApplicationSettings, getCustomColumnVisible } from '../manage/ApplicationSettings';
import { TranslationOptions, use } from '../translate'
import { Helpers } from '../helpers/helpers';

import { sortColumns } from '../shared/utils';
import { getLang } from '../sites/sites';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { Groups, GroupsValue } from '../manage/groups';
import { UpdateAreaForDeliveries, updateGroupForDeliveries, UpdateStatusForDeliveries } from '../families/familyActions';
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver';
import { PrintVolunteersComponent } from '../print-volunteers/print-volunteers.component';
import { DistributionCenters } from '../manage/distribution-centers';
import { SelectHelperComponent } from '../select-helper/select-helper.component';
import { DeliveryImagesComponent } from '../delivery-images/delivery-images.component';

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
    if (this.deliveries.currentRow && this.deliveries.currentRow.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.refreshFamilyGrid());
  }
  async refreshFamilyGrid() {
    this.deliveries.page = 1;
    await this.deliveries.reloadData();
  }
  async newFamily() {
    let f = this.remult.repo(Families).create();
    f.name = this.searchString;
    f.showFamilyDialog({
      onSave: async () => {
        await f.showNewDeliveryDialog(this.dialog, this.settings, this.busy);
        this.refresh();
      }
    });


  }

  clearSearch() {
    this.searchString = '';
    this.doSearch();
  }
  stats = new FamilyDeliveryStats(this.remult);
  @ViewChild('myTab', { static: false }) myTab: MatTabGroup;
  basketStats: statsOnTabBasket = {
    name: getLang(this.remult).remainingByBaskets,
    rule: f => FamilyDeliveries.readyAndSelfPickup(f),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  assignedButNotOutBaskets: statsOnTabBasket = {
    name: getLang(this.remult).assignedButNotOutBaskets,
    rule: f => FamilyDeliveries.onTheWayFilter().and(f.messageStatus.isEqualTo(MessageStatus.notSent)),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  selfPickupBaskets: statsOnTabBasket = {
    name: getLang(this.remult).selfPickupByBaskets,
    rule: f => f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };

  basketsInEvent: statsOnTabBasket = {
    name: getLang(this.remult).byBaskets,
    rule: f => undefined,
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  basketsDelivered: statsOnTabBasket = {
    name: getLang(this.remult).deliveredByBaskets,
    rule: f => DeliveryStatus.isSuccess(f.deliverStatus),
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
    rule: f => FamilyDeliveries.readyFilter(),
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
      rule: f => undefined,
      stats: [
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
      rule: f => FamilyDeliveries.readyFilter(),
      stats: [
        this.stats.ready,
        this.stats.special
      ],
      moreStats: [],
      fourthColumn: () => this.groupsColumn,
      refreshStats: async x => {
        let areas = await FamilyDeliveriesComponent.getGroups(this.dialog.distCenter, true);
        this.prepComplexStats(areas.map(g => ({ name: g.name, count: g.totalReady })),
          x,
          (f, g) => f.groups.contains(g).and(FamilyDeliveries.readyFilter()),
          (f, g) => f.groups.isDifferentFrom(new GroupsValue(g)).and(f.groups.isDifferentFrom(new GroupsValue(''))).and(FamilyDeliveries.readyFilter()));
      }
    },
    {
      name: getLang(this.remult).byGroups,
      rule: f => undefined,
      stats: [
        this.stats.ready,
        this.stats.special
      ],
      moreStats: [],
      fourthColumn: () => this.groupsColumn,
      refreshStats: async x => {
        let areas = await FamilyDeliveriesComponent.getGroups(this.dialog.distCenter);
        this.prepComplexStats(areas.map(g => ({ name: g.name, count: g.totalReady })),
          x,
          (f, g) => f.groups.contains(g),
          (f, g) => f.groups.isDifferentFrom(new GroupsValue(g)).and(f.groups.isDifferentFrom(new GroupsValue(''))));
      }
    },
    this.cityStats,
    {
      name: getLang(this.remult).requireFollowUp,
      showTotal: true,
      rule: f => f.needsWork.isEqualTo(true),
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
  refreshStats() {
    if (this.suspend)
      return;

    this.busy.donotWait(async () => this.stats.getData(this.dialog.distCenter).then(st => {
      this.basketStats.stats.splice(0);
      this.cityStats.stats.splice(0);
      this.cityStats.moreStats.splice(0);



      this.basketStatsCalc(st.baskets, this.basketStats, b => b.unassignedDeliveries, (f, id) =>
        FamilyDeliveries.readyFilter().and(f.basketType.isEqualTo(id)));
      this.basketStatsCalc(st.baskets, this.basketsInEvent, b => b.inEventDeliveries, (f, id) =>
        f.basketType.isEqualTo(id));
      this.basketStatsCalc(st.baskets, this.assignedButNotOutBaskets, b => b.smsNotSent, (f, id) =>
        f.basketType.isEqualTo(id).and(this.assignedButNotOutBaskets.rule(f)));
      this.basketStatsCalc(st.baskets, this.selfPickupBaskets, b => b.selfPickup, (f, id) =>
        f.basketType.isEqualTo(id).and(this.selfPickupBaskets.rule(f)));
      this.basketStatsCalc(st.baskets, this.basketsDelivered, b => b.successDeliveries, (f, id) =>
        DeliveryStatus.isSuccess(f.deliverStatus).and(f.basketType.isEqualTo(id)));
      this.prepComplexStats(st.cities, this.cityStats,
        (f, c) => FamilyDeliveries.readyFilter().and(f.city.isEqualTo(c)),
        (f, c) => FamilyDeliveries.readyFilter().and(f.city.isDifferentFrom(c)));

      this.updateChart();
    }));
  }
  private basketStatsCalc<T extends { boxes: number, boxes2: number, name: string, basket: BasketType }>(baskets: T[], stats: statsOnTabBasket, getCount: (x: T) => number, equalToFilter: (f: FilterFactories<ActiveFamilyDeliveries>, id: BasketType) => Filter) {
    stats.stats.splice(0);
    stats.totalBoxes1 = 0;

    stats.totalBoxes2 = 0;

    baskets.forEach(b => {
      let fs = new FamilyDeliveresStatistics(b.name, f => equalToFilter(f, b.basket),
        undefined);
      fs.value = getCount(b);
      stats.stats.push(fs);
      stats.totalBoxes1 += +b.boxes * +fs.value;
      stats.totalBoxes2 += +b.boxes2 * +fs.value;

    });
    stats.stats.sort((a, b) => b.value - a.value);
  }

  private prepComplexStats<type extends { name: string, count: number }>(
    cities: type[],
    stats: statsOnTab,
    equalToFilter: (f: FilterFactories<ActiveFamilyDeliveries>, item: string) => Filter,
    differentFromFilter: (f: FilterFactories<ActiveFamilyDeliveries>, item: string) => Filter
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
      let fs = new FamilyDeliveresStatistics(b.name, f => equalToFilter(f, b.name), undefined);
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
          lastFs = new FamilyDeliveresStatistics(getLang(this.remult).allOthers, f => {
            let r = differentFromFilter(f, firstCities[0]);
            for (let index = 1; index < firstCities.length; index++) {
              r = r.and(differentFromFilter(f, firstCities[index]));
            }
            return r;
          }, undefined);
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
    rowCssClass: f => f.deliverStatus.getCss(),
    numOfColumnsInGrid: 5,

    knowTotalRows: true,

    rowsInPage: this.limit,
    where: f => {
      let index = 0;
      let result: Filter = undefined;
      let addFilter = (filter: Filter) => {
        if (result)
          result = new AndFilter(result, filter);
        else result = filter;
      }

      if (this.currentStatFilter) {
        addFilter(this.currentStatFilter.rule(f));
      } else {
        if (this.myTab)
          index = this.myTab.selectedIndex;
        if (index < 0 || index == undefined)
          index = 0;

        addFilter(this.statTabs[index].rule(f));
      }
      if (this.searchString) {
        addFilter(f.name.contains(this.searchString));
      }

      addFilter(this.dialog.filterDistCenter(f.distributionCenter));
      return result;
    }
    , orderBy: f => f.name
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
        { field: deliveries.courier, width: (this.settings.isSytemForMlt() ? '300' : '100') },

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
        deliveries.numOfPhotos
      ];
      for (const c of [deliveries.a1, deliveries.a2, deliveries.a3, deliveries.a4]) {
        if (getCustomColumnVisible(c)) {
          r.push(c);
        }
      }

      this.normalColumns = [
        deliveries.name
      ]
      if (this.settings.isSytemForMlt()) {
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
        dialog: this.dialog,
        userWhere: (x) => Filter.toItem(this.deliveries.getFilterWithSelectedRows().where)(x),
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
        name: getLang(this.remult).exportToExcel,
        click: async () => {

          let includeFamilyInfo = await this.dialog.YesNoPromise(this.settings.lang.includeFamilyInfoInExcelFile);
          await saveToExcel(this.settings, this.remult.repo(ActiveFamilyDeliveries), this.deliveries, getLang(this.remult).deliveries, this.busy, (d: ActiveFamilyDeliveries, c) => c == d.$.id || c == d.$.family, undefined,
            async (fd, addColumn) => {
              await fd.basketType?.addBasketTypes(fd.quantity, addColumn);
              fd.addStatusExcelColumn(addColumn);
              if (includeFamilyInfo)
                await fd.addFamilyInfoToExcelFile(addColumn);

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
            dialog: this.dialog
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
      ...getDeliveryGridButtons({
        remult: this.remult,
        deliveries: () => this.deliveries,
        dialog: this.dialog,
        refresh: () => this.refresh(),
        settings: this.settings,
        busy: this.busy,
        showAllBeforeNew: this.settings.isSytemForMlt()
      })
    ]
  });

  @BackendMethod({ allowed: Roles.distCenterAdmin })
  static async getGroups(dist: DistributionCenters, readyOnly = false, remult?: Remult) {
    let pendingStats = [];
    let result: groupStats[] = [];
    await remult.repo(Groups).find({
      limit: 1000,
      orderBy: f => f.name
    }).then(groups => {
      for (const g of groups) {
        let x: groupStats = {
          name: g.name,
          totalReady: 0
        };
        result.push(x);
        pendingStats.push(remult.repo(ActiveFamilyDeliveries).count(f => {
          let r = f.groups.contains(x.name).and(
            remult.filterDistCenter(f.distributionCenter, dist));
          if (readyOnly)
            return r.and(FamilyDeliveries.readyFilter());
          return r;
        }).then(r => x.totalReady = r));

      }
    });
    await Promise.all(pendingStats);
    return result;
  }
  @BackendMethod({ allowed: Roles.lab })
  static async getDeliveriesByPhone(phoneNumIn: string, remult?: Remult, db?: SqlDatabase) {
    let phoneNum = new Phone(phoneNumIn);
    let sql1 = new SqlBuilder(remult);

    let fd = SqlFor(remult.repo(FamilyDeliveries));
    let result: string[] = [];
    let courier = await (await remult.repo(Helpers).findFirst(i => i.phone.isEqualTo(phoneNum)));

    for (const d of (await db.execute(await sql1.query({
      from: fd,
      where: () => [
        (courier != undefined ? fd.courier.isEqualTo(courier).and(FamilyDeliveries.active(fd)) :
          sql1.or(
            fd.phone1.isEqualTo(phoneNum).and(FamilyDeliveries.active(fd)),
            fd.phone2.isEqualTo(phoneNum).and(FamilyDeliveries.active(fd)),
            fd.phone3.isEqualTo(phoneNum).and(FamilyDeliveries.active(fd)),
            fd.phone4.isEqualTo(phoneNum).and(FamilyDeliveries.active(fd)))
        )
      ],
      select: () => [
        sql1.columnWithAlias(fd.id, "id"),
      ],
    }))).rows) {
      result.push(d.id)
    }

    return await (await remult.repo(FamilyDeliveries).find({ where: fd => fd.id.isIn(result) })).map(x => x._.toApiJson());
  }



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
}
interface statsOnTab {
  name: string,
  stats: FamilyDeliveresStatistics[],
  moreStats: FamilyDeliveresStatistics[],
  showTotal?: boolean,
  rule: (f: FilterFactories<ActiveFamilyDeliveries>) => Filter,
  fourthColumn: () => DataControlSettings,
  refreshStats?: (stats: statsOnTab) => Promise<void>
}

export interface deliveryButtonsHelper {
  remult: Remult,
  dialog: DialogService,
  busy: BusyService,
  settings: ApplicationSettings,
  refresh: () => void,
  deliveries: () => GridSettings<FamilyDeliveries>,
  showAllBeforeNew?: boolean
}
export function getDeliveryGridButtons(args: deliveryButtonsHelper): RowButton<ActiveFamilyDeliveries>[] {
  let newDelivery: (d: FamilyDeliveries) => void = async d => {
    let f = await args.remult.repo(Families).findId(d.family);

    if (args.showAllBeforeNew) {
      f.showDeliveryHistoryDialog({
        settings: args.settings,
        dialog: args.dialog,
        busy: args.busy
      });
      return;
    }

    await f.showNewDeliveryDialog(args.dialog, args.settings, args.busy, {
      copyFrom: d, aDeliveryWasAdded: async (newDeliveryId) => {
        if (args.settings.isSytemForMlt()) {
          if (d.deliverStatus.isProblem) {
            let newDelivery = await args.remult.repo(ActiveFamilyDeliveries).findId(newDeliveryId);
            for (const otherFailedDelivery of await args.remult.repo(ActiveFamilyDeliveries).find({
              where: fd => fd.family.isEqualTo(newDelivery.family).and(DeliveryStatus.isProblem(fd.deliverStatus))
            })) {
              await Families.addDelivery(otherFailedDelivery.family, otherFailedDelivery.basketType, otherFailedDelivery.distributionCenter, otherFailedDelivery.courier, {
                quantity: otherFailedDelivery.quantity,
                selfPickup: false,
                comment: otherFailedDelivery.deliveryComments
              });
              otherFailedDelivery.archive = true;
              await otherFailedDelivery.save();
            }
          }
        }
        args.refresh();
      }
    });
  };
  return [
    {
      name: getLang(args.remult).newDelivery,
      icon: 'add_shopping_cart',
      click: async d => {
        newDelivery(d)
      },
      visible: d => args.remult.isAllowed(Roles.admin) && !d.deliverStatus.IsAResultStatus()
    },
    {
      textInMenu: () => getLang(args.remult).newDelivery,
      icon: 'add_shopping_cart',
      showInLine: true,
      click: async d => {
        newDelivery(d)
      },
      visible: d => args.remult.isAllowed(Roles.admin) && d.deliverStatus.IsAResultStatus()
    },
    {
      name: getLang(args.remult).sendWhatsAppToFamily,
      click: f => sendWhatsappToFamily(f, args.remult),
      visible: f => canSendWhatsapp(f),
      icon: 'textsms'
    },
    {
      textInMenu: () => getLang(args.remult).assignVolunteer,
      icon: 'person_search',
      showInLine: true,
      click: async d => {
        await openDialog(SelectHelperComponent, x => x.args = {
          onSelect: async selectedHelper => {
            d.courier = selectedHelper;
            await d.save();
            var fd = await args.remult.repo(ActiveFamilyDeliveries).find({
              where: fd => {
                let f = fd.id.isDifferentFrom(d.id).and(
                  FamilyDeliveries.readyFilter()).and(
                    args.dialog.filterDistCenter(fd.distributionCenter));
                if (d.addressOk)
                  return f.and(fd.addressLongitude.isEqualTo(d.addressLongitude).and(fd.addressLatitude.isEqualTo(d.addressLatitude)));
                else
                  return f.and(fd.family.isEqualTo(d.family).and(f));
              }
            });
            if (fd.length > 0) {
              if (await args.dialog.YesNoPromise(args.settings.lang.thereAreAdditional + " " + fd.length + " " + args.settings.lang.deliveriesAtSameAddress)) {
                for (const f of fd) {
                  f.courier = d.courier;
                  await f.save();
                }
                args.refresh();
              }
            }
          }, location: d.getDrivingLocation()
        });
      },
      visible: d => !d.deliverStatus.IsAResultStatus() && args.remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.remult).volunteerAssignments,
      icon: 'list_alt',
      showInLine: true,
      click: async d => {

        await openDialog(
          (await import('../helper-assignment/helper-assignment.component')).HelperAssignmentComponent, s => s.argsHelper = d.courier);
        args.refresh();



      },
      visible: d => d.courier && args.remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.remult).volunteerInfo,


      click: async d => {
        let h = await d.courier.getHelper();
        h.displayEditDialog(args.dialog, args.busy);



      },
      visible: d => d.courier && args.remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.remult).cancelAsignment,
      showInLine: true,
      icon: 'person_add_disabled',
      click: async d => {
        if (await args.dialog.YesNoPromise(getLang(args.remult).cancelAssignmentFor + d.name)) {
          {
            d.courier = null;
            await d.save();
          }
        }
      },
      visible: d => d.deliverStatus == DeliveryStatus.ReadyForDelivery && d.courier
    },
    {
      name: getLang(args.remult).familyDeliveries,
      click: async fd => {
        let f = await args.remult.repo(Families).findId(fd.family);
        f.showDeliveryHistoryDialog({
          settings: args.settings,
          dialog: args.dialog,
          busy: args.busy
        });
      }
      , visible: f => !f.isNew()
    },
    {
      name: getLang(args.remult).freezeDelivery,
      click: async d => {
        if (await args.dialog.YesNoPromise(getLang(args.remult).freezeDeliveryHelp + d.name + "?")) {
          {
            d.deliverStatus = DeliveryStatus.Frozen;
            await d.save();
          }
        }
      },
      visible: d => d.deliverStatus == DeliveryStatus.ReadyForDelivery && d.courier
    },
    {
      name: getLang(args.remult).unFreezeDelivery,
      click: async d => {
        {
          d.deliverStatus = DeliveryStatus.ReadyForDelivery;
          await d.save();
        }
      },
      visible: d => d.deliverStatus == DeliveryStatus.Frozen
    },
    {
      name: getLang(args.remult).deleteDelivery,
      click: async d => {
        if (await args.dialog.YesNoPromise(getLang(args.remult).shouldDeleteDeliveryFor + d.name)) {
          {
            let fd = await args.remult.repo(FamilyDeliveries).findFirst(fd => fd.id.isEqualTo(d.id));
            await fd.delete();
            args.deliveries().items.splice(args.deliveries().items.indexOf(d), 1);
          }
        }
      },
      visible: d => !(d.deliverStatus.IsAResultStatus()) && args.remult.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.remult).archiveDelivery,
      showInLine: true,
      icon: 'archive',
      click: async d => {
        if (await args.dialog.YesNoPromise(getLang(args.remult).shouldArchiveDelivery)) {
          {
            let fd = await args.remult.repo(FamilyDeliveries).findFirst(fd => fd.id.isEqualTo(d.id));
            fd.archive = true;
            await fd.save();
            args.deliveries().items.splice(args.deliveries().items.indexOf(d), 1);
          }
        }
      }, visible: d => !d.archive && (d.deliverStatus.IsAResultStatus()) && args.remult.isAllowed(Roles.distCenterAdmin)

    },
    {
      textInMenu: () => getLang(args.remult).sendWhatsAppToFamily,
      click: async d => {
        d.phone1.sendWhatsapp(args.remult, getLang(args.remult).hello + ' ' + d.name + ',');
      },
      visible: d => d.phone1 && args.remult.isAllowed(Roles.distCenterAdmin) && args.settings.isSytemForMlt()
    }
  ] as RowButton<FamilyDeliveries>[]
}