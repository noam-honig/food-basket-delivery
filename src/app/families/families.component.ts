import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { ColumnHashSet, AndFilter, ColumnSetting } from 'radweb';
import { FamilyDeliveryEventsView } from "./FamilyDeliveryEventsView";
import { Families } from './families';
import { DeliveryStatus } from "./DeliveryStatus";
import { CallStatus } from "./CallStatus";
import { YesNo } from "./YesNo";
import { Language } from "./Language";
import { FamilySources } from "./FamilySources";
import { BasketType } from "./BasketType";
import { SelectService } from '../select-popup/select-service';
import { DialogService } from '../select-popup/dialog';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';

import { DomSanitizer } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { FilterBase } from 'radweb';
import { foreachSync } from '../shared/utils';
import { BusyService } from '../select-popup/busy-service';
import * as chart from 'chart.js';
import { Stats, FaimilyStatistics, colors } from './stats-action';
import { MatTabGroup } from '@angular/material';
import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt, leaveComponent } from '../custom-reuse-controller-router-strategy';
import { HasAsyncGetTheValue } from '../model-shared/types';
import { Helpers } from '../helpers/helpers';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { Context } from '../shared/context';
import { Routable, componentRoutingInfo } from '../shared/routing-helper';

@Component({
  selector: 'app-families',
  templateUrl: './families.component.html',
  styleUrls: ['./families.component.scss']
})
@Routable({
  path: 'families',
  caption: 'משפחות',
  canActivate: [HolidayDeliveryAdmin]
})
export class FamiliesComponent implements OnInit {
  @Input() problemOnly = false;
  limit = 10;
  addressByGoogleColumn: ColumnSetting<Families>;
  familyNameColumn: ColumnSetting<Families>;
  familyAddressColumn: ColumnSetting<Families>;
  addressCommentColumn: ColumnSetting<Families>;
  constructor(private dialog: DialogService, private san: DomSanitizer, public busy: BusyService, private context: Context, private selectService: SelectService) {
    this.doTest();

    let y = dialog.refreshStatusStats.subscribe(() => {
      this.refreshStats();
    });
    this.onDestroy = () => {
      y.unsubscribe();
    };
    if (dialog.isScreenSmall())
      this.gridView = false;
  }
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

