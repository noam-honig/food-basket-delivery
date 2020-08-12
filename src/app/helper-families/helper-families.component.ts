import { Component, OnInit, Input, ViewChild, Output, EventEmitter, ElementRef } from '@angular/core';
import { BusyService, ServerFunction, StringColumn, GridButton, BoolColumn, ServerContext } from '@remult/core';
import * as copy from 'copy-to-clipboard';
import { UserFamiliesList } from '../my-families/user-families';
import { MapComponent } from '../map/map.component';

import { DeliveryStatus } from "../families/DeliveryStatus";
import { AuthService } from '../auth/auth-service';
import { DialogService } from '../select-popup/dialog';
import { SendSmsAction, SendSmsUtils } from '../asign-family/send-sms-action';

import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { Context } from '@remult/core';
import { Column } from '@remult/core';
import { use, TranslationOptions } from '../translate';
import { Helpers, HelperId } from '../helpers/helpers';
import { UpdateCommentComponent } from '../update-comment/update-comment.component';
import { CommonQuestionsComponent } from '../common-questions/common-questions.component';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { isGpsAddress, Location, toLongLat, GetDistanceBetween } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';
import { pagedRowsIterator } from '../families/familyActionsWiring';
import { Families } from '../families/families';
import { MatTabGroup } from '@angular/material';
import { routeStrategyColumn } from '../asign-family/route-strategy';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { PhoneColumn } from '../model-shared/types';
import { Sites, getLang } from '../sites/sites';
import { SelectListComponent, selectListItem } from '../select-list/select-list.component';
import { lang } from 'moment';

@Component({
  selector: 'app-helper-families',
  templateUrl: './helper-families.component.html',
  styleUrls: ['./helper-families.component.scss']
})
export class HelperFamiliesComponent implements OnInit {
  switchToMap() {
    this.tab.selectedIndex = 1;
  }

