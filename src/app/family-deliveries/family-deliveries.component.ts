import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { distCenterAdminGuard, Roles } from '../auth/roles';
import { Route } from '@angular/router';
import { Context, DataControlSettings, FilterBase, AndFilter, BusyService, packWhere, ServerFunction, unpackWhere, EntityWhere } from '@remult/core';

import { FamilyDeliveresStatistics, FamilyDeliveryStats } from './family-deliveries-stats';
import { MatTabGroup } from '@angular/material/tabs';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt, leaveComponent } from '../custom-reuse-controller-router-strategy';

import * as chart from 'chart.js';
import { colors } from '../families/stats-action';
import { BasketType } from '../families/BasketType';


import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Families } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { delvieryActions } from './family-deliveries-actions';
import { buildGridButtonFromActions, serverUpdateInfo, filterActionOnServer, pagedRowsIterator, iterateRowsActionOnServer } from '../families/familyActionsWiring';
import { familyActionsForDelivery } from '../families/familyActions';
import { async } from '@angular/core/testing';
import { saveToExcel } from '../shared/saveToExcel';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { getLang } from '../translate'

@Component({
  selector: 'app-family-deliveries',
  templateUrl: './family-deliveries.component.html',
  styleUrls: ['./family-deliveries.component.scss']
})
export class FamilyDeliveriesComponent implements OnInit, OnDestroy {
  static route: Route = {
    path: 'deliveries',
    component: FamilyDeliveriesComponent,
     canActivate: [distCenterAdminGuard]
  }
  limit = 50;
  groupsColumn: DataControlSettings<ActiveFamilyDeliveries>;
  statusColumn: DataControlSettings<ActiveFamilyDeliveries>;
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
    f.showFamilyDialog({
      onSave: async () => {
        await f.showNewDeliveryDialog(this.dialog, this.settings);
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
  groupsReady: statsOnTab = {
    name: getLang(this.context).remainingByGroups,
    rule: f => f.readyFilter(),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.groupsColumn
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
    this.basketsDelivered,
    this.groupsReady,
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
  updateChart() {
    this.pieChartData = [];
    this.pieChartStatObjects = [];
    this.pieChartLabels.splice(0);
    this.colors[0].backgroundColor.splice(0);
    this.currentTabStats = this.statTabs[this.myTab.selectedIndex];
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
      this.groupsReady.stats.splice(0);


      this.basketStatsCalc(st.baskets, this.basketStats, b => b.unassignedDeliveries, (f, id) =>
        f.readyFilter().and(f.basketType.isEqualTo(id)));
      this.basketStatsCalc(st.baskets, this.basketsInEvent, b => b.inEventDeliveries, (f, id) =>
        f.basketType.isEqualTo(id));
      this.basketStatsCalc(st.baskets, this.basketsDelivered, b => b.successDeliveries, (f, id) =>
        f.deliverStatus.isSuccess().and(f.basketType.isEqualTo(id)));
      this.prepComplexStats(st.cities, this.cityStats,
        (f, c) => f.readyFilter().and(f.city.isEqualTo(c)),
        (f, c) => f.readyFilter().and(f.city.isDifferentFrom(c)));
      this.prepComplexStats(st.groups.map(g => ({ name: g.name, count: g.totalReady })),
        this.groupsReady,
        (f, g) => f.readyFilter(undefined, g),
        (f, g) => f.readyFilter().and(f.groups.isDifferentFrom(g)).and(f.groups.isDifferentFrom('')));
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


    dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);
    dialog.onStatusChange(() => this.refreshStats(), this.destroyHelper);
  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }

  deliveries = this.context.for(ActiveFamilyDeliveries).gridSettings({
    allowUpdate: true,
    rowCssClass: f => f.deliverStatus.getCss(),
    numOfColumnsInGrid: 5,
    hideDataArea: true,
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
        deliveries.basketType,
        deliveries.quantity,

        {
          caption: getLang(this.context).deliverySummary,
          column: deliveries.deliverStatus,
          readOnly: true,
          valueList: deliveries.deliverStatus.getOptions()
          ,
          getValue: f => f.getDeliveryDescription(),
          width: '300'
        },

        this.statusColumn = { column: deliveries.deliverStatus },



        this.groupsColumn = { column: deliveries.groups },


        deliveries.deliveryComments,
        deliveries.internalDeliveryComment,
        deliveries.special,
        deliveries.createUser,
        deliveries.createDate,
        deliveries.familySource,

        { column: deliveries.addressOk, width: '110' },
        deliveries.floor,
        deliveries.appartment,
        deliveries.entrance,
        { column: deliveries.addressComment },
        deliveries.city,
        deliveries.area,
        deliveries.phone1,
        deliveries.phone1Description,
        deliveries.phone2,
        deliveries.phone2Description,
        deliveries.phone3,
        deliveries.phone3Description,
        deliveries.phone4,
        deliveries.phone4Description,
        deliveries.courier,
        deliveries.distributionCenter,
        deliveries.courierAssignUser,
        deliveries.courierAssingTime,


        deliveries.deliveryStatusUser,
        deliveries.deliveryStatusDate,
        deliveries.courierComments,
        deliveries.internalDeliveryComment,
        deliveries.needsWork,
        deliveries.needsWorkDate,
        deliveries.needsWorkUser,
        deliveries.fixedCourier,
        deliveries.familyMembers

      ];
      return r;
    },
    allowSelection: true,
    gridButton: [
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
      ...buildGridButtonFromActions(familyActionsForDelivery(), this.context, {
        afterAction: async () => await this.refresh(),
        dialog: this.dialog,
        callServer: async (info, action, args) => await FamilyDeliveriesComponent.FamilyInDeliveryActionOnServer(info, action, args),
        buildActionInfo: async actionWhere => {
          return await this.buildWhereForAction(actionWhere);
        },
        settings: this.settings,
        groupName: getLang(this.context).families
      }),
      {
        name: getLang(this.context).exportToExcel,
        click: async () => {
          await saveToExcel(this.context.for(ActiveFamilyDeliveries), this.deliveries, getLang(this.context).deliveries, this.busy, (d: ActiveFamilyDeliveries, c) => c == d.id || c == d.family, undefined,
            async (f, addColumn) => {
              await f.basketType.addBasketTypes(f.quantity, addColumn);
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
            focusOnDelivery:true
          });
        }
        , textInMenu: () => getLang(this.context).deliveryDetails
      },
      {
        name: getLang(this.context).newDelivery,
        click: async d => {
          let f = await this.context.for(Families).findId(d.family);
          await f.showNewDeliveryDialog(this.dialog, this.settings, d, async () => this.refresh());
        },
        visible: d => this.context.isAllowed(Roles.admin)
      },
      {
        name: getLang(this.context).cancelAsignment,
        click: async d => {
          if (await this.dialog.YesNoPromise(getLang(this.context).cancelAssignmentFor + d.name.value)) {
            {
              d.courier.value = '';
              await d.save();
            }
          }
        },
        visible: d => d.deliverStatus.value == DeliveryStatus.ReadyForDelivery && d.courier.value != ''
      },
      {
        name: getLang(this.context).familyDeliveries,
        click: async fd => {
          let f = await this.context.for(Families).findId(fd.family);
          f.showDeliveryHistoryDialog();
        }
        , visible: f => !f.isNew()
      },
      {
        name: getLang(this.context).freezeDelivery,
        click: async d => {
          if (await this.dialog.YesNoPromise(getLang(this.context).freezeDeliveryHelp + d.name.value + "?")) {
            {
              d.deliverStatus.value = DeliveryStatus.Frozen;
              await d.save();
            }
          }
        },
        visible: d => d.deliverStatus.value == DeliveryStatus.ReadyForDelivery && d.courier.value == ''
      },
      {
        name: getLang(this.context).unFreezeDelivery,
        click: async d => {
          {
            d.deliverStatus.value = DeliveryStatus.ReadyForDelivery;
            await d.save();
          }
        },
        visible: d => d.deliverStatus.value == DeliveryStatus.Frozen
      },
      {
        name: getLang(this.context).deleteDelivery,
        click: async d => {
          if (await this.dialog.YesNoPromise(getLang(this.context).shouldDeleteDeliveryFor + d.name.value)) {
            {
              let fd = await this.context.for(FamilyDeliveries).findFirst(fd => fd.id.isEqualTo(d.id));
              await fd.delete();
              this.deliveries.items.splice(this.deliveries.items.indexOf(d), 1);
            }
          }
        },
        visible: d => d.deliverStatus.value == DeliveryStatus.ReadyForDelivery && d.courier.value == '' && this.context.isAllowed(Roles.admin)
      },
      {
        name: getLang(this.context).archiveDelivery,
        click: async d => {
          if (await this.dialog.YesNoPromise(getLang(this.context).shouldArchiveDelivery)) {
            {
              let fd = await this.context.for(FamilyDeliveries).findFirst(fd => fd.id.isEqualTo(d.id));
              fd.archive.value = true;
              await fd.save();
              this.deliveries.items.splice(this.deliveries.items.indexOf(d), 1);
            }
          }
        }, visible: () => this.context.isAllowed(Roles.admin)

      }
    ]
  });
  private async buildWhereForAction(actionWhere) {
    let where: EntityWhere<ActiveFamilyDeliveries> = f => {
      let r = new AndFilter(actionWhere(f), this.deliveries.buildFindOptions().where(f));
      if (this.deliveries.selectedRows.length > 0)
        r = new AndFilter(r, f.id.isIn(...this.deliveries.selectedRows.map(x => x.id.value)));
      return r;

    };
    return {
      count: await this.context.for(ActiveFamilyDeliveries).count(where),
      actionRowsFilterInfo: packWhere(this.context.for(ActiveFamilyDeliveries).create(), where)
    };
  }

  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async DeliveriesActionOnServer(info: serverUpdateInfo, action: string, args: any[], context?: Context) {
    let r = await filterActionOnServer(delvieryActions(), context, async (h) => {
      return await iterateRowsActionOnServer({
        context: context.for(ActiveFamilyDeliveries),
        h: {
          actionWhere: x => h.actionWhere(x),
          forEach: async fd => {
            fd._disableMessageToUsers = true;
            await h.forEach(fd);
            await fd.save();
          }
        },
        info,
        additionalWhere:
          fd => fd.isAllowedForUser(),
      });
    }, action, args);
    Families.SendMessageToBrowsers(getLang(context).deliveriesUpdated, context, '');
    return r+getLang(context).deliveriesUpdated;
  }
  @ServerFunction({ allowed: Roles.admin })
  static async FamilyInDeliveryActionOnServer(info: serverUpdateInfo, action: string, args: any[], context?: Context) {
    let processedFamilies = new Map<string, boolean>();
    let r = await filterActionOnServer(familyActionsForDelivery(), context, async (h) => {
      return await iterateRowsActionOnServer({
        context: context.for(ActiveFamilyDeliveries),
        h: {
          actionWhere: x => undefined,
          forEach: async fd => {
            if (processedFamilies.get(fd.family.value))
              return;
            processedFamilies.set(fd.family.value, true);
            let f = await context.for(Families).findFirst(x => new AndFilter(h.actionWhere(x), x.id.isEqualTo(fd.family.value)))
            if (f) {
              await h.forEach(f);
              await f.save();
            }
          }
        },
        info,
        additionalWhere: fd => fd.isAllowedForUser()
      });
    }, action, args);
    Families.SendMessageToBrowsers(getLang(context).deliveriesUpdated, context, '');
    return getLang(context).deliveriesUpdated;
  }


  ngOnInit() {
    this.refreshStats();
    let cols = this.deliveries.columns;
    let firstColumns = [
      cols.items[0],
      cols.items[1],
      cols.items[2],
      cols.items[3],
      cols.items[4]
    ];

    cols.items.sort((a, b) => a.caption > b.caption ? 1 : a.caption < b.caption ? -1 : 0);

    for (let index = 0; index < firstColumns.length; index++) {
      const item = firstColumns[index];
      let origIndex = cols.items.indexOf(item);
      cols.moveCol(item, -origIndex + index);
    }

  }
  packWhere() {
    return {
      where: packWhere(this.context.for(FamilyDeliveries).create(), this.deliveries.buildFindOptions().where),
      count: this.deliveries.totalRows
    };
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
  fourthColumn: () => DataControlSettings<any>
}


