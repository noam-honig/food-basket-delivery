import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { distCenterAdminGuard, Roles } from '../auth/roles';
import { Route } from '@angular/router';
import { Context, DataControlSettings, FilterBase, AndFilter, BusyService, packWhere, ServerFunction, unpackWhere, EntityWhere, GridButton, RowButton, GridSettings, DataControlInfo, SqlDatabase } from '@remult/core';

import { FamilyDeliveresStatistics, FamilyDeliveryStats, groupStats } from './family-deliveries-stats';
import { MatTabGroup } from '@angular/material/tabs';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt, leaveComponent } from '../custom-reuse-controller-router-strategy';

import * as chart from 'chart.js';
import { colors } from '../families/stats-action';
import { BasketType } from '../families/BasketType';


import { FamilyDeliveries, ActiveFamilyDeliveries, MessageStatus } from '../families/FamilyDeliveries';
import { Families } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { delvieryActions } from './family-deliveries-actions';
import { buildGridButtonFromActions, serverUpdateInfo, filterActionOnServer, pagedRowsIterator, iterateRowsActionOnServer, packetServerUpdateInfo } from '../families/familyActionsWiring';

import { saveToExcel } from '../shared/saveToExcel';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { TranslationOptions, use } from '../translate'
import { Helpers } from '../helpers/helpers';

