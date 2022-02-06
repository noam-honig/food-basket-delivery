import { Component, OnInit, OnDestroy } from '@angular/core';

import { UserFamiliesList } from '../my-families/user-families';
import * as chart from 'chart.js';

import { BusyService, openDialog } from '@remult/angular';
import { Helpers } from '../helpers/helpers';


import { Remult } from 'remult';
import { distCenterAdminGuard } from '../auth/guards';

import { Route } from '@angular/router';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { SendSmsAction } from '../asign-family/send-sms-action';

import { colors } from '../families/stats-action';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { getLang } from '../sites/sites';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { DeliveryFollowUpController, helperFollowupInfo } from './delivery-follow-up.controller';



@Component({
  selector: 'app-delivery-follow-up',
  templateUrl: './delivery-follow-up.component.html',
  styleUrls: ['./delivery-follow-up.component.scss']
})
export class DeliveryFollowUpComponent implements OnInit, OnDestroy {
  static route: Route = {
    path: 'delivery-follow-up', component: DeliveryFollowUpComponent, canActivate: [distCenterAdminGuard]
  }
  async deliveryDetails(c: helperFollowupInfo) {
    let h = await this.remult.repo(Helpers).findId(c.id);
    await openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
    this.refresh();
  }

  familyLists = new UserFamiliesList(this.remult, this.settings);
  currentlHelper: helperFollowupInfo;
  async selectCourier(c: helperFollowupInfo) {
    this.currentlHelper = c;
    let h = await this.remult.repo(Helpers).findId(c.id);
    if (!h) {//if there is a row with an invalid helper id - I want it to at least work
      h.id = c.id;
    }

    this.familyLists.initForHelper(h);

  }
  seeAllCenters() {
    return !this.dialog.distCenter;
  }
  searchString: string;
  showHelper(h: helperFollowupInfo) {
    return ((!this.searchString || (h.name && h.name.toLowerCase().indexOf(this.searchString.toLowerCase()) >= 0)) && (!this.currentStatFilter || this.currentStatFilter.rule(h)));
  }
  public pieChartLabels: string[] = [];
  public pieChartData: number[] = [];
  pieChartStatObjects: DeliveryStatistic[] = [];
  public colors: Array<any> = [
    {
      backgroundColor: []

    }];

  public pieChartType: chart.ChartType = 'pie';
  currentStatFilter: DeliveryStatistic = undefined;

  options: chart.ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: 'right',
      onClick: (event: MouseEvent, legendItem: any) => {
        this.currentStatFilter = this.pieChartStatObjects[legendItem.index];

        return false;
      }
    },
  };
  public chartClicked(e: any): void {
    if (e.active && e.active.length > 0) {
      this.currentStatFilter = this.pieChartStatObjects[e.active[0]._index];

    }
  }
  clearFilter() {
    this.currentStatFilter = undefined;

  }
  refresh() {
    this.refreshStats();

  }
  helpers: helperFollowupInfo[] = [];
  async sendSmsToAll() {
    if (await this.dialog.YesNoPromise(this.settings.lang.shouldSendSmsTo + " " + this.stats.notOutYet.value + " " + this.settings.lang.volunteers + "?")) {
      await this.busy.doWhileShowingBusy(async () => {

        for (const h of this.helpers) {
          if (!h.smsWasSent) {
            await SendSmsAction.SendSms(await this.remult.repo(Helpers).findId(h.id), false);
          }
        }
      });
      this.refresh();
    }
  }
  stats = new DeliveryStats(this.remult);
  updateChart() {
    this.stats = new DeliveryStats(this.remult);

    for (const h of this.helpers) {
      this.stats.process(h);
    }
    this.pieChartData = [];
    this.pieChartStatObjects = [];
    this.pieChartLabels.splice(0);
    this.colors[0].backgroundColor.splice(0);

    this.hasChart = false;
    [
      this.stats.notOutYet,
      this.stats.onTheWay,
      this.stats.smsNotOpenedYet,
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
  async refreshStats() {
    this.helpers = await DeliveryFollowUpController.helpersStatus(this.dialog.distCenter);
    this.updateChart();

  }



  constructor(private busy: BusyService, private remult: Remult, private dialog: DialogService, public settings: ApplicationSettings) {

    dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);
  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }


  ngOnInit() {

    this.refreshStats();

  }



}


export class DeliveryStats {
  process(h: helperFollowupInfo) {
    for (let s in this) {
      let x: any = this[s];
      if (x instanceof DeliveryStatistic) {
        x.loadFrom(h);
      }
    }
  }
  constructor(private remult: Remult) {

  }
  notOutYet = new DeliveryStatistic(getLang(this.remult).smsNotSent, f => f.inProgress >= 1 && !f.smsWasSent, colors.blue);
  onTheWay = new DeliveryStatistic(getLang(this.remult).onTheWay, f => f.inProgress >= 1 && f.smsWasSent && f.viewedSms, colors.blue);
  smsNotOpenedYet = new DeliveryStatistic(getLang(this.remult).smsNotOpened, f => f.inProgress >= 1 && f.smsWasSent && !f.viewedSms, colors.yellow);
  delivered = new DeliveryStatistic(getLang(this.remult).doneVolunteers, f => f.inProgress == 0 && f.problem == 0, colors.green);
  problem = new DeliveryStatistic(getLang(this.remult).problems, f => f.problem > 0, colors.red);
}
export class DeliveryStatistic {
  constructor(public name: string, public rule: (f: helperFollowupInfo) => boolean, public color: string) {

  }
  value = 0;
  async loadFrom(h: helperFollowupInfo) {
    if (this.rule(h))
      this.value++;;
  }

}

