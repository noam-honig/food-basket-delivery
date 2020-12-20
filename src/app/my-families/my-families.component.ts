import { Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { UserFamiliesList } from './user-families';
import { Route } from '@angular/router';

import { BusyService, Column, Context, RouteHelperService } from '@remult/core';

import { Helpers, HelperUserInfo } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';

import { LoginComponent } from '../users/login/login.component';
import { AuthService } from '../auth/auth-service';
import { Event, eventStatus, volunteersInEvent } from '../events/events';
import { QRCodeModule } from 'angular2-qrcode';
import { PhoneNumberContext } from 'twilio/lib/rest/lookups/v1/phoneNumber';
import { Roles, SignedInAndNotOverviewGuard } from '../auth/roles';
import { MatExpansionPanel } from '@angular/material';
import { helperHistoryInfo } from '../delivery-history/delivery-history.component';
import { UpdateInfoComponent } from '../users/update-info/update-info.component';
import { getLang } from '../sites/sites';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { HelperGifts, showHelperGifts, showMyGifts } from '../helper-gifts/HelperGifts';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';


@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {
  @ViewChild('c', {
    static: false,

  }) helperfamCom;
  currentUser: Helpers
  static route: Route = {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [SignedInAndNotOverviewGuard], data: { name: 'משפחות שלי' }
  };
  familyLists = new UserFamiliesList(this.context, this.settings);
  user: HelperUserInfo;
  myPhoneNumber: string = '';
  showQRCode: boolean = false;
  goesToHelperPage = false

  helperHistory: helperHistoryInfo
  numberOfDeliveries = 0;
  giftCount = 0;

  myQRCode() {
    return window.location.hostname + '/mlt/reception/?phone=' + this.myPhoneNumber;
  }


  constructor(public context: Context, public settings: ApplicationSettings, private dialog: DialogService, private helper: RouteHelperService, public sessionManager: AuthService, public busy: BusyService) {
    this.user = context.user as HelperUserInfo;
  }


  async ngOnInit() {

    this.currentUser = await (await this.context.for(Helpers).findFirst(i => i.id.isEqualTo(this.context.user.id)));
    
    if (this.settings.isSytemForMlt()) {
      this.numberOfDeliveries = await this.showDeliveryHistory(this.dialog, this.busy, false)
      this.giftCount = await HelperGifts.getMyPendingGiftsCount(this.context.user.id);
    }

    let h = this.currentUser;
    this.myPhoneNumber = h.phone.value;

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
    let r = this.volunteerEvents.get(e.id.value);
    if (!r) {
      this.volunteerEvents.set(e.id.value, r = this.context.for(volunteersInEvent).create());
      this.context.for(volunteersInEvent).findFirst(ve => ve.eventId.isEqualTo(e.id).and(ve.helper.isEqualTo(this.familyLists.helper.id))).then(ev => {
        if (ev) {
          this.volunteerEvents.set(e.id.value, ev);
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
  async registerToEvent(e: Event) {
    let ev = this.volunteerInEvent(e);
    if (ev.isNew()) {
      ev.eventId.value = e.id.value;
      ev.helper.value = this.familyLists.helper.id.value;
      await ev.save();
      e.registeredVolunteers.value++;
    }
  }
  async cancelEvent(e: Event) {
    let ev = this.volunteerInEvent(e);
    if (!ev.isNew()) {
      await ev.delete();
      e.registeredVolunteers.value--;
      this.volunteerEvents.set(e.id.value, undefined);
    }
  }

  homePage() {
    if (this.helperfamCom.familyInfoCurrent) {
      this.helperfamCom.familyInfoCurrent = null;
    }
  }
  myProfile() {
    this.settings.reload()
    this.helper.navigateToComponent(UpdateInfoComponent);
  }
  
  myDeliversDone() {
    this.showDeliveryHistory(this.dialog, this.busy)
  }
  events: Event[] = [];

  async showDeliveryHistory(dialog: DialogService, busy: BusyService, open = true) {
    let ctx = this.context.for((await import('../families/FamilyDeliveries')).FamilyDeliveries);
    let settings = {
      numOfColumnsInGrid: 7,
      knowTotalRows: true,
      allowSelection: true,
      rowButtons: [{

        name: '',
        icon: 'edit',
        showInLine: true,
        click: async fd => {
          fd.showDetailsDialog({

            dialog: dialog
          });
        }
        , textInMenu: () => getLang(this.context).deliveryDetails
      }
      ],

      rowCssClass: fd => fd.deliverStatus.getCss(),
      columnSettings: fd => {
        let r: Column[] = [
          fd.deliverStatus,
          fd.deliveryStatusDate,
          fd.basketType,
          fd.quantity,
          fd.name,
          fd.address,
          fd.courierComments,
          fd.distributionCenter
        ]
        r.push(...fd.columns.toArray().filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.defs.caption.localeCompare(b.defs.caption)));
        return r;
      },
      get: {
        where: fd => (fd.courier.isEqualTo(this.context.user.id).and(fd.deliverStatus.isEqualTo(DeliveryStatus.Success))),
        orderBy: fd => [{ column: fd.deliveryStatusDate, descending: true }],
        limit: (open ? 50 : 9999)
      }
    }
    if (!open) {
      return (await ctx.gridSettings(settings).getRecords()).items.length
    }
    if (open)
      this.context.openDialog(GridDialogComponent, x => x.args = {
        title: getLang(this.context).deliveriesFor + ' ' + this.context.user.name,
        settings: ctx.gridSettings(settings)
      });

  }


  async showMyGifts() {
    this.giftCount = await HelperGifts.getMyPendingGiftsCount(this.context.user.id);
    if (this.giftCount==1) {
      let URL = await HelperGifts.getMyFirstGiftURL(this.context.user.id);
      window.open(URL);
    } else showMyGifts(this.context.user.id, this.context, this.settings, this.dialog, this.busy);
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