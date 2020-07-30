import { Component, OnInit, OnDestroy } from '@angular/core';

import { AndFilter, ServerFunction, SqlDatabase } from '@remult/core';
import { UserFamiliesList } from '../my-families/user-families';
import * as chart from 'chart.js';

import { BusyService } from '@remult/core';
import { FilterBase } from '@remult/core';
import { Helpers } from '../helpers/helpers';


import { Context } from '@remult/core';
import { Roles, AdminGuard, distCenterAdminGuard } from '../auth/roles';
import { Route } from '@angular/router';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { allCentersToken } from '../manage/distribution-centers';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { SqlBuilder, relativeDateName } from '../model-shared/types';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { colors } from '../families/stats-action';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Language, getLang } from '../translate';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';


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
    let h = await this.context.for(Helpers).findId(c.id);
    await this.context.openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
    this.refresh();
  }

  familyLists = new UserFamiliesList(this.context, this.settings);
  currentlHelper: helperFollowupInfo;
  async selectCourier(c: helperFollowupInfo) {
    this.currentlHelper = c;
    let h = await this.context.for(Helpers).lookupAsync(h => h.id.isEqualTo(c.id));;
    if (h.isNew()) {//if there is a row with an invalid helper id - I want it to at least work
      h.id.value = c.id;
    }

    this.familyLists.initForHelper(h);

  }
  seeAllCenters() {
    return this.dialog.distCenter.value == allCentersToken;
  }
  searchString: string;
  showHelper(h: helperFollowupInfo) {
    return ((!this.searchString || h.name.indexOf(this.searchString) >= 0) && (!this.currentStatFilter || this.currentStatFilter.rule(h)));
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
            await SendSmsAction.SendSms(h.id, false);
          }
        }
      });
      this.refresh();
    }
  }
  stats = new DeliveryStats(this.context);
  updateChart() {
    this.stats = new DeliveryStats(this.context);

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
    this.helpers = await DeliveryFollowUpComponent.helpersStatus(this.dialog.distCenter.value);
    this.updateChart();

  }



  constructor(private busy: BusyService, private context: Context, private dialog: DialogService, public settings: ApplicationSettings) {

    dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);
  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }


  ngOnInit() {

    this.refreshStats();

  }

  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async helpersStatus(distCenter: string, context?: Context, db?: SqlDatabase) {
    let fd = context.for(ActiveFamilyDeliveries).create();
    let h = context.for(Helpers).create();
    var sql = new SqlBuilder();
    let r = await db.execute(sql.build(sql.query({
      from: fd,
      outerJoin: () => [{ to: h, on: () => [sql.eq(fd.courier, h.id)] }],
      select: () => [
        sql.columnWithAlias(fd.courier, 'id'),
        sql.columnWithAlias(h.name, 'couriername'),
        sql.columnWithAlias(h.phone, 'phone'),
        sql.columnWithAlias(h.smsDate, 'smsdate'),
        sql.columnWithAlias(h.lastSignInDate, 'signindate'),
        sql.columnWithAlias(h.eventComment, 'comment1'),
        sql.columnWithAlias(sql.func('max', fd.courierAssingTime), 'maxasign'),
        sql.sumWithAlias(1, 'deliveries', fd.deliverStatus.isDifferentFrom(DeliveryStatus.SelfPickup).and(fd.deliverStatus.isDifferentFrom(DeliveryStatus.SuccessPickedUp))),
        sql.sumWithAlias(1, 'inprogress', fd.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)),
        sql.sumWithAlias(1, 'problem', fd.deliverStatus.isProblem())

      ],
      where: () => [fd.courier.isDifferentFrom('').and(fd.distributionCenter.filter(distCenter))],

    }).replace(/distributionCenter/g, 'e1.distributionCenter'), ' group by ', [fd.courier, h.name, h.phone, h.smsDate, h.eventComment,h.lastSignInDate], ' order by ', sql.func('max', fd.courierAssingTime),' desc'));
    return r.rows.map(r => {
      let smsDate = r['smsdate'];
      let maxAsign = r['maxasign'];
      let signindate = r['signindate'];
      let res: helperFollowupInfo = {
        id: r['id'],
        name: r['couriername'],
        phone: r['phone'],
        deliveries: +r['deliveries'],
        inProgress: +r['inprogress'],
        problem: +r['problem'],
        viewedSms: signindate && smsDate && signindate > smsDate,
        smsDateName: smsDate ? relativeDateName(context, { d: smsDate }) : '',
        smsWasSent: smsDate && smsDate > maxAsign,

        eventComment: r['comment1']
      };
      return res;
    });
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
  constructor(private context: Context) {

  }
  notOutYet = new DeliveryStatistic(getLang(this.context).smsNotSent, f => f.inProgress >= 1 && !f.smsWasSent, colors.blue);
  onTheWay = new DeliveryStatistic(getLang(this.context).onTheWay, f => f.inProgress >= 1 && f.smsWasSent && f.viewedSms, colors.blue);
  smsNotOpenedYet = new DeliveryStatistic(getLang(this.context).smsNotOpened, f => f.inProgress >= 1 && f.smsWasSent && !f.viewedSms, colors.yellow);
  delivered = new DeliveryStatistic(getLang(this.context).doneVolunteers, f => f.inProgress == 0 && f.problem == 0, colors.green);
  problem = new DeliveryStatistic(getLang(this.context).problems, f => f.problem > 0, colors.red);
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



export interface helperFollowupInfo {
  id: string,
  name: string,
  phone: string,
  deliveries: number,
  inProgress: number,
  problem: number,
  smsWasSent: boolean,
  eventComment: string,
  smsDateName: string,
  viewedSms: boolean

}