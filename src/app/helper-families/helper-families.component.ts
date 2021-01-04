import { Component, OnInit, Input, ViewChild, Output, EventEmitter, ElementRef } from '@angular/core';
import { BusyService, ServerFunction, StringColumn, GridButton, BoolColumn, ServerContext, SqlDatabase } from '@remult/core';
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
import { Helpers, HelperId, HelpersBase } from '../helpers/helpers';
import { GetVolunteerFeedback } from '../update-comment/update-comment.component';
import { CommonQuestionsComponent } from '../common-questions/common-questions.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { isGpsAddress, Location, toLongLat, GetDistanceBetween, getCurrentLocation } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';
import { pagedRowsIterator } from '../families/familyActionsWiring';
import { Families } from '../families/families';
import { MatTabGroup } from '@angular/material';
import { routeStrategyColumn } from '../asign-family/route-strategy';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { PhoneColumn, SqlBuilder, getValueFromResult } from '../model-shared/types';
import { Sites, getLang } from '../sites/sites';
import { SelectListComponent, selectListItem } from '../select-list/select-list.component';
import { lang } from 'moment';
import { EditCommentDialogComponent } from '../edit-comment-dialog/edit-comment-dialog.component';
import { SelectHelperComponent } from '../select-helper/select-helper.component';
import { AsignFamilyComponent } from '../asign-family/asign-family.component';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { PromiseThrottle } from '../shared/utils';
import { moveDeliveriesHelper } from './move-deliveries-helper';
import { UpdateArea } from '../families/familyActions';
import { calcAffectiveDistance } from '../volunteer-cross-assign/volunteer-cross-assign.component';
import { BasketType } from '../families/BasketType';
import { trigger, transition, style, animate } from '@angular/animations';
import { DistributionCenters } from '../manage/distribution-centers';
import { MltFamiliesComponent } from '../mlt-families/mlt-families.component';


