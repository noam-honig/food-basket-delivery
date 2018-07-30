import { Component, OnInit, ViewChild, Sanitizer } from '@angular/core';
import { GridSettings, ColumnSetting, ColumnHashSet, Filter, AndFilter } from 'radweb';
import { Families, Helpers, CallStatus, BasketType, FamilySources, DeliveryStatus, HasAsyncGetTheValue, Language, YesNo, FamilyDeliveryEventsView } from '../models';
import { SelectService } from '../select-popup/select-service';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';

import { DomSanitizer } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { FilterBase } from 'radweb/utils/dataInterfaces1';
import { foreachEntityItem, foreachSync } from '../shared/utils';
import { BusyService } from '../select-popup/busy-service';
import { async } from '../../../node_modules/@types/q';
import * as chart from 'chart.js';
import { Stats, FaimilyStatistics } from './stats-action';
import { MatTabGroup } from '../../../node_modules/@angular/material';

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
  public colors: Array<any> = [
    {
      backgroundColor: [

        '#FDE098'//yello
        , '#84C5F1'//blue
        , '#91D7D7'//green
        , '#FD9FB3'//red
      ]

    }];

  public pieChartType: string = 'pie';
  currentStatFilter: FaimilyStatistics = undefined;

  options: chart.ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: 'right',
      onClick: (event: MouseEvent, legendItem: any) => {
        this.currentStatFilter = this.statTabs[this.myTab.selectedIndex].stats[legendItem.index];
        this.families.getRecords();
        return false;
      }
    },
  };
  public chartClicked(e: any): void {
    if (e.active && e.active.length > 0) {
      this.currentStatFilter = this.statTabs[this.myTab.selectedIndex].stats[e.active[0]._index];
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

  previousDeliveryEvents: FamilyDeliveryEventsView[] = [];
  families = new GridSettings(new Families(), {

    allowUpdate: true,
    allowInsert: true,
    numOfColumnsInGrid: 5,
    onEnterRow: async f => {
      if (f.isNew()) {
        f.basketType.value = '';
        f.language.listValue = Language.Hebrew;
        f.deliverStatus.listValue = DeliveryStatus.ReadyForDelivery;
        f.callStatus.listValue = CallStatus.NotYet;
        f.special.listValue = YesNo.No;
      } else {
        let p = new FamilyDeliveryEventsView();
        await this.busy.donotWait(async () =>
          this.previousDeliveryEvents = await p.source.find({ where: p.family.isEqualTo(f.id), orderBy: [{ column: p.deliveryDate, descending: true }] }));
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
        width: '150'
      },

      {
        column: families.familyMembers,
        width: '50'
      },
      {
        column: families.language,
        dropDown: {
          items: families.language.getOptions()
        },
        width: '100'
      },
      {
        column: families.basketType,
        dropDown: { source: new BasketType() },
        width: '100'
      },

      {
        caption: 'שינוע',
        getValue: f => f.getDeliveryDescription()
      }, {
        column: families.familySource,
        dropDown: { source: new FamilySources() }
      },
      families.internalComment,
      families.deliveryComments,
      families.special.getColumn(),
      families.createUser,
      families.createDate,
      families.address,
      families.floor,
      families.appartment,
      families.addressComment,
      families.city,
      families.addressByGoogle(),
      families.phone1,
      families.phone1Description,
      families.phone2,
      families.phone2Description,
      families.courier.getColumn(this.dialog),
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
      families.courier.getColumn(this.dialog),
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
  constructor(private dialog: SelectService, private san: DomSanitizer, public busy: BusyService) {
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
  statTabs: statsOnTab[] = [
    {
      name: 'באירוע',
      rule: f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id),
      stats: [
        this.stats.ready,
        this.stats.onTheWay,
        this.stats.delivered,
        this.stats.problem,
        this.stats.frozen
      ]
    },
    {
      name: 'חמ"ל',
      rule: f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id),
      stats: [
        this.stats.phoneReady,
        this.stats.phoneAssigned,
        this.stats.phoneOk,
        this.stats.phoneFailed
      ]
    }
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
    }

  ]
  tabChanged() {
    this.currentStatFilter = undefined;
    this.families.getRecords();
    this.updateChart();
  }

  updateChart() {
    this.pieChartData = [];
    this.pieChartLabels.splice(0);
    let stats = this.statTabs[this.myTab.selectedIndex].stats;

    stats.forEach(s => {
      this.pieChartLabels.push(s.name + ' ' + s.value);
      this.pieChartData.push(s.value);
    });
  }
  refreshStats() {

    this.busy.donotWait(async () => this.stats.getData().then(() => {
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


  static route = 'families';
  static caption = 'משפחות';


}

interface statsOnTab {
  name: string,
  stats: FaimilyStatistics[],
  rule: (f: Families) => Filter
}



