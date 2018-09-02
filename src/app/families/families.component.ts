import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings, ColumnSetting, ColumnHashSet, Filter, AndFilter } from 'radweb';
import { FamilyDeliveryEventsView } from "./FamilyDeliveryEventsView";
import { Families } from './families';
import { DeliveryStatus } from "./DeliveryStatus";
import { CallStatus } from "./CallStatus";
import { YesNo } from "./YesNo";
import { Language } from "./Language";
import { FamilySources } from "./FamilySources";
import { BasketType } from "./BasketType";
import { DialogService } from '../select-popup/dialog';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';

import { DomSanitizer } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { FilterBase } from 'radweb/utils/dataInterfaces1';
import { foreachEntityItem, foreachSync } from '../shared/utils';
import { BusyService } from '../select-popup/busy-service';
import { async } from 'q';
import * as chart from 'chart.js';
import { Stats, FaimilyStatistics, colors } from './stats-action';
import { MatTabGroup } from '@angular/material';
import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt } from '../custom-reuse-controller-router-strategy';
import { HasAsyncGetTheValue } from '../model-shared/types';
import { Helpers } from '../helpers/helpers';
import { Route } from '@angular/router';
import { AdminGuard } from '../auth/auth-guard';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-families',
  templateUrl: './families.component.html',
  styleUrls: ['./families.component.scss']
})
export class FamiliesComponent implements OnInit {

  limit = 10;

  filterBy(s: FaimilyStatistics) {
    this.families.get({
      where: s.rule,
      limit: this.limit,
      orderBy: f => [f.name]


    });
  }
  public pieChartLabels: string[] = [];
  public pieChartData: number[] = [];
  pieChartStatObjects: FaimilyStatistics[] = [];
  public colors: Array<any> = [
    {
      backgroundColor: []

    }];

  public pieChartType: string = 'pie';
  currentStatFilter: FaimilyStatistics = undefined;