import { sortColumns } from '../shared/utils';
import { getLang } from '../sites/sites';
import { PhoneColumn, SqlBuilder } from '../model-shared/types';
import { Groups } from '../manage/groups';

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
    await this.deliveries.getRecords();
  }
  async newFamily() {
    let f = this.context.for(Families).create();
    f.name.value = this.searchString;
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
  stats = new FamilyDeliveryStats(this.context);
  @ViewChild('myTab', { static: false }) myTab: MatTabGroup;
  basketStats: statsOnTabBasket = {
    name: getLang(this.context).remainingByBaskets,
    rule: f => f.readyAndSelfPickup(),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  assignedButNotOutBaskets: statsOnTabBasket = {
    name: getLang(this.context).assignedButNotOutBaskets,
    rule: f => f.onTheWayFilter().and(f.messageStatus.isEqualTo(MessageStatus.notSent)),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  selfPickupBaskets: statsOnTabBasket = {
    name: getLang(this.context).selfPickupByBaskets,
    rule: f => f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };

  basketsInEvent: statsOnTabBasket = {
    name: getLang(this.context).byBaskets,
    rule: f => undefined,
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  basketsDelivered: statsOnTabBasket = {
    name: getLang(this.context).deliveredByBaskets,
    rule: f => f.deliverStatus.isSuccess(),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };

  cityStats: statsOnTab = {
    name: getLang(this.context).remainingByCities,
    showTotal: true,
    rule: f => f.readyFilter(),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };

  statTabs: statsOnTab[] = [
    {
      name: getLang(this.context).deliveries,
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
      name: getLang(this.context).remainingByGroups,
      rule: f => f.readyFilter(),
      stats: [
        this.stats.ready,
        this.stats.special
      ],
      moreStats: [],
      fourthColumn: () => this.groupsColumn,
      refreshStats: async x => {
        let areas = await FamilyDeliveriesComponent.getGroups(this.dialog.distCenter.value, true);
        this.prepComplexStats(areas.map(g => ({ name: g.name, count: g.totalReady })),
          x,
          (f, g) => f.groups.isContains(g).and(f.readyFilter()),
          (f, g) => f.groups.isDifferentFrom(g).and(f.groups.isDifferentFrom('')).and(f.readyFilter()));
      }
    },
    {
      name: getLang(this.context).byGroups,
      rule: f => undefined,
      stats: [
        this.stats.ready,
        this.stats.special
      ],
      moreStats: [],
      fourthColumn: () => this.groupsColumn,
      refreshStats: async x => {
        let areas = await FamilyDeliveriesComponent.getGroups(this.dialog.distCenter.value);
        this.prepComplexStats(areas.map(g => ({ name: g.name, count: g.totalReady })),
          x,
          (f, g) => f.groups.isContains(g),
          (f, g) => f.groups.isDifferentFrom(g).and(f.groups.isDifferentFrom('')));
      }
    },
    this.cityStats,
    {
      name: getLang(this.context).requireFollowUp,
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

  public pieChartType: string = 'pie';
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
      this.pieChartLabels.push(getLang(this.context).empty);
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

  isAdmin = this.context.isAllowed(Roles.admin);
  refreshStats() {
    if (this.suspend)
      return;

    this.busy.donotWait(async () => this.stats.getData(this.dialog.distCenter.value).then(st => {
      this.basketStats.stats.splice(0);
      this.cityStats.stats.splice(0);
      this.cityStats.moreStats.splice(0);



      this.basketStatsCalc(st.baskets, this.basketStats, b => b.unassignedDeliveries, (f, id) =>
        f.readyFilter().and(f.basketType.isEqualTo(id)));
      this.basketStatsCalc(st.baskets, this.basketsInEvent, b => b.inEventDeliveries, (f, id) =>
        f.basketType.isEqualTo(id));
      this.basketStatsCalc(st.baskets, this.assignedButNotOutBaskets, b => b.smsNotSent, (f, id) =>
        f.basketType.isEqualTo(id).and(this.assignedButNotOutBaskets.rule(f)));
      this.basketStatsCalc(st.baskets, this.selfPickupBaskets, b => b.selfPickup, (f, id) =>
        f.basketType.isEqualTo(id).and(this.selfPickupBaskets.rule(f)));
      this.basketStatsCalc(st.baskets, this.basketsDelivered, b => b.successDeliveries, (f, id) =>
        f.deliverStatus.isSuccess().and(f.basketType.isEqualTo(id)));
      this.prepComplexStats(st.cities, this.cityStats,
        (f, c) => f.readyFilter().and(f.city.isEqualTo(c)),
        (f, c) => f.readyFilter().and(f.city.isDifferentFrom(c)));

      this.updateChart();
    }));
  }
  private basketStatsCalc<T extends { boxes: number, boxes2: number, name: string, id: string }>(baskets: T[], stats: statsOnTabBasket, getCount: (x: T) => number, equalToFilter: (f: ActiveFamilyDeliveries, id: string) => FilterBase) {
    stats.stats.splice(0);
    stats.totalBoxes1 = 0;

    stats.totalBoxes2 = 0;

    baskets.forEach(b => {
      let fs = new FamilyDeliveresStatistics(b.name, f => equalToFilter(f, b.id),
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
    equalToFilter: (f: ActiveFamilyDeliveries, item: string) => FilterBase,
    differentFromFilter: (f: ActiveFamilyDeliveries, item: string) => AndFilter
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
          lastFs = new FamilyDeliveresStatistics(getLang(this.context).allOthers, f => {
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
      let r = getLang(this.context).total + ' ' + BasketType.boxes1Name + ': ' + x.totalBoxes1;

      if (x.totalBoxes2)
        r += ', ' + getLang(this.context).total + ' ' + BasketType.boxes2Name + ': ' + x.totalBoxes2;

      return r;
    }
    return undefined;
  }
  constructor(
    private context: Context,
    public dialog: DialogService,
    private busy: BusyService,
    public settings: ApplicationSettings
  ) {

    if (!settings.usingSelfPickupModule.value)
      this.statTabs.splice(this.statTabs.indexOf(this.selfPickupBaskets), 1);
    dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);
    dialog.onStatusChange(() => this.refreshStats(), this.destroyHelper);
  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }

  deliveries = this.context.for(ActiveFamilyDeliveries).gridSettings({
    showFilter: true,
    allowUpdate: true,
    rowCssClass: f => f.deliverStatus.getCss(),
    numOfColumnsInGrid: 5,

    knowTotalRows: true,
    get: {
      limit: this.limit,
      where: f => {
        let index = 0;
        let result: FilterBase = undefined;
        let addFilter = (filter: FilterBase) => {
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
          addFilter(f.name.isContains(this.searchString));
        }

        addFilter(f.filterDistCenterAndAllowed(this.dialog.distCenter.value));
        return result;
      }
      , orderBy: f => f.name
    },
    columnSettings: deliveries => {
      let r = [

        {
          column: deliveries.name,
          width: '200'
        },
        {
          column: deliveries.address,
          width: '250',
          cssClass: f => {
            if (!f.addressOk.value)
              return 'addressProblem';
            return '';
          }
        },
        {
          column: deliveries.basketType,
          cssClass: f => {
            if (f.isLargeQuantity())
              return 'largeDelivery';
            return '';
          }
        },
        {
          column: deliveries.quantity,
          width: '50',
          cssClass: f => {
            if (f.isLargeQuantity())
              return 'largeDelivery';
            return '';
          }
        },

        this.deliverySummary = {
          caption: getLang(this.context).deliverySummary,
          column: deliveries.deliverStatus,
          readOnly: true,
          valueList: deliveries.deliverStatus.getOptions()
          ,
          getValue: f => f.getDeliveryDescription(),
          width: '300'
        },
        { column: deliveries.createDate, width: '150' },
        {
          column: deliveries.distributionCenter,
          cssClass: f => {
            if (f.isDistCenterInactive())
              return 'addressProblem'
            else
              return '';
          }
        },
        this.statusColumn = { column: deliveries.deliverStatus },



        this.groupsColumn = { column: deliveries.groups },


        deliveries.deliveryComments,

        deliveries.special,
        deliveries.createUser,

        deliveries.familySource,

        { column: deliveries.addressOk, width: '110' },
        deliveries.floor,
        deliveries.appartment,
        deliveries.entrance,
        { column: deliveries.addressComment },
        { column: deliveries.city, width: '100' },
        deliveries.area,
        deliveries.phone1,
        deliveries.phone1Description,
        deliveries.phone2,
        deliveries.phone2Description,
        deliveries.phone3,
        deliveries.phone3Description,
        deliveries.phone4,
        deliveries.phone4Description,
        { column: deliveries.courier, width: '100' },

        deliveries.courierAssignUser,
        { column: deliveries.courierAssingTime, width: '150' },
        { column: deliveries.deliveryStatusUser, width: '100' },
        deliveries.deliveryStatusDate,
        { column: deliveries.courierComments, width: '300' },
        { column: deliveries.internalDeliveryComment, width: '400' },
        deliveries.needsWork,
        deliveries.needsWorkDate,
        deliveries.needsWorkUser,
        deliveries.fixedCourier,
        deliveries.familyMembers,
        { column: deliveries.messageStatus, width: '130' },
        deliveries.receptionComments
      ];

      this.normalColumns = [
        deliveries.name
      ]
      if (this.settings.isSytemForMlt()) {
        this.normalColumns.push(
          deliveries.city,
          deliveries.distributionCenter,
          deliveries.basketType,
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
      ...buildGridButtonFromActions(delvieryActions(), this.context,
        {
          afterAction: async () => await this.refresh(),
          dialog: this.dialog,
          callServer: async (info, action, args) => await FamilyDeliveriesComponent.DeliveriesActionOnServer(info, action, args),
          buildActionInfo: async actionWhere => {
            return await this.buildWhereForAction(actionWhere);
          },
          settings: this.settings,
          groupName: getLang(this.context).deliveries
        }),

      {
        name: getLang(this.context).exportToExcel,
        click: async () => {
          await saveToExcel(this.settings, this.context.for(ActiveFamilyDeliveries), this.deliveries, getLang(this.context).deliveries, this.busy, (d: ActiveFamilyDeliveries, c) => c == d.id || c == d.family, undefined,
            async (fd, addColumn) => {
              await fd.basketType.addBasketTypes(fd.quantity, addColumn);
              var f = await this.context.for(Families).findId(fd.family);
              if (f) {
                let x = f.address.getGeocodeInformation();
                let street = f.address.value;
                let house = '';
                let lastName = '';
                let firstName = '';
                if (f.name.value != undefined)
                  lastName = f.name.value.trim();
                let i = lastName.lastIndexOf(' ');
                if (i >= 0) {
                  firstName = lastName.substring(i, lastName.length).trim();
                  lastName = lastName.substring(0, i).trim();
                }
                {
                  try {
                    for (const addressComponent of x.info.results[0].address_components) {
                      switch (addressComponent.types[0]) {
                        case "route":
                          street = addressComponent.short_name;
                          break;
                        case "street_number":
                          house = addressComponent.short_name;
                          break;
                      }
                    }
                  }
                  catch { }
                }
                addColumn(use.language.email, f.email.value, 's');
                for (const x of [[this.settings.familyCustom1Caption, f.custom1]
                  , [this.settings.familyCustom2Caption, f.custom2]
                  , [this.settings.familyCustom3Caption, f.custom3]
                  , [this.settings.familyCustom4Caption, f.custom4]
                ]
                ) {
                  if (x[0].value) {
                    addColumn(x[0].value, x[1].value, 's');
                  }
                }
                
                addColumn("X" + use.language.lastName, lastName, 's');
                addColumn("X" + use.language.firstName, firstName, 's');
                addColumn("X" + use.language.streetName, street, 's');
                addColumn("X" + use.language.houseNumber, house, 's');
                addColumn("X" + f.tz.defs.caption, f.tz.value, 's');

              }

            });
        }
        , visible: () => this.context.isAllowed(Roles.admin)
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
            dialog: this.dialog,
            focusOnDelivery: true
          });
        }
        , textInMenu: () => getLang(this.context).deliveryDetails
      },
      ...getDeliveryGridButtons({
        context: this.context,
        deliveries: () => this.deliveries,
        dialog: this.dialog,
        refresh: () => this.refresh(),
        settings: this.settings,
        busy: this.busy,
        showAllBeforeNew: this.settings.isSytemForMlt()
      })
    ]
  });
  private async buildWhereForAction(actionWhere) {
    let where: EntityWhere<ActiveFamilyDeliveries> = f => {
      let r = this.deliveries.getFilterWithSelectedRows().where(f);
      if (actionWhere) {
        r = new AndFilter(actionWhere(f), r);
      }
      return r;

    };
    return {
      count: await this.context.for(ActiveFamilyDeliveries).count(where),
      where: where
    };
  }
  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async getGroups(distCenter: string, readyOnly = false, context?: Context) {
    let pendingStats = [];
    let result: groupStats[] = [];
    await context.for(Groups).find({
      limit: 1000,
      orderBy: f => [{ column: f.name }]
    }).then(groups => {
      for (const g of groups) {
        let x: groupStats = {
          name: g.name.value,
          totalReady: 0
        };
        result.push(x);
        pendingStats.push(context.for(ActiveFamilyDeliveries).count(f => {
          let r = f.groups.isContains(x.name).and(
            f.filterDistCenterAndAllowed(distCenter));
          if (readyOnly)
            return r.and(f.readyFilter());
          return r;
        }).then(r => x.totalReady = r));

      }
    });
    await Promise.all(pendingStats);
    return result;
  }
  @ServerFunction({ allowed: Roles.lab })
  static async getDeliveriesByPhone(phoneNum: string, context?: Context, db?: SqlDatabase) {
    let sql1 = new SqlBuilder();
    let fd = context.for(FamilyDeliveries).create();
    let result: string[] = [];
    let courier = await (await context.for(Helpers).findFirst(i => i.phone.isEqualTo(phoneNum)));

    for (const d of (await db.execute(sql1.query({
      from: fd,
      where: () => [
        (courier != undefined ? fd.courier.isEqualTo(courier.id).and(fd.active()) :
          sql1.or(
            fd.phone1.isEqualTo(phoneNum).and(fd.active()),
            fd.phone2.isEqualTo(phoneNum).and(fd.active()),
            fd.phone3.isEqualTo(phoneNum).and(fd.active()),
            fd.phone4.isEqualTo(phoneNum).and(fd.active()))
        )
      ],
      select: () => [
        sql1.columnWithAlias(fd.id, "id"),
      ],
    }))).rows) {
      result.push(d.id)
    }

    return await context.for(FamilyDeliveries).toPojoArray(await context.for(FamilyDeliveries).find({ where: fd => fd.id.isIn(result) }))
  }

  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async DeliveriesActionOnServer(info: packetServerUpdateInfo, action: string, args: any[], context?: Context) {
    let r = await filterActionOnServer(delvieryActions(), context, async (h) => {
      return await iterateRowsActionOnServer({
        context: context.for(ActiveFamilyDeliveries),
        h: {
          actionWhere: x => h.actionWhere(x),
          orderBy: x => [{ column: x.createDate, descending: true }],
          forEach: async fd => {
            fd._disableMessageToUsers = true;
            await h.forEach(fd);
            if (fd.wasChanged())
              await fd.save();
          }
        },
        info,
        additionalWhere:
          fd => fd.isAllowedForUser(),
      });
    }, action, args);
    Families.SendMessageToBrowsers(getLang(context).deliveriesUpdated, context, '');
    return r + getLang(context).deliveriesUpdated;
  }

  ngOnInit() {
    this.refreshStats();
    this.deliveries.columns.numOfColumnsInGrid = this.normalColumns.length;
    sortColumns(this.deliveries, this.normalColumns)
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
  rule: (f: ActiveFamilyDeliveries) => FilterBase,
  fourthColumn: () => DataControlSettings,
  refreshStats?: (stats: statsOnTab) => Promise<void>
}

export interface deliveryButtonsHelper {
  context: Context,
  dialog: DialogService,
  busy: BusyService,
  settings: ApplicationSettings,
  refresh: () => void,
  deliveries: () => GridSettings<FamilyDeliveries>,
  showAllBeforeNew?: boolean
}
export function getDeliveryGridButtons(args: deliveryButtonsHelper) {
  let newDelivery: (d: FamilyDeliveries) => void = async d => {
    let f = await args.context.for(Families).findId(d.family);

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
          if (d.deliverStatus.value.isProblem) {
            let newDelivery = await args.context.for(ActiveFamilyDeliveries).findId(newDeliveryId);
            for (const otherFailedDelivery of await args.context.for(ActiveFamilyDeliveries).find({
              where: fd => fd.family.isEqualTo(newDelivery.family).and(fd.deliverStatus.isProblem())
            })) {
              await Families.addDelivery(otherFailedDelivery.family.value, {
                basketType: otherFailedDelivery.basketType.value,
                quantity: otherFailedDelivery.quantity.value,
                courier: newDelivery.courier.value,
                distCenter: newDelivery.distributionCenter.value,
                selfPickup: false,
                comment: otherFailedDelivery.deliveryComments.value
              });
              otherFailedDelivery.archive.value = true;
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
      name: getLang(args.context).newDelivery,
      icon: 'add_shopping_cart',
      click: async d => {
        newDelivery(d)
      },
      visible: d => args.context.isAllowed(Roles.admin) && !DeliveryStatus.IsAResultStatus(d.deliverStatus.value)
    },
    {
      textInMenu: () => getLang(args.context).newDelivery,
      icon: 'add_shopping_cart',
      showInLine: true,
      click: async d => {
        newDelivery(d)
      },
      visible: d => args.context.isAllowed(Roles.admin) && DeliveryStatus.IsAResultStatus(d.deliverStatus.value)
    },
    {
      textInMenu: () => getLang(args.context).assignVolunteer,
      icon: 'person_search',
      showInLine: true,
      click: async d => {
        await d.courier.showSelectDialog(async () => {
          await d.save();



          var fd = await args.context.for(ActiveFamilyDeliveries).find({
            where: fd => {
              let f = fd.id.isDifferentFrom(d.id).and(
                fd.readyFilter()).and(
                  d.distributionCenter.filter(args.dialog.distCenter.value));
              if (d.addressOk.value)
                return f.and(fd.addressLongitude.isEqualTo(d.addressLongitude).and(fd.addressLatitude.isEqualTo(d.addressLatitude)));
              else
                return f.and(fd.family.isEqualTo(d.family).and(f));
            }
          });
          if (fd.length > 0) {
            if (await args.dialog.YesNoPromise(args.settings.lang.thereAreAdditional + " " + fd.length + " " + args.settings.lang.deliveriesAtSameAddress)) {
              for (const f of fd) {
                f.courier.value = d.courier.value;
                await f.save();
              }
              args.refresh();
            }
          }

        });
      },
      visible: d => !DeliveryStatus.IsAResultStatus(d.deliverStatus.value) && args.context.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.context).volunteerAssignments,
      icon: 'list_alt',
      showInLine: true,
      click: async d => {
        let h = await args.context.for(Helpers).findId(d.courier);
        await args.context.openDialog(
          (await import('../helper-assignment/helper-assignment.component')).HelperAssignmentComponent, s => s.argsHelper = h);
        this.refresh();



      },
      visible: d => d.courier.value && args.context.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.context).volunteerInfo,


      click: async d => {
        let h = await args.context.for(Helpers).findId(d.courier);
        h.displayEditDialog(args.dialog, args.busy);



      },
      visible: d => d.courier.value && args.context.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.context).cancelAsignment,
      showInLine: true,
      icon: 'person_add_disabled',
      click: async d => {
        if (await args.dialog.YesNoPromise(getLang(args.context).cancelAssignmentFor + d.name.value)) {
          {
            d.courier.value = '';
            await d.save();
          }
        }
      },
      visible: d => d.deliverStatus.value == DeliveryStatus.ReadyForDelivery && d.courier.value != ''
    },
    {
      name: getLang(args.context).familyDeliveries,
      click: async fd => {
        let f = await args.context.for(Families).findId(fd.family);
        f.showDeliveryHistoryDialog({
          settings: args.settings,
          dialog: args.dialog,
          busy: args.busy
        });
      }
      , visible: f => !f.isNew()
    },
    {
      name: getLang(args.context).freezeDelivery,
      click: async d => {
        if (await args.dialog.YesNoPromise(getLang(args.context).freezeDeliveryHelp + d.name.value + "?")) {
          {
            d.deliverStatus.value = DeliveryStatus.Frozen;
            await d.save();
          }
        }
      },
      visible: d => d.deliverStatus.value == DeliveryStatus.ReadyForDelivery && d.courier.value == ''
    },
    {
      name: getLang(args.context).unFreezeDelivery,
      click: async d => {
        {
          d.deliverStatus.value = DeliveryStatus.ReadyForDelivery;
          await d.save();
        }
      },
      visible: d => d.deliverStatus.value == DeliveryStatus.Frozen
    },
    {
      name: getLang(args.context).deleteDelivery,
      click: async d => {
        if (await args.dialog.YesNoPromise(getLang(args.context).shouldDeleteDeliveryFor + d.name.value)) {
          {
            let fd = await args.context.for(FamilyDeliveries).findFirst(fd => fd.id.isEqualTo(d.id));
            await fd.delete();
            args.deliveries().items.splice(args.deliveries().items.indexOf(d), 1);
          }
        }
      },
      visible: d => !DeliveryStatus.IsAResultStatus(d.deliverStatus.value) && args.context.isAllowed(Roles.distCenterAdmin)
    },
    {
      textInMenu: () => getLang(args.context).archiveDelivery,
      showInLine: true,
      icon: 'archive',
      click: async d => {
        if (await args.dialog.YesNoPromise(getLang(args.context).shouldArchiveDelivery)) {
          {
            let fd = await args.context.for(FamilyDeliveries).findFirst(fd => fd.id.isEqualTo(d.id));
            fd.archive.value = true;
            await fd.save();
            args.deliveries().items.splice(args.deliveries().items.indexOf(d), 1);
          }
        }
      }, visible: d => !d.archive.value && DeliveryStatus.IsAResultStatus(d.deliverStatus.value) && args.context.isAllowed(Roles.distCenterAdmin)

    },
    {
      textInMenu: () => getLang(args.context).sendWhatsAppToFamily,
      click: async d => {
        PhoneColumn.sendWhatsappToPhone(d.phone1.value, 
          getLang(args.context).hello + ' ' + d.name.value + ',', args.context);
      }, 
      visible: d => d.phone1 && args.context.isAllowed(Roles.distCenterAdmin) && args.settings.isSytemForMlt()
    }





  ] as RowButton<FamilyDeliveries>[]

}

