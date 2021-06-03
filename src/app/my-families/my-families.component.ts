import { Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { UserFamiliesList } from './user-families';
import { Route } from '@angular/router';

import { RouteHelperService } from '@remult/angular';
import { Context } from '@remult/core';

import { HelperId, Helpers, HelperUserInfo } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';

import { LoginComponent } from '../users/login/login.component';
import { AuthService } from '../auth/auth-service';
import { Event, eventStatus, volunteersInEvent } from '../events/events';
import { SignedInAndNotOverviewGuard } from '../auth/roles';
import { MatExpansionPanel } from '@angular/material/expansion';
import { Phone } from "../model-shared/Phone";



@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  static route: Route = {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [SignedInAndNotOverviewGuard], data: { name: 'משפחות שלי' }
  };
  familyLists = new UserFamiliesList(this.context, this.settings);
  user: HelperUserInfo;

  constructor(public context: Context, public settings: ApplicationSettings, private dialog: DialogService, private helper: RouteHelperService, public sessionManager: AuthService) {
    this.user = context.user as HelperUserInfo;
  }
  async ngOnInit() {

    let done = ''
    try {
      done += '1';
      let id = this.context.user.id;
      if (this.user.theHelperIAmEscortingId && this.user.theHelperIAmEscortingId.trim().length > 0)
        id = this.user.theHelperIAmEscortingId;
      done += '2';
      let helper = await this.context.for(Helpers).findFirst(h => h.id.isEqualTo(id));
      if (helper)
        done += 'helper id:' + helper.id;
      else done += "3";

      await this.familyLists.initForHelper(helper);
      if (this.settings.showDeliverySummaryToVolunteerOnFirstSignIn) {
        let comments = this.familyLists.toDeliver.filter(d => d.deliveryComments);
        if (comments) {
          let date = new Date().toDateString();
          let displayed: { id: string, comment: string, displayedOn: string }[] = [];
          let storageValue = localStorage.getItem("last-summary-display");
          if (storageValue)
            displayed = JSON.parse(storageValue);
          if (comments.filter(x => !displayed.find(d => d.id == x.id && d.comment == x.deliveryComments && d.displayedOn == date)).length > 0) {
            await this.familyLists.showBasketSummary();
            displayed = comments.map(x => ({ id: x.id, comment: x.deliveryComments, displayedOn: date }));
            localStorage.setItem("last-summary-display", JSON.stringify(displayed));

          }

        }
      }
      done += '4';
    }
    catch (err) {
      let info = done += " - " + checkCookie();
      if (this.context.user)
        info += " user: " + this.context.user.name;
      else
        info += " NO USER ";
      this.dialog.exception("My Families: " + this.settings.lang.smsLoginFailed + info, err);
      this.sessionManager.signout();
      this.helper.navigateToComponent(LoginComponent);

    }
    this.context.for(Event).find({ orderBy: e => [e.eventDate, e.startTime], where: e => e.eventStatus.isEqualTo(eventStatus.active) }).then(x => this.events = x);
  }
  @ViewChildren(MatExpansionPanel) lines: QueryList<MatExpansionPanel>;

  volunteerEvents = new Map<string, volunteersInEvent>();
  volunteerInEvent(e: Event) {
    let r = this.volunteerEvents.get(e.id);
    if (!r) {
      this.volunteerEvents.set(e.id, r = this.context.for(volunteersInEvent).create());
      this.context.for(volunteersInEvent).findFirst(ve => ve.eventId.isEqualTo(e.id).and(ve.helper.isEqualTo(this.familyLists.helper))).then(ev => {
        if (ev) {
          this.volunteerEvents.set(e.id, ev);
          let index = this.events.indexOf(e);
          if (index >= 0) {
            this.lines.forEach((x, i) => {
              if (i == index)
                x.open();
            })
          }
        }
      });
    }
    return r;
  }
  getAddress(e: Event) {
    if (e.addressHelper.ok())
      return e.addressHelper;
    return this.settings.addressHelper;
  }
  getPhone(e: Event) {
    if (e.phone1)
      return e.phone1;
    return this.settings.helpPhone;
  }
  sendWhatsapp(phone: string) {
    Phone.sendWhatsappToPhone(phone, '', this.context);
  }

  async registerToEvent(e: Event) {
    let ev = this.volunteerInEvent(e);
    if (ev.isNew()) {
      ev.eventId = e.id;
      ev.helper = this.familyLists.helper;
      await ev.save();
      e.registeredVolunteers++;
    }
  }
  async cancelEvent(e: Event) {
    let ev = this.volunteerInEvent(e);
    if (!ev.isNew()) {
      await ev.delete();
      e.registeredVolunteers--;
      this.volunteerEvents.set(e.id, undefined);
    }
  }
  events: Event[] = [];


}


function checkCookie() {
  var cookieEnabled = navigator.cookieEnabled;
  if (!cookieEnabled) {
    document.cookie = "testcookie=1234";
    cookieEnabled = document.cookie.indexOf("testcookie=1234") != -1;
  }
  if (cookieEnabled)
    return "cookies are ok"
  else return "cookies don't work";
}