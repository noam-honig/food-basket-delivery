import { Component, OnInit } from '@angular/core';
import { HelpersAndStats } from "./HelpersAndStats";
import { AndFilter } from '@remult/core';
import { UserFamiliesList } from '../my-families/user-families';
import * as chart from 'chart.js';
import { DeliveryStatistic, DeliveryStats } from './delivery-stats';
import { BusyService } from '@remult/core';
import { FilterBase } from '@remult/core';
import { Helpers } from '../helpers/helpers';


import { Context } from '@remult/core';
import { Roles, AdminGuard } from '../auth/roles';
import { Route } from '@angular/router';

@Component({
  selector: 'app-delivery-follow-up',
  templateUrl: './delivery-follow-up.component.html',
  styleUrls: ['./delivery-follow-up.component.scss']
})
export class DeliveryFollowUpComponent implements OnInit {
  static route: Route = {
    path: 'delivery-follow-up', component: DeliveryFollowUpComponent, canActivate: [AdminGuard], data: { name: 'מעקב משנעים' }
  }

  familyLists = new UserFamiliesList(this.context);
  currentlHelper: HelpersAndStats;
  async selectCourier(c: HelpersAndStats) {
    this.currentlHelper = c;
    this.familyLists.initForHelper( await this.context.for(Helpers).findFirst(h => h.id.isEqualTo(c.id)));

  }
  searchString: string;
  showHelper(h: HelpersAndStats) {
    return (!this.searchString || h.name.value.indexOf(this.searchString) >= 0);
  }
  public pieChartLabels: string[] = [];
  public pieChartData: number[] = [];
  pieChartStatObjects: DeliveryStatistic[] = [];
  public colors: Array<any> = [
    {
      backgroundColor: []

    }];

  public pieChartType: string = 'pie';
  currentStatFilter: DeliveryStatistic = undefined;

  options: chart.ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: 'right',
      onClick: (event: MouseEvent, legendItem: any) => {
        this.currentStatFilter = this.pieChartStatObjects[legendItem.index];
        this.couriers.getRecords();
        return false;
      }
    },
  };
  public chartClicked(e: any): void {
    if (e.active && e.active.length > 0) {
      this.currentStatFilter = this.pieChartStatObjects[e.active[0]._index];
      this.couriers.getRecords();
    }
  }
  clearFilter() {
    this.currentStatFilter = undefined;
    this.couriers.getRecords();
  }
  refresh() {
    this.refreshStats();
    this.couriers.getRecords();
  }
  stats = new DeliveryStats();
  updateChart() {
    this.pieChartData = [];
    this.pieChartStatObjects = [];
    this.pieChartLabels.splice(0);
    this.colors[0].backgroundColor.splice(0);


    [
      this.stats.notOutYet,
      this.stats.onTheWay,
      this.stats.late,
      this.stats.problem,
      this.stats.delivered
    ].forEach(s => {
      if (s.value > 0) {
        this.pieChartLabels.push(s.name + ' ' + s.value);
        this.pieChartData.push(s.value);
        this.colors[0].backgroundColor.push(s.color);
        this.pieChartStatObjects.push(s);
      }
    });
  }
  refreshStats() {

    this.busy.donotWait(async () => this.stats.getData().then(() => {
      this.updateChart();
    }));
  }
  constructor(private busy: BusyService, private context: Context) { }
  couriers = this.context.for(HelpersAndStats).gridSettings({

    columnSettings: h => [
      h.name, h.phone, h.deliveriesInProgress, h.lastAsignTime
    ],
    get: {
      where: h => {

        let result: FilterBase = undefined;
        let addFilter = (filter: FilterBase) => {
          if (result)
            result = new AndFilter(result, filter);
          else result = filter;
        }

        if (this.currentStatFilter) {
          addFilter(this.currentStatFilter.rule(h));
        } else {
          addFilter(h.allFamilies.isGreaterOrEqualTo(1))
        }

        return result;
      },
      orderBy: h => [{ column: h.lastAsignTime, descending: true }],
      limit: 1000
    }
  });

  ngOnInit() {
    this.couriers.getRecords();
    this.refreshStats();

  }


}
