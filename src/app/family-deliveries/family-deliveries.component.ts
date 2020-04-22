import { Component, OnInit, ViewChild } from '@angular/core';
import { distCenterAdminGuard, Roles } from '../auth/roles';
import { Route } from '@angular/router';
import { Context, DataControlSettings, FilterBase, AndFilter, BusyService } from '@remult/core';
import { ActiveFamilyDeliveries } from './family-deliveries-join';
import { FamilyDeliveresStatistics, FamilyDeliveryStats } from './family-deliveries-stats';
import { MatTabGroup } from '@angular/material/tabs';
import { DialogService } from '../select-popup/dialog';
import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt, leaveComponent } from '../custom-reuse-controller-router-strategy';
import { DeliveryStatistic } from '../delivery-follow-up/delivery-stats';
import * as chart from 'chart.js';
import { colors } from '../families/stats-action';
import { BasketType } from '../families/BasketType';

import { UpdateFamilyDialogComponent } from '../update-family-dialog/update-family-dialog.component';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { Families } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';

@Component({
  selector: 'app-family-deliveries',
  templateUrl: './family-deliveries.component.html',
  styleUrls: ['./family-deliveries.component.scss']
})
export class FamilyDeliveriesComponent implements OnInit {
  static route: Route = {
    path: 'deliveries',
    component: FamilyDeliveriesComponent,
    data: { name: 'משלוחים' }, canActivate: [distCenterAdminGuard]
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

  clearSearch() {
    this.searchString = '';
    this.doSearch();
  }
  stats = new FamilyDeliveryStats();
  @ViewChild('myTab', { static: false }) myTab: MatTabGroup;
  basketStats: statsOnTabBasket = {
    name: 'נותרו לפי סלים',
    rule: f => f.readyAndSelfPickup(),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };

  basketsInEvent: statsOnTabBasket = {
    name: 'לפי סלים',
    rule: f => f.deliverStatus.isInEvent(),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };
  basketsDelivered: statsOnTabBasket = {
    name: 'נמסרו לפי סלים',
    rule: f => f.deliverStatus.isSuccess(),
    stats: [
      this.stats.ready,
      this.stats.special
    ],
    moreStats: [],
    fourthColumn: () => this.statusColumn
  };

  cityStats: statsOnTab = {
    name: 'נותרו לפי ערים',
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
    name: 'נותרו לפי קבוצות',
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
      name: 'משלוחים',
      showTotal: true,
      rule: f => f.deliverStatus.isInEvent(),
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
      name: 'מצריך טיפול',
      showTotal: true,
      rule: f => f.deliverStatus.isInEvent().and(f.needsWork.isEqualTo(true)),
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
      this.pieChartLabels.push('ריק');
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


      this.basketStatsCalc(st.baskets, this.basketStats, b => b.unassignedFamilies, (f, id) =>
        f.readyFilter().and(f.basketType.isEqualTo(id)));
      this.basketStatsCalc(st.baskets, this.basketsInEvent, b => b.inEventFamilies, (f, id) =>
        f.deliverStatus.isInEvent().and(f.basketType.isEqualTo(id)));
      this.basketStatsCalc(st.baskets, this.basketsDelivered, b => b.successFamilies, (f, id) =>
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
  private basketStatsCalc(baskets: any[], stats: statsOnTabBasket, getCount: (x: any) => number, equalToFilter: (f: ActiveFamilyDeliveries, id: string) => FilterBase) {
    stats.stats.splice(0);
    stats.totalBoxes1 = 0;

    stats.totalBoxes2 = 0;

    baskets.forEach(b => {
      let fs = new FamilyDeliveresStatistics(b.name, f => equalToFilter(f, b.id),
        undefined);
      fs.value = getCount(b);
      stats.stats.push(fs);
      if (b.blocked) {


      }
      else {
        stats.totalBoxes1 += +b.boxes * +fs.value;
        stats.totalBoxes2 += +b.boxes2 * +fs.value;
      }
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
          lastFs = new FamilyDeliveresStatistics('כל השאר', f => {
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
      let r = 'סה"כ ' + BasketType.boxes1Name + ': ' + x.totalBoxes1;

      if (x.totalBoxes2)
        r += ', סה"כ ' + BasketType.boxes2Name + ': ' + x.totalBoxes2;

      return r;
    }
    return undefined;
  }
  constructor(
    private context: Context,
    public dialog: DialogService,
    private busy: BusyService
  ) {


    dialog.onDistCenterChange(() => this.refresh(), this);
    dialog.onStatusStatsChange(() => this.refreshStats(), this);
  }
  deliveries = this.context.for(ActiveFamilyDeliveries).gridSettings({
    allowUpdate: true,
    rowCssClass: f => f.deliverStatus.getCss(),
    numOfColumnsInGrid: 4,
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

        addFilter(f.filterDistCenter(this.dialog.distCenter.value));
        return result;
      }
      , orderBy: f => f.name
    },
    columnSettings: families => {
      let r = [

        {
          column: families.name,
          width: '200'
        },
        {
          column: families.address,
          width: '250',
          cssClass: f => {
            if (!f.addressOk.value)
              return 'addressProblem';
            return '';
          }
        },
        families.basketType
        ,
        {
          caption: 'סיכום משלוח',
          column: families.deliverStatus,
          readOnly: true,
          valueList: families.deliverStatus.getOptions()
          ,
          getValue: f => f.getDeliveryDescription(),
          width: '300'
        },

        this.statusColumn = { column: families.deliverStatus },



        this.groupsColumn = { column: families.groups },


        families.deliveryComments,
        families.special,
        families.createUser,
        families.createDate,


        { column: families.addressOk, width: '110' },
        families.floor,
        families.appartment,
        families.entrance,
        { column: families.addressComment },
        families.city,
        families.phone1,
        families.phone1Description,
        families.phone2,
        families.phone2Description,
        families.phone3,
        families.phone3Description,
        families.phone4,
        families.phone4Description,
        families.courier,
        families.distributionCenter,
        families.courierAssignUser,
        families.courierAssingTime,


        families.deliveryStatusUser,
        families.deliveryStatusDate,
        families.courierComments,
        families.needsWork,
        families.needsWorkDate,
        families.needsWorkUser

      ];
      return r;
    },
    rowButtons: [
      {
        name: '',
        icon: 'edit',
        showInLine: true,
        click: async fd => {
          let delivery = await this.context.for(FamilyDeliveries).findFirst(x => x.id.isEqualTo(fd.id));
          let f = await this.context.for(Families).findFirst(x => x.id.isEqualTo(fd.familyId));
          this.context.openDialog(UpdateFamilyDialogComponent, async x => {
            x.args = {
              delivery, f

            }
          });
        }
        , textInMenu: () => 'כרטיס משפחה'
      },
      {
        name: 'בטל שיוך',
        click: async d => {
          if (await this.dialog.YesNoPromise("האם לבטל שיוך מתנדב ל" + d.name.value)) {
            {
              d.courier.value = '';
              await d.save();
            }
          }
        },
        visible: d => d.deliverStatus.value == DeliveryStatus.ReadyForDelivery && d.courier.value != ''
      },
      {
        name: 'מחק משלוח',
        click: async d => {
          if (await this.dialog.YesNoPromise("האם למחוק את המשלוח ל" + d.name.value)) {
            {
              let fd = await this.context.for(FamilyDeliveries).findFirst(fd => fd.id.isEqualTo(d.id));
              await fd.delete();
              this.deliveries.items.splice(this.deliveries.items.indexOf(d), 1);
            }
          }
        },
        visible: d => d.deliverStatus.value == DeliveryStatus.ReadyForDelivery && d.courier.value == ''
      },
      {
        name: 'העבר לארכיון',
        click: async d => {
          if (await this.dialog.YesNoPromise("האם להעביר את המשלוח לארכיון?")) {
            {
              let fd = await this.context.for(FamilyDeliveries).findFirst(fd => fd.id.isEqualTo(d.id));
              fd.archive.value = true;
              await fd.save();
              this.deliveries.items.splice(this.deliveries.items.indexOf(d), 1);
            }
          }
        }

      }
    ]
  });

  ngOnInit() {
    this.refreshStats();
    let cols = this.deliveries.columns;
    let firstColumns = [
      cols.items[0],
      cols.items[1],
      cols.items[2],
      cols.items[3]
    ];

    cols.items.sort((a, b) => a.caption > b.caption ? 1 : a.caption < b.caption ? -1 : 0);

    for (let index = 0; index < firstColumns.length; index++) {
      const item = firstColumns[index];
      let origIndex = cols.items.indexOf(item);
      cols.moveCol(item, -origIndex + index);
    }

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