  constructor(public auth: AuthService, private dialog: DialogService, public context: Context, private busy: BusyService, public settings: ApplicationSettings) { }
  @Input() familyLists: UserFamiliesList;
  @Input() partOfAssign = false;
  @Input() partOfReview = false;
  @Input() helperGotSms = false;
  @Output() assignmentCanceled = new EventEmitter<void>();
  @Output() assignSmsSent = new EventEmitter<void>();
  @Input() preview = false;
  @ViewChild("theTab", { static: false }) tab: MatTabGroup;
  ngOnInit() {


  }
  volunteerLocation: Location = undefined;
  async updateCurrentLocation(useCurrentLocation: boolean) {

    this.volunteerLocation = undefined;
    if (useCurrentLocation) {
      await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(x => {
          this.volunteerLocation = {
            lat: x.coords.latitude,
            lng: x.coords.longitude
          };
          res();

        }, error => {
          this.dialog.exception("שליפת מיקום נכשלה", error);
          rej(error);
        });
      });

    }
  }

  async refreshRoute() {
    var useCurrentLocation = new BoolColumn(use.language.useCurrentLocationForStart);
    var strategy = new routeStrategyColumn();
    strategy.value = this.settings.routeStrategy.value;

    await this.context.openDialog(InputAreaComponent, x => x.args = {
      title: use.language.replanRoute,
      settings: {
        columnSettings: () => [
          { column: useCurrentLocation, visible: () => !this.partOfAssign && !this.partOfReview && !!navigator.geolocation },
          strategy
        ]
      },
      ok: async () => {
        await this.updateCurrentLocation(useCurrentLocation.value);
        await this.familyLists.refreshRoute({
          strategyId: strategy.value.id,
          volunteerLocation: this.volunteerLocation
        });
      }
    });


  }

  @ServerFunction({ allowed: Roles.indie })
  static async assignFamilyDeliveryToIndie(deliveryId: string, context?: Context) {
    let fd = await context.for(ActiveFamilyDeliveries).find({where : f=> f.id.isEqualTo(deliveryId), limit: 1});
    fd[0].courier.value = context.user.id;
    await fd[0].save();
  }
  
  @ServerFunction({ allowed: Roles.indie })
  static async getDeliveriesByLocation(pivotLocation: Location, context?: Context) {
    let r: DeliveryInList[] = [];
    for await (const d of  context.for(ActiveFamilyDeliveries).iterate({ where: f => f.readyFilter() })) {
      let loc = d.getDrivingLocation();
      let dist = GetDistanceBetween(pivotLocation, loc);

      r.push({
        basketType: await (d.basketType.getTheValue()),
        city: d.city.value,
        floor: d.floor.value,
        quantity: d.quantity.value,
        id: d.id.value,
        familyId: d.family.value,
        location: loc,
        distance: dist
      });
    }
    r.sort((a, b) => {
      if (a.familyId == b.familyId)
        return 0;
      
      if (a.distance == b.distance)     
        if (a.familyId <= b.familyId)
          return (-1)
        else 
          return 1;

      return (a.distance - b.distance);
    });
    r.splice(10);
    return r;
  };
  

  showCloseDeliveries() {
    return (this.context.user.roles.includes(Roles.indie) && this.settings.isSytemForMlt());
  }
  
  async checkCloseDeliveries(item: selectListItem, isSet: boolean, theList: selectListItem[], afdList: DeliveryInList[])  {
    let d: DeliveryInList = afdList[item.item];
    let pivotLocation = d.location;
    let pivotFamily = d.familyId;
    theList.forEach((x) => {
      let distanceFromPivot = GetDistanceBetween(pivotLocation, afdList[x.item].location);
      let isSameFamily = (pivotFamily == afdList[x.item].familyId);
      if ((isSameFamily) || ((distanceFromPivot == 0) && isSet))
        x.selected = isSet;
    });
  }


  async assignNewDelivery() {
    await this.updateCurrentLocation(true);
    let afdList = await (HelperFamiliesComponent.getDeliveriesByLocation(this.volunteerLocation));

    await this.context.openDialog(SelectListComponent, x => {
      x.args = {
        title: use.language.closestDeliveries + ' (' + use.language.mergeFamilies + ')',
        multiSelect: true,
        onSelect: async (d, isSelected, theList) => this.checkCloseDeliveries(d, isSelected, theList, afdList),
        options: afdList.map((x,i) => ({
          item: i,
          selected: false,
          name:
            x.distance.toFixed(1) + use.language.km +
            (x.city ? ' (' + x.city + ')' : '') +
            (x.floor ? ' [' + use.language.floor + ' ' + x.floor + ']' : '') +
            ' : ' +
            x.quantity + ' x ' + x.basketType
        } as selectListItem))
      }
    }, y => y.args.options.forEach(async x => {
      if (x.selected) await HelperFamiliesComponent.assignFamilyDeliveryToIndie(afdList[x.item].id);
    })
    );

    await this.familyLists.refreshRoute({
      strategyId: this.settings.routeStrategy.value.id,
      volunteerLocation: this.volunteerLocation
    });
    await this.familyLists.reload();
  }

  getHelpText() {
    var r = this.settings.lang.ifYouNeedAnyHelpPleaseCall;
    r += " ";
    if (this.settings.helpText.value && this.settings.helpPhone.value)
      return r + this.settings.helpText.value + ", " + this.settings.helpPhone.displayValue;
    else {
      var h = this.context.for(Helpers).lookup(h => h.id.isEqualTo(this.context.user.id));
      return r + h.name.value + ", " + h.phone.displayValue;
    }
  }

  buttons: GridButton[] = [];
  prevMap: MapComponent;
  lastBounds: string;
  mapTabClicked() {
    if (this.map && this.map != this.prevMap) {
      this.familyLists.setMap(this.map);
      this.prevMap = this.map;
    }
    if (this.map) {
      if (this.tab.selectedIndex == 1 && this.lastBounds != this.map.lastBounds) {
        this.map.lastBounds = '';
        this.map.fitBounds();
      }
      this.lastBounds = this.map.lastBounds;
    }

  }
  async cancelAssign(f: ActiveFamilyDeliveries) {
    this.dialog.analytics('Cancel Assign');
    f.courier.value = '';
    await f.save();
    this.familyLists.reload();
    this.assignmentCanceled.emit();
  }
  cancelAll() {
    this.dialog.YesNoQuestion(use.language.areYouSureYouWantToCancelAssignmentTo + " " + this.familyLists.toDeliver.length + " " + use.language.families + "?", async () => {
      await this.busy.doWhileShowingBusy(async () => {

        this.dialog.analytics('cancel all');
        try {
          await HelperFamiliesComponent.cancelAssignAllForHelperOnServer(this.familyLists.helper.id.value);
        }
        catch (err) {
          await this.dialog.exception(use.language.cancelAssignmentForHelperFamilies, err);
        }
        this.familyLists.reload();
        this.assignmentCanceled.emit();
      });
    });

  }
  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async cancelAssignAllForHelperOnServer(id: string, context?: Context) {
    let dist = '';
    await pagedRowsIterator(context.for(ActiveFamilyDeliveries), {
      where: fd => fd.onTheWayFilter().and(fd.courier.isEqualTo(id)),
      forEachRow: async fd => {
        fd.courier.value = '';
        fd._disableMessageToUsers = true;
        dist = fd.distributionCenter.value;
        await fd.save();
      }
    });
    await Families.SendMessageToBrowsers(getLang(context).cancelAssignmentForHelperFamilies, context, dist);
  }
  sameAddress(f: Families, i: number) {
    if (i == 0)
      return false;
    if (!f.addressOk.value)
      return false;
    let of = this.familyLists.toDeliver[i - 1];
    if (!of.addressOk.value)
      return false;

    return of.addressLatitude.value == f.addressLatitude.value && of.addressLongitude.value == f.addressLongitude.value;
  }
  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async okAllForHelperOnServer(id: string, context?: Context) {
    let dist = '';
    await pagedRowsIterator(context.for(ActiveFamilyDeliveries), {
      where: fd => fd.onTheWayFilter().and(fd.courier.isEqualTo(id)),
      forEachRow: async fd => {
        dist = fd.distributionCenter.value;
        fd.deliverStatus.value = DeliveryStatus.Success;
        fd._disableMessageToUsers = true;
        await fd.save();
      }
    });
    await Families.SendMessageToBrowsers(use.language.markAllDeliveriesAsSuccesfull, context, dist);
  }
  notMLT() {
    return !this.settings.isSytemForMlt();
  }

  limitReady = new limitList(30, () => this.familyLists.toDeliver.length);
  limitDelivered = new limitList(10, () => this.familyLists.delivered.length);
  okAll() {
    this.dialog.YesNoQuestion(use.language.areYouSureYouWantToMarkDeliveredSuccesfullyToAllHelperFamilies + this.familyLists.toDeliver.length + " " + use.language.families + "?", async () => {
      await this.busy.doWhileShowingBusy(async () => {

        this.dialog.analytics('ok all');
        try {
          await HelperFamiliesComponent.okAllForHelperOnServer(this.familyLists.helper.id.value);
        }
        catch (err) {
          await this.dialog.exception(use.language.markDeliveredToAllHelprFamilies, err);
        }
        this.familyLists.reload();
      });
    });
  }

  allDoneMessage() { return ApplicationSettings.get(this.context).messageForDoneDelivery.value; };
  async deliveredToFamily(f: ActiveFamilyDeliveries) {
    this.deliveredToFamilyOk(f, DeliveryStatus.Success, s => s.commentForSuccessDelivery);
  }
  async leftThere(f: ActiveFamilyDeliveries) {
    this.deliveredToFamilyOk(f, DeliveryStatus.SuccessLeftThere, s => s.commentForSuccessLeft);
  }
  @ServerFunction({ allowed: c => c.isSignedIn() })
  static async sendSuccessMessageToFamily(deliveryId: string, context?: ServerContext) {
    var settings = getSettings(context);
    if (!settings.allowSendSuccessMessageOption.value)
      return;
    if (!settings.sendSuccessMessageToFamily.value)
      return;
    let fd = await context.for(ActiveFamilyDeliveries).findFirst(f => f.id.isEqualTo(deliveryId).and(f.visibleToCourier.isEqualTo(true)).and(f.deliverStatus.isIn([DeliveryStatus.Success, DeliveryStatus.SuccessLeftThere])));
    if (!fd)
      console.log("did not send sms to " + deliveryId + " failed to find delivery");
    if (!fd.phone1.value)
      return;
    if (!fd.phone1.value.startsWith("05"))
      return;
    let phone = PhoneColumn.fixPhoneInput(fd.phone1.value);
    if (phone.length != 10) {
      console.log(phone + " doesn't match sms structure");
      return;
    }


    await new SendSmsUtils().sendSms(phone, settings.helpPhone.value, SendSmsAction.getSuccessMessage(settings.successMessageText.value, settings.organisationName.value, fd.name.value), context.getOrigin(), Sites.getOrganizationFromContext(context), settings);
  }
  async deliveredToFamilyOk(f: ActiveFamilyDeliveries, status: DeliveryStatus, helpText: (s: ApplicationSettings) => Column) {
    this.context.openDialog(UpdateCommentComponent, x => x.args = {
      family: f,
      comment: f.courierComments.value,
      helpText,
      ok: async (comment) => {
        if (!f.isNew()) {
          f.deliverStatus.value = status;
          f.courierComments.value = comment;
          f.checkNeedsWork();
          try {
            await f.save();
            this.dialog.analytics('delivered');
            this.initFamilies();
            if (this.familyLists.toDeliver.length == 0) {
              this.dialog.messageDialog(this.allDoneMessage());
            }
            if (this.settings.allowSendSuccessMessageOption.value && this.settings.sendSuccessMessageToFamily.value)
              HelperFamiliesComponent.sendSuccessMessageToFamily(f.id.value);

          }
          catch (err) {
            this.dialog.Error(err);
          }
        }
      },
      cancel: () => { }
    });

  }
  initFamilies() {
    this.familyLists.initFamilies();
    if (this.familyLists.toDeliver.length > 0)
      this.familyLists.toDeliver[0].distributionCenter.getRouteStartGeo().then(x => this.routeStart = x);

  }
  showLeftFamilies() {
    return this.partOfAssign || this.partOfReview || this.familyLists.toDeliver.length > 0;
  }
  async couldntDeliverToFamily(f: ActiveFamilyDeliveries) {
    let showUpdateFail = false;
    let q = this.settings.getQuestions();
    if (!q || q.length == 0) {
      showUpdateFail = true;
    } else {
      showUpdateFail = await this.context.openDialog(CommonQuestionsComponent, x => x.init(this.familyLists.allFamilies[0]), x => x.updateFailedDelivery);
    }
    if (showUpdateFail)
      this.context.openDialog(UpdateCommentComponent, x => x.args = {
        family: f,
        comment: f.courierComments.value,
        showFailStatus: true,

        helpText: s => s.commentForProblem,

        ok: async (comment, status) => {
          if (f.isNew())
            return;
          f.deliverStatus.value = status;
          f.courierComments.value = comment;
          f.checkNeedsWork();
          try {
            await f.save();
            this.dialog.analytics('Problem');
            this.initFamilies();


          }
          catch (err) {
            this.dialog.Error(err);
          }
        },
        cancel: () => { },

      });
  }
  async sendSms(reminder: Boolean) {
    this.helperGotSms = true;
    this.dialog.analytics('Send SMS ' + (reminder ? 'reminder' : ''));
    let to = this.familyLists.helper.name.value;
    await SendSmsAction.SendSms(this.familyLists.helper.id.value, reminder);
    if (this.familyLists.helper.escort.value) {
      to += ' ול' + this.familyLists.escort.name.value;
      await SendSmsAction.SendSms(this.familyLists.helper.escort.value, reminder);
    }
    this.dialog.Info(use.language.smsMessageSentTo + " " + to);
    this.assignSmsSent.emit();
    if (reminder)
      this.familyLists.helper.reminderSmsDate.value = new Date();
  }
  async sendWhatsapp() {
    let phone = this.smsPhone;
    if (phone.startsWith('0')) {
      phone = this.settings.getInternationalPhonePrefix() + phone.substr(1);
    }
    if (phone.startsWith('+'))
      phone = phone.substr(1);

    window.open('https://wa.me/' + phone + '?text=' + encodeURI(this.smsMessage), '_blank');
    await this.updateMessageSent();
  }
  async customSms() {
    let h = this.familyLists.helper;
    let phone = h.phone.value;
    if (phone.startsWith('0')) {
      phone = '972' + phone.substr(1);
    }
    await this.context.openDialog(UpdateCommentComponent, x => x.args = {
      helpText: () => new StringColumn(),
      ok: async (comment) => {
        try {
          await (await import("../update-family-dialog/update-family-dialog.component")).UpdateFamilyDialogComponent.SendCustomMessageToCourier(this.familyLists.helper.id.value, comment);
          this.dialog.Info("הודעה נשלחה");
        }
        catch (err) {
          this.dialog.exception("שליחת הודעה למתנדב ", err);
        }
      },
      cancel: () => { },
      hideLocation: true,
      title: 'שלח הודעת ל' + h.name.value,
      family: undefined,
      comment: this.smsMessage
    });
  }
  smsMessage: string = '';
  smsPhone: string = '';
  smsLink: string = '';
  prepareMessage(reminder: Boolean) {
    this.busy.donotWait(async () => {
      await SendSmsAction.generateMessage(this.context, this.familyLists.helper, window.origin, reminder, this.context.user.name, (phone, message, sender, link) => {
        this.smsMessage = message;
        this.smsPhone = phone;
        this.smsLink = link;
      });
    });
  }
  async sendPhoneSms() {
    try {
      window.open('sms:' + this.smsPhone + ';?&body=' + encodeURI(this.smsMessage), '_blank');
      await this.updateMessageSent();
    } catch (err) {
      this.dialog.Error(err);
    }
  }
  callHelper() {
    window.open('tel:' + this.familyLists.helper.phone.value);
  }
  callEscort() {
    window.open('tel:' + this.familyLists.escort.phone.value);
  }
  async updateMessageSent() {

    this.familyLists.helper.smsDate.value = new Date();
    await this.familyLists.helper.save();
  }
  async copyMessage() {
    copy(this.smsMessage);
    this.dialog.Info(use.language.messageCopied);
    await this.updateMessageSent();
  }
  async copyLink() {
    copy(this.smsLink);
    this.dialog.Info(use.language.linkCopied);
    await this.updateMessageSent();
  }

  updateComment(f: ActiveFamilyDeliveries) {
    this.context.openDialog(UpdateCommentComponent, x => x.args = {
      family: f,
      comment: f.courierComments.value,
      helpText: s => s.commentForSuccessDelivery,
      ok: async comment => {
        if (f.isNew())
          return;
        f.courierComments.value = comment;
        f.checkNeedsWork();
        await f.save();
        this.dialog.analytics('Update Comment');
      }
      ,
      cancel: () => { }
    });
  }
  routeStart = this.settings.getGeocodeInformation();
  async showRouteOnGoogleMaps() {

    if (this.familyLists.toDeliver.length > 0) {

      let endOnDist = this.settings.routeStrategy.value.args.endOnDistributionCenter;
      let url = 'https://www.google.com/maps/dir';
      if (!endOnDist)
        if (this.volunteerLocation) {
          url += "/" + encodeURI(toLongLat(this.volunteerLocation));
        }
        else
          url += "/" + encodeURI((this.routeStart).getAddress());

      for (const f of this.familyLists.toDeliver) {
        url += '/' + encodeURI(isGpsAddress(f.address.value) ? f.address.value : f.addressByGoogle.value);
      }
      if (endOnDist)
        url += "/" + encodeURI((this.routeStart).getAddress());
      window.open(url + "?hl=" + getLang(this.context).languageCode, '_blank');
    }
    //window.open(url,'_blank');
  }
  async returnToDeliver(f: ActiveFamilyDeliveries) {
    f.deliverStatus.value = DeliveryStatus.ReadyForDelivery;
    try {
      await f.save();
      this.dialog.analytics('Return to Deliver');
      this.initFamilies();
    }
    catch (err) {
      this.dialog.Error(err);
    }
  }
  @ViewChild("map", { static: false }) map: MapComponent;

}

interface DeliveryInList {
  id: string,
  familyId: string,
  city: string,
  floor: string,
  basketType: string,
  quantity: number,
  location: Location,
  distance: number,
}

class limitList {
  constructor(public limit: number, private relevantCount: () => number) {

  }
  _showAll = false;
  showButton() {
    return !this._showAll && this.limit < this.relevantCount();
  }
  showAll() {
    this._showAll = true;
  }
  shouldShow(i: number) {
    return this._showAll || i < this.limit;
  }
}