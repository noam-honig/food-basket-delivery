import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  Inject,
  NgZone,
  inject
} from '@angular/core'

import { UserFamiliesList } from '../my-families/user-families'

import { BusyService, openDialog } from '../common-ui-elements'
import { Helpers } from '../helpers/helpers'

import { remult } from 'remult'
import { distCenterAdminGuard } from '../auth/guards'

import { Route } from '@angular/router'
import { DialogService, DestroyHelper } from '../select-popup/dialog'
import { SendSmsAction } from '../asign-family/send-sms-action'

import { colors } from '../families/stats-action'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { getLang } from '../sites/sites'
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component'
import {
  DeliveryFollowUpController,
  helperFollowupInfo
} from './delivery-follow-up.controller'
import { Roles } from '../auth/roles'
import { MessageTemplate } from '../edit-custom-message/messageMerger'
import { BaseChartDirective } from 'ng2-charts'
import { PieHelper } from './pie-helper'

@Component({
  selector: 'app-delivery-follow-up',
  templateUrl: './delivery-follow-up.component.html',
  styleUrls: ['./delivery-follow-up.component.scss']
})
export class DeliveryFollowUpComponent implements OnInit, OnDestroy {
  static route: Route = {
    path: 'delivery-follow-up',
    component: DeliveryFollowUpComponent,
    canActivate: [distCenterAdminGuard]
  }
  async deliveryDetails(c: helperFollowupInfo) {
    let h = await remult.repo(Helpers).findId(c.id)
    await openDialog(HelperAssignmentComponent, (x) => (x.argsHelper = h))
    this.refresh()
  }
  destroyHelper = new DestroyHelper()
  ngOnDestroy(): void {
    this.destroyHelper.destroy()
  }
  familyLists = new UserFamiliesList(this.settings, this.destroyHelper)
  currentlHelper: helperFollowupInfo
  async selectCourier(c: helperFollowupInfo) {
    this.currentlHelper = c
    let h = await remult.repo(Helpers).findId(c.id)
    if (!h) {
      //if there is a row with an invalid helper id - I want it to at least work
      h.id = c.id
    }

    this.familyLists.initForHelper(h)
  }
  seeAllCenters() {
    return !this.dialog.distCenter
  }
  searchString: string
  showHelper(h: helperFollowupInfo) {
    return (
      (!this.searchString ||
        (h.name &&
          h.name.toLowerCase().indexOf(this.searchString.toLowerCase()) >=
            0)) &&
      (!this.currentStatFilter || this.currentStatFilter.rule(h))
    )
  }

  pieChartStatObjects: DeliveryStatistic[] = []

  currentStatFilter: DeliveryStatistic = undefined

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined
  pie = new PieHelper({
    click: (index) => {
      this.currentStatFilter = this.pieChartStatObjects[index]
    }
  })
  clearFilter() {
    this.currentStatFilter = undefined
  }
  refresh() {
    this.refreshStats()
  }
  admin() {
    return remult.isAllowed(Roles.admin)
  }
  helpers: helperFollowupInfo[] = []
  async sendSmsToAll() {
    if (
      await this.dialog.YesNoPromise(
        this.settings.lang.shouldSendSmsTo +
          ' ' +
          this.stats.notOutYet.value +
          ' ' +
          this.settings.lang.volunteers +
          '?'
      )
    ) {
      await this.busy.doWhileShowingBusy(async () => {
        for (const h of this.helpers) {
          if (!h.smsWasSent) {
            await SendSmsAction.SendSms(
              await remult.repo(Helpers).findId(h.id),
              false
            )
          }
        }
      })
      this.refresh()
    }
  }
  async sendAttendanceReminderSms() {
    const message = await remult
      .repo(MessageTemplate)
      .findId('simpleAttendanceReminder', { createIfNotFound: true })
    let h = this.helpers.filter((h) => !h.smsWasSent)
    if (h.length == 0) {
      this.dialog.messageDialog('נשלח כבר SMS עם קישור לכולם')
      return
    }
    this.dialog.editCustomMessageDialog({
      helpText:
        'פעולה זו תשלח הודעה למתנדבים אשר טרם נשלח להם SMS עם קישור - כדי להזכיר להם להגיע לארוע החלוקה - אך עדיין לשמור אותם מסומנים כטרם קיבלו SMS ',
      title: getLang().sendAttendanceReminder + ' - ' + h.length,
      message: DeliveryFollowUpController.createMessage(h[0]),
      templateText: message.template,
      buttons: [
        {
          name: 'שמור הודעה',
          click: async ({ templateText }) => {
            message.template = templateText
            await message.save()
            this.dialog.Info('העדכון נשמר')
          }
        },
        {
          name: 'שלח הודעה',
          click: async ({ templateText, close }) => {
            if (
              await this.dialog.YesNoPromise(
                `לשלוח הודעה ל ${h.length} מתנדבים?`
              )
            ) {
              message.template = templateText
              await message.save()
              let result =
                await DeliveryFollowUpController.sendAttendanceReminder(
                  h.map((h) => h.id)
                )
              this.dialog.Info(result)
              close()
            }
          }
        }
      ]
    })
  }
  stats = new DeliveryStats()
  updateChart() {
    this.stats = new DeliveryStats()

    for (const h of this.helpers) {
      this.stats.process(h)
    }
    this.pieChartStatObjects = []
    this.pie.reset()

    this.hasChart = false
    ;[
      this.stats.notOutYet,
      this.stats.onTheWay,
      this.stats.smsNotOpenedYet,
      this.stats.problem,
      this.stats.delivered
    ].forEach((s) => {
      if (s.value > 0) {
        this.hasChart = true
        this.pie.add(s.name + ' ' + s.value, s.value, s.color)
        this.pieChartStatObjects.push(s)
      }
    })
    this.chart?.update()
  }
  first = true
  hasChart = true
  async refreshStats() {
    this.helpers = await DeliveryFollowUpController.helpersStatus(
      this.dialog.distCenter
    )
    this.updateChart()
  }

  constructor(
    private busy: BusyService,
    private dialog: DialogService,
    public settings: ApplicationSettings
  ) {
    dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper)
  }

  ngOnInit() {
    this.refreshStats()
  }
}

export class DeliveryStats {
  process(h: helperFollowupInfo) {
    for (let s in this) {
      let x: any = this[s]
      if (x instanceof DeliveryStatistic) {
        x.loadFrom(h)
      }
    }
  }
  notOutYet = new DeliveryStatistic(
    getLang().smsNotSent,
    (f) => f.inProgress >= 1 && !f.smsWasSent,
    colors.blue
  )
  onTheWay = new DeliveryStatistic(
    getLang().onTheWay,
    (f) => f.inProgress >= 1 && f.smsWasSent && f.viewedSms,
    colors.blue
  )
  smsNotOpenedYet = new DeliveryStatistic(
    getLang().smsNotOpened,
    (f) => f.inProgress >= 1 && f.smsWasSent && !f.viewedSms,
    colors.yellow
  )
  delivered = new DeliveryStatistic(
    getLang().doneVolunteers,
    (f) => f.inProgress == 0 && f.problem == 0,
    colors.green
  )
  problem = new DeliveryStatistic(
    getLang().problems,
    (f) => f.problem > 0,
    colors.red
  )
}
export class DeliveryStatistic {
  constructor(
    public name: string,
    public rule: (f: helperFollowupInfo) => boolean,
    public color: string
  ) {}
  value = 0
  async loadFrom(h: helperFollowupInfo) {
    if (this.rule(h)) this.value++
  }
}
