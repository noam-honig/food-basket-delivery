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
import { Roles, AdminGuard, distCenterAdminGuard } from '../auth/roles';
import { Route } from '@angular/router';
import { DialogService } from '../select-popup/dialog';
import { SendSmsAction } from '../asign-family/send-sms-action';

@Component({
  selector: 'app-delivery-follow-up',
  templateUrl: './delivery-follow-up.component.html',
  styleUrls: ['./delivery-follow-up.component.scss']
})
export class DeliveryFollowUpComponent implements OnInit {
  static route: Route = {
    path: 'delivery-follow-up', component: DeliveryFollowUpComponent, canActivate: [distCenterAdminGuard], data: { name: 'מעקב משנעים' }
  }

  familyLists = new UserFamiliesList(this.context);
  currentlHelper: HelpersAndStats;
  async selectCourier(c: HelpersAndStats) {
    this.currentlHelper = c;
    this.familyLists.initForHelper(await this.context.for(Helpers).findFirst(h => h.id.isEqualTo(c.id)));

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
  async sendSmsToAll() {
    if (await this.dialog.YesNoPromise("האם לשלוח הודעת SMS ל" + this.stats.notOutYet.value + " מתנדבים?")) {
      await this.busy.doWhileShowingBusy(async () => {
        await this.couriers.getRecords();
        for (const h of this.couriers.items) {
          if (!h.gotSms.value) {
            await SendSmsAction.SendSms(h.id.value, false);
          }
        }
      });
      this.refresh();
    }
  }
  stats = new DeliveryStats();
  updateChart() {
    this.pieChartData = [];
    this.pieChartStatObjects = [];
    this.pieChartLabels.splice(0);
    this.colors[0].backgroundColor.splice(0);

    this.hasChart = false;
    [
      this.stats.notOutYet,
      this.stats.onTheWay,
      this.stats.late,
      this.stats.problem,
      this.stats.delivered
    ].forEach(s => {
      if (s.value > 0) {
        this.hasChart = true;
        this.pieChartLabels.push(s.name + ' ' + s.value);
        this.pieChartData.push(s.value);
        this.colors[0].backgroundColor.push(s.color);
        this.pieChartStatObjects.push(s);
      }
    });
  }
  hasChart = true;
  refreshStats() {

    this.busy.donotWait(async () => this.stats.getData(this.dialog.distCenter.value).then(() => {
      this.updateChart();
    }));
  }
  constructor(private busy: BusyService, private context: Context, private dialog: DialogService) {

    dialog.onDistCenterChange(() => this.refresh(), this);
  }
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
        addFilter(h.distributionCenter.filter(this.dialog.distCenter.value));

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
