import { Component, OnInit } from '@angular/core';
import { UserFamiliesList } from './user-families';
import { Route } from '@angular/router';

import { BusyService, RouteHelperService } from '@remult/angular';
import { remult, Remult, UserInfo } from 'remult';

import { Helpers } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';

import { LoginComponent } from '../users/login/login.component';
import { AuthService } from '../auth/auth-service';
import { Event } from '../events/events';
import { SignedInAndNotOverviewGuard } from '../auth/guards';
import { OrgEventsComponent } from '../org-events/org-events.component';
import { Roles } from '../auth/roles';



@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  static route: Route = {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [SignedInAndNotOverviewGuard], data: { name: 'משפחות שלי' }
  };
  familyLists = new UserFamiliesList( this.settings);
  user: UserInfo;

  constructor(public remult: Remult, public settings: ApplicationSettings, private dialog: DialogService, private helper: RouteHelperService, public sessionManager: AuthService,
    private busy: BusyService) {
    this.user = remult.user as UserInfo;
  }
  hasEvents = false;
  moveToOpertunities() {
    this.helper.navigateToComponent(OrgEventsComponent);
  }
  addressHelper() {
    if (this.familyLists.distCenter.address)
      return this.familyLists.distCenter.addressHelper;
    return this.settings.addressHelper
  }
  editSettings() {
    const s = this.settings.$;
    this.dialog.inputAreaDialog({
      title: this.settings.lang.preferences,
      fields: [
        this.settings.$.message1Text,
        this.settings.$.message1Link,
        this.settings.$.message1OnlyWhenDone,
        this.settings.$.message2Text,
        this.settings.$.message2Link,
        this.settings.$.message2OnlyWhenDone,
        this.settings.$.hideVolunteerVideo,
        this.settings.$.messageForDoneDelivery,

        this.settings.$.showDistCenterAsEndAddressForVolunteer,
        this.settings.$.deliveredButtonText,
        this.settings.$.commentForSuccessDelivery,
        this.settings.$.showLeftThereButton,
        this.settings.$.commentForSuccessLeft,
        this.settings.$.problemButtonText,
        this.settings.$.commentForProblem,

        [this.settings.$.questionForVolunteer1Caption, this.settings.$.questionForVolunteer1Values],
        [this.settings.$.questionForVolunteer2Caption, this.settings.$.questionForVolunteer2Values],
        [this.settings.$.questionForVolunteer3Caption, this.settings.$.questionForVolunteer3Values],
        [this.settings.$.questionForVolunteer4Caption, this.settings.$.questionForVolunteer4Values],
        this.settings.$.askVolunteerForLocationOnDelivery,
        this.settings.$.askVolunteerForAPhotoToHelp,
        this.settings.$.questionForVolunteerWhenUploadingPhoto,
        this.settings.$.AddressProblemStatusText,
        this.settings.$.NotHomeProblemStatusText,
        this.settings.$.DoNotWantProblemStatusText,
        this.settings.$.OtherProblemStatusText
      ],
      ok: () => this.settings.save(),
      cancel: () => this.settings._.undoChanges()
    });
  }
  isAdmin() {
    return remult.isAllowed(Roles.admin);
  }
  async ngOnInit() {

    let done = ''
    try {
      done += '1';
      let id = remult.user.id;
      if (this.user.theHelperIAmEscortingId && this.user.theHelperIAmEscortingId.trim().length > 0)
        id = this.user.theHelperIAmEscortingId;
      done += '2';
      let helper = await remult.repo(Helpers).findId(id, { useCache: false });
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
      if (remult.user)
        info += " user: " + remult.user.name;
      else
        info += " NO USER ";
      this.dialog.exception("My Families: " + this.settings.lang.smsLoginFailed + info, err);
      this.sessionManager.signout();
      this.helper.navigateToComponent(LoginComponent);

    }
    this.busy.donotWait(async () => {
      this.hasEvents = (await remult.repo(Event).count()) > 0;
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