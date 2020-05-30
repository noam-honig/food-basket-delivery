import { Component, OnInit, Input, ViewChild, Output, EventEmitter, ElementRef } from '@angular/core';
import { BusyService, ServerFunction } from '@remult/core';
import * as copy from 'copy-to-clipboard';
import { UserFamiliesList } from '../my-families/user-families';
import { MapComponent } from '../map/map.component';

import { DeliveryStatus } from "../families/DeliveryStatus";
import { AuthService } from '../auth/auth-service';
import { DialogService } from '../select-popup/dialog';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { Router } from '@angular/router';

import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Context } from '@remult/core';
import { Column } from '@remult/core';
import { translate, use, getLang } from '../translate';
import { Helpers, HelperId } from '../helpers/helpers';
import { UpdateCommentComponent } from '../update-comment/update-comment.component';
import { CommonQuestionsComponent } from '../common-questions/common-questions.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { isGpsAddress } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';
import { pagedRowsIterator } from '../families/familyActionsWiring';
import { Families } from '../families/families';

@Component({
  selector: 'app-helper-families',
  templateUrl: './helper-families.component.html',
  styleUrls: ['./helper-families.component.scss']
})
export class HelperFamiliesComponent implements OnInit {

  constructor(public auth: AuthService, private dialog: DialogService, private context: Context, private busy: BusyService, public settings: ApplicationSettings) { }
  @Input() familyLists: UserFamiliesList;
  @Input() partOfAssign = false;
  @Input() partOfReview = false;
  @Input() helperGotSms = false;
  @Output() assignmentCanceled = new EventEmitter<void>();
  @Output() assignSmsSent = new EventEmitter<void>();
  @Input() preview = false;
  ngOnInit() {
    this.familyLists.setMap(this.map);//123

  }
  async cancelAssign(f: ActiveFamilyDeliveries) {
    this.dialog.analytics('Cancel Assign');
    f.courier.value = '';
    await f.save();
    this.familyLists.reload();
    this.assignmentCanceled.emit();
  }
  cancelAll() {
    this.dialog.YesNoQuestion(use.language.areYouSureYouWantToCancelAssignmentTo + " " + this.familyLists.toDeliver.length + " " + translate(use.language.families + "?"), async () => {
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

  limitReady = new limitList(30, () => this.familyLists.toDeliver.length);
  limitDelivered = new limitList(10, () => this.familyLists.delivered.length);
  okAll() {
    this.dialog.YesNoQuestion(use.language.areYouSureYouWantToMarkDeliveredSuccesfullyToAllHelperFamilies + this.familyLists.toDeliver.length + " " + translate(use.language.families + "?"), async () => {
      await this.busy.doWhileShowingBusy(async () => {

        this.dialog.analytics('ok all');
        try {
          await HelperFamiliesComponent.okAllForHelperOnServer(this.familyLists.helper.id.value);
        }
        catch (err) {
          await this.dialog.exception(use.language.markDeliveredToAllHelprFamilies, err);
        }
        this.initFamilies();
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
  async deliveredToFamilyOk(f: ActiveFamilyDeliveries, status: DeliveryStatus, helpText: (s: ApplicationSettings) => Column<any>) {
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
  smsMessage: string = '';
  smsPhone: string = '';
  smsLink: string = '';
  prepareMessage() {
    this.busy.donotWait(async () => {
      await SendSmsAction.generateMessage(this.context, this.familyLists.helper, window.origin, false, this.context.user.name, (phone, message, sender, link) => {
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
      let url = 'https://www.google.com/maps/dir/' + encodeURI((this.routeStart).getAddress());

      for (const f of this.familyLists.toDeliver) {
        url += '/' + encodeURI(isGpsAddress(f.address.value) ? f.address.value : f.addressByGoogle.value);
      }
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
  @ViewChild("map", { static: true }) map: MapComponent;

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