    await foreachSync(await this.context.for(Families).find({ limit: 5000, orderBy: f => [f.name] })
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

  previousDeliveryEvents: FamilyDeliveryEventsView[] = [];
  families = this.context.for(Families).gridSettings({

    allowUpdate: true,
    allowInsert: true,
    rowCssClass: f => f.deliverStatus.getCss(),
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
        if (this.problemOnly) {
          addFilter(f.addressOk.isEqualTo(false));
        }
        return result;
      }
      , orderBy: f => f.name
    },
    hideDataArea: true,
    knowTotalRows: true,
    allowDelete: true,

    confirmDelete: (h, yes) => this.dialog.confirmDelete('משפחת ' + h.name.value, yes),
    columnSettings: families => {
      return [

        this.familyNameColumn = {
          column: families.name,
          width: '200'
        },
        this.familyAddressColumn = {
          column: families.address,
          width: '250',
          cssClass: f => {
            if (f.getGeocodeInformation().partialMatch())
              return 'addressProblem';
            return '';
          }
        },
        families.basketType.getColumn()
        ,
        {
          caption: 'שינוע',
          getValue: f => f.getDeliveryDescription(),
          width: '200'
        },

        {
          column: families.familyMembers,

        },

        {
          column: families.language,
          dropDown: {
            items: families.language.getOptions()
          },

        }, families.familySource.getColumn(),
        {
          column: families.internalComment,
          width: '300'
        },
        families.tz,
        families.iDinExcel,
        families.deliveryComments,
        families.special.getColumn(),
        families.createUser,
        families.createDate,

        families.addressOk,
        families.floor,
        families.appartment,
        this.addressCommentColumn = { column: families.addressComment },
        families.city,
        this.addressByGoogleColumn = families.addressByGoogle(),
        {
          caption: 'מה הבעיה של גוגל',
          getValue: f => f.getGeocodeInformation().whyProblem()
        },
        families.phone1,
        families.phone1Description,
        families.phone2,
        families.phone2Description,
        families.courier.getColumn(this.selectService),
        families.fixedCourier.getColumn(this.selectService),
        {
          caption: 'טלפון משנע',
          getValue: f => this.context.for(Helpers).lookup(f.courier).phone.value
        },
        families.courierAssignUser,
        families.courierAssingTime,
        families.deliverStatus.getColumn(),
        families.deliveryStatusUser,
        families.deliveryStatusDate,
        families.courierComments,
        families.getPreviousDeliveryColumn(),

      ];
    },
    rowButtons: [
      {
        name: '',
        cssClass: 'btn glyphicon glyphicon-pencil',
        click: f => this.gridView = !this.gridView
      },
      {
        name: 'חפש כתובת בגוגל',
        cssClass: 'btn btn-success',
        click: f => f.openGoogleMaps(),
        visible: f => this.problemOnly
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

  gridView = true;


  async doTest() {
  }

  onDestroy = () => { };

  ngOnDestroy(): void {
    this.onDestroy();
  }
  basketStats: statsOnTab = {
    name: 'נותרו לפי סלים',
    rule: f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('')),
    stats: [
      this.stats.ready,
      this.stats.special
    ]
  };
  cityStats: statsOnTab = {
    name: 'נותרו לפי ערים',
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
    this.cityStats,
    this.basketStats,

    {
      name: 'הערות',
      rule: f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.courierComments.IsDifferentFrom('')),
      stats: [
        this.stats.deliveryComments
      ]
    },
    {
      rule: f => undefined,
      name: 'כל המשפחות',
      stats: [
        this.stats.currentEvent,
        this.stats.notInEvent
      ]
    }
  ]
  tabChanged() {
    this.currentStatFilter = undefined;
    this.families.getRecords();
    this.updateChart();
  }
  clearStat() {
    this.currentStatFilter = undefined;
    this.families.getRecords();

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
    if (this.pieChartData.length == 0) {
      this.pieChartData.push(0);
      this.pieChartLabels.push('ריק');
    }
    if (this.colors[0].backgroundColor.length == 0) {
      this.colors[0].backgroundColor.push(colors.green, colors.blue, colors.yellow, colors.red, colors.orange, colors.gray);
    }
  }
  refreshStats() {
    if (this.suspend)
      return;
    if (!this.problemOnly)
      this.busy.donotWait(async () => this.stats.getData().then(st => {
        this.basketStats.stats.splice(0);
        this.cityStats.stats.splice(0);
        st.baskets.forEach(b => {
          let fs = new FaimilyStatistics(b.name, f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.basketType.isEqualTo(b.id))), undefined);
          fs.value = b.unassignedFamilies;
          this.basketStats.stats.push(fs);

        });
        st.cities.forEach(b => {
          let fs = new FaimilyStatistics(b.name, f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.city.isEqualTo(b.name))), undefined);
          fs.value = b.count;
          this.cityStats.stats.push(fs);

        });

        this.updateChart();
      }));
  }
  @ViewChild('myTab') myTab: MatTabGroup;

  ngOnInit() {

    this.refreshStats();
    if (this.problemOnly) {
      let cols = this.families.columns;
      let problemColumns = [
        this.familyNameColumn,
        this.addressByGoogleColumn,
        this.familyAddressColumn,
        this.addressCommentColumn
      ];
      for (let index = 0; index < problemColumns.length; index++) {
        const item = problemColumns[index];
        let origIndex = cols.items.indexOf(item);
        cols.moveCol(item, -origIndex + index);
      }

      //  debugger;
    }


  }
  statTotal(t: statsOnTab) {
    let r = 0;
    t.stats.forEach(x => r += +x.value);
    return r;
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
    this.families.getRecords();
    this.refreshStats();
  }

  static route: Route = {
    path: 'families',
    component: FamiliesComponent,
    data: { name: 'משפחות' }, canActivate: [HolidayDeliveryAdmin]
  }

}

interface statsOnTab {
  name: string,
  stats: FaimilyStatistics[],
  rule: (f: Families) => FilterBase
}