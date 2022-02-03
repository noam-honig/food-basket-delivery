import { Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { UserFamiliesList } from './user-families';
import { Route } from '@angular/router';

import { BusyService, RouteHelperService } from '@remult/angular';
import { Remult, UserInfo } from 'remult';

import { Helpers } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';

import { LoginComponent } from '../users/login/login.component';
import { AuthService } from '../auth/auth-service';
import { Event, eventStatus, volunteersInEvent } from '../events/events';
import { SignedInAndNotOverviewGuard } from '../auth/roles';
import { MatExpansionPanel } from '@angular/material/expansion';
import { Phone } from "../model-shared/phone";
import { OrgEventsComponent } from '../org-events/org-events.component';



@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  static route: Route = {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [SignedInAndNotOverviewGuard], data: { name: 'משפחות שלי' }
  };
  familyLists = new UserFamiliesList(this.remult, this.settings);
  user: UserInfo;

  constructor(public remult: Remult, public settings: ApplicationSettings, private dialog: DialogService, private helper: RouteHelperService, public sessionManager: AuthService,
    private busy: BusyService) {
    this.user = remult.user as UserInfo;
  }
  hasEvents = false;
  moveToOpertunities() {
    this.helper.navigateToComponent(OrgEventsComponent);
  }
  async ngOnInit() {

    let done = ''
    try {
      done += '1';
      let id = this.remult.user.id;
      if (this.user.theHelperIAmEscortingId && this.user.theHelperIAmEscortingId.trim().length > 0)
        id = this.user.theHelperIAmEscortingId;
      done += '2';
      let helper = await this.remult.repo(Helpers).findId(id, { useCache: false });
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
      if (this.remult.user)
        info += " user: " + this.remult.user.name;
      else
        info += " NO USER ";
      this.dialog.exception("My Families: " + this.settings.lang.smsLoginFailed + info, err);
      this.sessionManager.signout();
      this.helper.navigateToComponent(LoginComponent);

    }
    this.busy.donotWait(async () => {
      this.hasEvents = (await this.remult.repo(Event).count()) > 0;
    });
  }







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