@Component({
  selector: 'app-helper-families',
  templateUrl: './helper-families.component.html',
  styleUrls: ['./helper-families.component.scss'],
  animations: [
    trigger("message", [
      transition("void => *", [
        style({ transform: 'scale(0)', height: '0' }),
        animate('400ms ease-in')
      ]),
      transition("* => void", [
        animate('500ms ease-out', style({ transform: 'translateX(300%) scale(0) rotate(360deg)' }))
      ])
    ])
  ]
})
export class HelperFamiliesComponent implements OnInit {
  switchToMap() {
    this.tab.selectedIndex = 1;
  }
  trackBy(i: number, f: ActiveFamilyDeliveries) {
    return f.id.value;
  }
  signs = ["🙂", "👌", "😉", "😍", "🤩", "💖", "👍", "🙏"];
  visibleSigns: string[] = [];
  cool() {
    let x = Math.trunc(Math.random() * this.signs.length);
    this.visibleSigns.push(this.signs[x]);
    setTimeout(() => {
      this.visibleSigns.pop();
    }, 1000);
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

    this.volunteerLocation = await getCurrentLocation(useCurrentLocation,this.dialog);
    
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
          { column: this.familyLists.helper.preferredFinishAddress, visible: () => !this.settings.isSytemForMlt() },
          { column: strategy, visible: () => !this.familyLists.helper.preferredFinishAddress.value || this.familyLists.helper.preferredFinishAddress.value.trim().length == 0 || this.settings.isSytemForMlt() }
        ]
      },
      ok: async () => {
        await this.updateCurrentLocation(useCurrentLocation.value);
        if (this.familyLists.helper.wasChanged())
          await this.familyLists.helper.save();
        await this.familyLists.refreshRoute({
          strategyId: strategy.value.id,
          volunteerLocation: this.volunteerLocation
        });
      }
    });


  }



  @ServerFunction({ allowed: Roles.indie })
  static async getDeliveriesByLocation(pivotLocation: Location, context?: Context, db?: SqlDatabase) {
    if (!getSettings(context).isSytemForMlt())
      throw "not allowed";
    let result: selectListItem<DeliveryInList>[] = [];
    let fd = context.for(ActiveFamilyDeliveries).create();
    let sql = new SqlBuilder();


    for (const r of (await db.execute(sql.query({
      select: () => [
        fd.addressLatitude,
        fd.addressLongitude,
        fd.quantity,
        fd.basketType,
        fd.id,
        fd.family,
        fd.floor,
        fd.city],
      from: fd,
      where: () => [fd.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(fd.courier.isEqualTo(''))]
    }))).rows) {
      let existing = result.find(x => x.item.familyId == getValueFromResult(r, fd.family));
      let basketName = (await context.for(BasketType).lookupAsync(x => x.id.isEqualTo(getValueFromResult(r, fd.basketType)))).name.value;
      if (existing) {
        existing.name += ", " + getValueFromResult(r, fd.quantity) + " X " + basketName;
        existing.item.totalItems += getValueFromResult(r, fd.quantity);
        existing.item.ids.push(getValueFromResult(r, fd.id));

      }
      else {
        let loc: Location = {
          lat: +getValueFromResult(r, fd.addressLatitude),
          lng: +getValueFromResult(r, fd.addressLongitude)
        };
        let dist = GetDistanceBetween(pivotLocation, loc);
        let myItem: DeliveryInList = {

          city: getValueFromResult(r, fd.city),
          floor: getValueFromResult(r, fd.floor),

          ids: [getValueFromResult(r, fd.id)],
          familyId: getValueFromResult(r, fd.family),
          location: loc,
          distance: dist,
          totalItems: getValueFromResult(r, fd.quantity)
        };
        let itemString: string =
          myItem.distance.toFixed(1) + use.language.km +
          (myItem.city ? ' (' + myItem.city + ')' : '') +
          (myItem.floor ? ' [' + use.language.floor + ' ' + myItem.floor + ']' : '') +
          ' : ' +
          getValueFromResult(r, fd.quantity) + ' x ' + basketName;

        result.push({
          selected: false,
          item: myItem,
          name: itemString
        });
      }
    }
    result.sort((a, b) => {
      return calcAffectiveDistance(a.item.distance, a.item.totalItems) - calcAffectiveDistance(b.item.distance, b.item.totalItems);
    });
    result.splice(15);
    return result;
  };


  

  async assignNewDelivery() {
    await this.updateCurrentLocation(true);
    let afdList = await (HelperFamiliesComponent.getDeliveriesByLocation(this.volunteerLocation));

    await this.context.openDialog(SelectListComponent, x => {
      x.args = {
        title: use.language.closestDeliveries + ' (' + use.language.mergeFamilies + ')',
        multiSelect: true,
        onSelect: async (selectedItems) => {
          if (selectedItems.length > 0)
            this.busy.doWhileShowingBusy(async () => {
              let ids: string[] = [];
              for (const selectedItem of selectedItems) {
                let d: DeliveryInList = selectedItem.item;
                ids.push(...d.ids);
              }
              await MltFamiliesComponent.assignFamilyDeliveryToIndie(ids);
              await this.familyLists.refreshRoute({
                strategyId: this.settings.routeStrategy.value.id,
                volunteerLocation: this.volunteerLocation
              });
              if (this.familyLists)
                await this.familyLists.reload();
            });
        },
        options: afdList
      }
    });


  }
  reloadList(){
    this.familyLists.reload();
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
        await HelperFamiliesComponent.cancelAssignAllForHelperOnServer(this.familyLists.helper.id.value);
        this.familyLists.reload();
        this.assignmentCanceled.emit();
      });
    });

  }
  setDefaultCourier() {
    this.familyLists.helper.setAsDefaultVolunteerToDeliveries(this.busy, this.familyLists.toDeliver, this.dialog);
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
  distanceFromPreviousLocation(f: ActiveFamilyDeliveries, i: number) {
    if (i == 0) { return undefined; }
    if (!f.addressOk.value)
      return undefined;
    let of = this.familyLists.toDeliver[i - 1];
    if (!of.addressOk.value)
      return undefined;
    return GetDistanceBetween(of.getDrivingLocation(), f.getDrivingLocation());
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
        await HelperFamiliesComponent.okAllForHelperOnServer(this.familyLists.helper.id.value);
        this.familyLists.reload();
      });
    });
  }
  async moveBasketsTo(to: HelpersBase) {
    await new moveDeliveriesHelper(this.context, this.settings, this.dialog, () => this.familyLists.reload()).move(this.familyLists.helper, to, true);

  }

  moveBasketsToOtherVolunteer() {
    this.context.openDialog(
      SelectHelperComponent, s => s.args = {
        filter: h => h.id.isDifferentFrom(this.familyLists.helper.id),
        hideRecent: true,
        onSelect: async to => {
          if (to) {
            this.moveBasketsTo(to);
          }
        }
      });
  }
  async refreshDependentVolunteers() {

    this.otherDependentVolunteers = [];

    this.busy.donotWaitNonAsync(async () => {
      if (this.familyLists.helper.leadHelper.value) {
        this.otherDependentVolunteers.push(await this.context.for(Helpers).lookupAsync(this.familyLists.helper.leadHelper));
      }
      this.otherDependentVolunteers.push(...await this.context.for(Helpers).find({ where: h => h.leadHelper.isEqualTo(this.familyLists.helper.id) }));
    });
  }
  otherDependentVolunteers: Helpers[] = [];

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
    this.context.openDialog(GetVolunteerFeedback, x => x.args = {
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
            this.cool();
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
      this.context.openDialog(GetVolunteerFeedback, x => x.args = {
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
    PhoneColumn.sendWhatsappToPhone(this.smsPhone, this.smsMessage, this.context);
    await this.updateMessageSent("Whatsapp");
  }
  async customSms() {
    let h = this.familyLists.helper;
    let phone = h.phone.value;
    if (phone.startsWith('0')) {
      phone = '972' + phone.substr(1);
    }
    await this.context.openDialog(GetVolunteerFeedback, x => x.args = {
      helpText: () => new StringColumn(),
      ok: async (comment) => {
        await (await import("../update-family-dialog/update-family-dialog.component")).UpdateFamilyDialogComponent.SendCustomMessageToCourier(this.familyLists.helper.id.value, comment);
        this.dialog.Info("הודעה נשלחה");
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
  isReminderMessage: boolean = false;
  prepareMessage(reminder: boolean) {
    this.isReminderMessage = reminder;
    this.busy.donotWait(async () => {
      await SendSmsAction.generateMessage(this.context, this.familyLists.helper, window.origin, reminder, this.context.user.name, async (phone, message, sender, link) => {
        this.smsMessage = message;
        this.smsPhone = phone;
        this.smsLink = link;
      });
    });
  }
  async sendPhoneSms() {
    try {
      window.open('sms:' + this.smsPhone + ';?&body=' + encodeURI(this.smsMessage), '_blank');
      await this.updateMessageSent("Sms from user phone");
    } catch (err) {
      this.dialog.Error(err);
    }
  }
  async callHelper() {
    location.href = 'tel:' + this.familyLists.helper.phone.value;
    if (this.settings.isSytemForMlt()) {
      await this.context.openDialog(EditCommentDialogComponent, inputArea => inputArea.args = {
        title: 'הוסף הערה לתכתובות של המתנדב',

        save: async (comment) => {
          let hist = this.context.for((await import('../in-route-follow-up/in-route-helpers')).HelperCommunicationHistory).create();
          hist.volunteer.value = this.familyLists.helper.id.value;
          hist.comment.value = comment;
          await hist.save();
        },
        comment: 'התקשרתי'


      });
    }
  }
  callEscort() {
    window.open('tel:' + this.familyLists.escort.phone.value);
  }
  async updateMessageSent(type: string) {

    await SendSmsAction.documentHelperMessage(this.isReminderMessage, this.familyLists.helper, this.context, type);
  }
  async copyMessage() {
    copy(this.smsMessage);
    this.dialog.Info(use.language.messageCopied);
    await this.updateMessageSent("Message Copied");
  }
  async copyLink() {
    copy(this.smsLink);
    this.dialog.Info(use.language.linkCopied);
    await this.updateMessageSent("Link Copied");
  }

  updateComment(f: ActiveFamilyDeliveries) {
    this.context.openDialog(EditCommentDialogComponent, x => x.args = {
      comment: f.courierComments.value,


      save: async comment => {
        if (f.isNew())
          return;
        f.courierComments.value = comment;
        f.checkNeedsWork();
        await f.save();
        this.dialog.analytics('Update Comment');
      }
      , title: use.language.updateComment

    });
  }
  routeStart = this.settings.address.getGeocodeInformation();
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

export interface DeliveryInList {
  ids: string[],
  familyId: string,
  city: string,
  floor: string,
  location: Location,
  distance: number,
  totalItems: number
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