  options: chart.ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: 'right',
      onClick: (event: MouseEvent, legendItem: any) => {
        this.currentStatFilter = this.pieChartStatObjects[legendItem.index];
        this.families.getRecords();
        return false;
      }
    },
  };
  public chartClicked(e: any): void {
    if (e.active && e.active.length > 0) {
      this.currentStatFilter = this.pieChartStatObjects[e.active[0]._index];
      this.families.getRecords();
    }
  }
  searchString = '';
  async doSearch() {
    if (this.families.currentRow && this.families.currentRow.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.families.getRecords());
  }

  clearSearch() {
    this.searchString = '';
    this.doSearch();
  }
  stats = new Stats();
  async saveToExcel() {


    let wb = XLSX.utils.book_new();
    let data = [];
    let title = [];
    let doneTitle = false;
    let f = new Families();
    await foreachSync(await f.source.find({ limit: 5000, orderBy: [f.name] })
      , async  f => {
        let row = [];

        await foreachSync(f.__iterateColumns(), async c => {
          try {
            if (!doneTitle) {
              title.push(c.caption);
            }
            let v = c.displayValue;
            if (v == undefined)
              v = '';

            let getv: HasAsyncGetTheValue = <any>c as HasAsyncGetTheValue;
            if (getv && getv.getTheValue) {
              v = await getv.getTheValue();
            }

            v = v.toString();
            row.push(v);
          } catch (err) {
            row.push(err);
            console.error(err, c.jsonName, f.__toPojo(new ColumnHashSet()));
          }
        });
        if (!doneTitle) {
          data.push(title);
          doneTitle = true;
        }
        data.push(row);

      });
    let ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'test');
    XLSX.writeFile(wb, 'משפחות.xlsx');
    return;
  }
  familyDeliveryEventsView = new FamilyDeliveryEventsView();

  families = new GridSettings(new Families(), {

    allowUpdate: true,
    allowInsert: true,
    rowCssClass: f => {
      switch (f.deliverStatus.listValue) {
        case DeliveryStatus.Success:
          return 'deliveredOk';
        case DeliveryStatus.FailedBadAddress:
        case DeliveryStatus.FailedNotHome:
        case DeliveryStatus.FailedOther:
          return 'deliveredProblem';
        default:
          return '';
      }
    },
    numOfColumnsInGrid: 4,
    onEnterRow: async f => {
      if (f.isNew()) {
        f.basketType.value = '';
        f.language.listValue = Language.Hebrew;
        f.deliverStatus.listValue = DeliveryStatus.ReadyForDelivery;
        f.callStatus.listValue = CallStatus.NotYet;
        f.special.listValue = YesNo.No;
      } else {


      }
    },


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
        return result;
      }
      , orderBy: f => f.name
    },
    hideDataArea: true,
    knowTotalRows: true,
    columnSettings: families => [

      {
        column: families.name,
        width: '200'
      },
      {
        column: families.address,
        cssClass: f => {
          if (f.getGeocodeInformation().partialMatch())
            return 'addressProblem';
          return '';
        }
      },
      {
        column: families.basketType,
        dropDown: { source: new BasketType() },
        width: '100'
      },
      {
        caption: 'שינוע',
        getValue: f => f.getDeliveryDescription(),
        width: '200'
      }, {
        column: families.familyMembers,

      },
      {
        column: families.language,
        dropDown: {
          items: families.language.getOptions()
        },

      }, {
        column: families.familySource,
        dropDown: { source: new FamilySources() }
      },
      families.internalComment,
      families.iDinExcel,
      families.deliveryComments,
      families.special.getColumn(),
      families.createUser,
      families.createDate,

      families.floor,
      families.appartment,
      families.addressComment,
      families.city,
      families.addressByGoogle(),
      families.phone1,
      families.phone1Description,
      families.phone2,
      families.phone2Description,
      families.courier.getColumn(this.selectService),
      {
        caption: 'טלפון משנע',
        getValue: f => f.lookup(new Helpers(), f.courier).phone.value
      },
      families.courierAssignUser,
      families.courierAssingTime,
      families.deliverStatus.getColumn(),
      families.deliveryStatusUser,
      families.deliveryStatusDate,
      families.courierComments,
      families.callHelper,
      families.callTime,
      families.callComments,
    ],
    rowButtons: [
      {
        name: '',
        cssClass: 'btn glyphicon glyphicon-pencil',
        click: f => this.gridView = !this.gridView
      },
      {
        cssClass: 'btn glyphicon glyphicon-check',
        visible: f => f.deliverStatus.listValue == DeliveryStatus.NotInEvent,
        click: async f => {
          await this.busy.donotWait(async () => {
            f.deliverStatus.listValue = DeliveryStatus.ReadyForDelivery;
            await f.save();
          });
        }
      }
    ]
  });
  familiesInfo = this.families.addArea({
    columnSettings: families => [
      families.name,
      families.familyMembers,
      {
        column: families.language,
        dropDown: {
          items: families.language.getOptions()
        }
      },
      {
        column: families.basketType,
        dropDown: { source: new BasketType() }
      },
      {
        column: families.familySource,
        dropDown: { source: new FamilySources() }
      },
      families.internalComment,
      families.iDinExcel,
      families.deliveryComments,
      families.special.getColumn(),
      families.createUser,
      families.createDate




    ],
  });
  familiesAddress = this.families.addArea({
    columnSettings: families => [
      families.address,
      families.floor,
      families.appartment,
      families.addressComment,
      families.addressByGoogle(),
      families.city

    ]
  });
  phones = this.families.addArea({
    columnSettings: families => [
      families.phone1,
      families.phone1Description,
      families.phone2,
      families.phone2Description
    ]
  });
  callInfo = this.families.addArea({
    columnSettings: families => [
      {
        column: families.callStatus,
        dropDown: {
          items: families.callStatus.getOptions()
        }
      },
      families.callHelper,
      families.callTime,
      families.callComments,
    ]
  })
  deliverInfo = this.families.addArea({
    columnSettings: families => [
      families.courier.getColumn(this.selectService),
      {
        caption: 'טלפון משנע',
        getValue: f => f.lookup(new Helpers(), f.courier).phone.value
      },
      families.courierAssignUser,
      families.courierAssingTime,
      families.deliverStatus.getColumn(),
      families.deliveryStatusUser,
      families.deliveryStatusDate,
      families.courierComments,
    ]
  });
  gridView = true;
  constructor(private dialog: DialogService, private selectService: SelectService, private san: DomSanitizer, public busy: BusyService) {

    let y = dialog.newsUpdate.subscribe(() => {
      this.refreshStats();
    });
    this.onDestroy = () => {
      y.unsubscribe();
    };
    if (dialog.isScreenSmall())
      this.gridView = false;
  }
  onDestroy = () => { };

  ngOnDestroy(): void {
    this.onDestroy();
  }
  basketStats: statsOnTab = {
    name: 'טרם שויכו לפי סלים',
    rule: f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('')),
    stats: [
      this.stats.ready,
      this.stats.special
    ]
  };
  statTabs: statsOnTab[] = [
    {
      name: 'באירוע',
      rule: f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id),
      stats: [
        this.stats.ready,
        this.stats.special,
        this.stats.onTheWay,
        this.stats.delivered,
        this.stats.problem,
        this.stats.frozen
      ]
    },
    this.basketStats
    ,
    {
      name: 'הערות',
      rule: f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id),
      stats: [
        this.stats.deliveryComments,
        this.stats.phoneComments
      ]
    },
    {
      rule: f => undefined,
      name: 'כל המשפחות',
      stats: [
        this.stats.currentEvent,
        this.stats.notInEvent
      ]
    }/*,
    {
      name: 'טלפניות',
      rule: f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id),
      stats: [
        this.stats.phoneReady,
        this.stats.phoneAssigned,
        this.stats.phoneOk,
        this.stats.phoneFailed
      ]
    }*/

  ]
  tabChanged() {
    this.currentStatFilter = undefined;
    this.families.getRecords();
    this.updateChart();
  }

  updateChart() {
    this.pieChartData = [];
    this.pieChartStatObjects = [];
    this.pieChartLabels.splice(0);
    this.colors[0].backgroundColor.splice(0);
    let stats = this.statTabs[this.myTab.selectedIndex].stats;

    stats.forEach(s => {
      if (s.value > 0) {
        this.pieChartLabels.push(s.name + ' ' + s.value);
        this.pieChartData.push(s.value);
        if (s.color != undefined)
          this.colors[0].backgroundColor.push(s.color);
        this.pieChartStatObjects.push(s);
      }
    });
    if (this.colors[0].backgroundColor.length == 0) {
      this.colors[0].backgroundColor.push(colors.green, colors.blue, colors.yellow, colors.red, colors.orange, colors.gray);
    }
  }
  refreshStats() {

    this.busy.donotWait(async () => this.stats.getData().then(baskets => {
      this.basketStats.stats.splice(0);
      baskets.forEach(b => {
        let fs = new FaimilyStatistics(b.name, f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.basketType.isEqualTo(b.id))), undefined);
        fs.value = b.unassignedFamilies;
        this.basketStats.stats.push(fs);

      });

      this.updateChart();
    }));
  }
  @ViewChild('myTab') myTab: MatTabGroup;

  ngOnInit() {

    this.refreshStats();


  }
  statTotal(t: statsOnTab) {
    let r = 0;
    t.stats.forEach(x => r += +x.value);
    return r;
  }

  [reuseComponentOnNavigationAndCallMeWhenNavigatingToIt]() {
    this.refresh();
  }
  refresh() {
    this.families.getRecords();
    this.refreshStats();
  }

  static route: Route = {
    path: 'families',
    component: FamiliesComponent,
    data: { name: 'משפחות' }, canActivate: [AdminGuard]
  }

}

interface statsOnTab {
  name: string,
  stats: FaimilyStatistics[],
  rule: (f: Families) => FilterBase
}



