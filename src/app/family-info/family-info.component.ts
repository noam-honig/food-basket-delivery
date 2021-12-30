import { Component, OnInit, Input, Output, EventEmitter, NgZone } from '@angular/core';

import * as copy from 'copy-to-clipboard';
import { DialogService, extractError } from '../select-popup/dialog';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Remult, FieldRef, BackendMethod, Allow } from 'remult';

import { use } from '../translate';
import { GetVolunteerFeedback } from '../update-comment/update-comment.component';


import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { Helpers } from '../helpers/helpers';
import { getLang, Sites } from '../sites/sites';
import { Roles } from '../auth/roles';
import { Phone } from "../model-shared/phone";
import { Families } from '../families/families';
import { UserFamiliesList } from '../my-families/user-families';
import { openDialog } from '@remult/angular';
import { relativeDateName } from '../model-shared/types';
import { ImageInfo } from '../images/images.component';
import { SendSmsAction } from '../asign-family/send-sms-action';

@Component({
  selector: 'app-family-info',
  templateUrl: './family-info.component.html',
  styleUrls: ['./family-info.component.scss']
})
export class FamilyInfoComponent implements OnInit {

  constructor(private dialog: DialogService, public remult: Remult, public settings: ApplicationSettings, private zone: NgZone) {

  }
  @Input() f: ActiveFamilyDeliveries;
  @Input() showHelp = false;
  @Input() hideSal = false;
  hasImages = false;
  images: ImageInfo[];
  async ngOnInit() {
    if (this.f) {
      this.hasImages = await FamilyDeliveries.hasFamilyImages(this.f.family,this.f.id);
    }
  }
  async loadImages() {
    this.images = await FamilyDeliveries.getFamilyImages(this.f.family, this.f.id);
  }
  actuallyShowHelp() {
    return this.showHelp && this.f.deliverStatus != DeliveryStatus.ReadyForDelivery;
  }
  async showTz() {
    this.dialog.messageDialog(await FamilyInfoComponent.ShowFamilyTz(this.f.id));
  }
  courierCommentsDateRelativeDate() {
    return relativeDateName(this.remult, { d: this.f.courierCommentsDate })
  }
  @BackendMethod({ allowed: Allow.authenticated })
  static async ShowFamilyTz(deliveryId: string, remult?: Remult) {
    let s = await ApplicationSettings.getAsync(remult);
    if (!s.showTzToVolunteer)
      return "";
    var d = await remult.repo(ActiveFamilyDeliveries).findId(deliveryId);
    if (!d)
      return;
    if (!d.courier.isCurrentUser() && !remult.isAllowed([Roles.admin, Roles.distCenterAdmin]))
      return "";
    var f = await remult.repo(Families).findId(d.family);
    if (!f)
      return "";
    return f.name + ":" + f.tz;

  }
  @Input() partOfAssign: Boolean;
  @Output() assignmentCanceled = new EventEmitter<void>();

  @Input() userFamilies: UserFamiliesList;
  @Input() selfPickupScreen = false;
  useWaze() {
    return this.settings.lang.languageCode == 'iw';
  }

  showCancelAssign(f: ActiveFamilyDeliveries) {
    return this.partOfAssign && f.courier && f.deliverStatus == DeliveryStatus.ReadyForDelivery;
  }
  showFamilyPickedUp(f: ActiveFamilyDeliveries) {
    return f.deliverStatus == DeliveryStatus.SelfPickup || f.deliverStatus == DeliveryStatus.ReadyForDelivery && !f.courier && this.selfPickupScreen;
  }

  async getPickupComments(f: ActiveFamilyDeliveries) {
    openDialog(GetVolunteerFeedback, x => x.args =
    {
      family: f,
      comment: f.courierComments,
      helpText: s => s.commentForSuccessDelivery,
      ok: async (comment) => {
        f.deliverStatus = DeliveryStatus.SuccessPickedUp;
        f.courierComments = comment;
        f.checkNeedsWork();
        try {
          await f.save();
          this.dialog.analytics('Self Pickup');
        }
        catch (err) {
          this.dialog.Error(err);
        }
      },
      cancel: () => { }
    });
  }

  async labSelfReception(d: ActiveFamilyDeliveries) {
    if (await this.dialog.YesNoPromise(getLang(this.remult).shouldArchiveDelivery)) {
      {
        d.archive = true;
        d.distributionCenter = await this.remult.getUserDistributionCenter();
        d.deliverStatus = DeliveryStatus.Success;
        await d.save();
      }
    }
  }
  async privateCall() {
    this.dialog.analytics("Private Call");
    let r = await FamilyInfoComponent.privateCall(this.f.id);
    if (r.error)
      this.dialog.Error(r.error);
    else
      this.zone.run(() => {

        window.location.href = "tel:" + r.phone;
      });


  }
  callPhone(col: Phone) {

    window.location.href = "tel:" + col.thePhone;
  }
  async sendWhatsapp(phone: Phone) {
    phone.sendWhatsapp(this.remult, SendSmsAction.getSuccessMessage(this.settings.successMessageText, this.settings.organisationName, this.f.name));
  }
  static createPhoneProxyOnServer: (phone1: string, phone2: string) => Promise<{ phone: string, session: string }>;
  @BackendMethod({ allowed: Allow.authenticated })
  static async privateCall(deliveryId: string, remult?: Remult): Promise<{
    phone?: string,
    error?: string
  }> {
    let cleanPhone = '';
    let reqInfo = Sites.getOrganizationFromContext(remult) + "/proxy/" + remult.user.id + " => " + deliveryId;
    try {
      let settings = await ApplicationSettings.getAsync(remult);
      if (!settings.usePhoneProxy)
        throw "פרוקסי לא מופעל לסביבה זו";
      let fd = await remult.repo(ActiveFamilyDeliveries).findId(deliveryId);
      if (!fd) throw "משלוח לא נמצא";
      if (!fd.courier.isCurrentUser() && !remult.isAllowed([Roles.admin, Roles.distCenterAdmin]))
        throw "אינך רשאי לחייג למשפחה זו";

      cleanPhone = Phone.fixPhoneInput(fd.phone1.thePhone, remult);
      if (!cleanPhone) return { error: "למשפחה זו לא מעודכן טלפון" };
      if (cleanPhone.startsWith('0'))
        cleanPhone = cleanPhone.substring(1);
      cleanPhone = "+972" + cleanPhone;
      let h = await remult.repo(Helpers).findId(remult.user.id);
      if (!h)
        throw "מתנדב לא נמצא";
      let vPhone = h.phone.thePhone;
      if (vPhone.startsWith('0'))
        vPhone = vPhone.substring(1);
      vPhone = "+972" + vPhone;


      let r = await FamilyInfoComponent.createPhoneProxyOnServer(cleanPhone, vPhone);

      console.log(reqInfo + " (" + r.phone + "," + r.session + ")");
      return r;
    }
    catch (err) {
      console.error(reqInfo, err, "phone:" + cleanPhone);
      return { error: "תקלה בשירות הטלפונים: " + extractError(err) }
    }

  }

  async familiyPickedUp(f: ActiveFamilyDeliveries) {
    await (this.settings.isSytemForMlt) ? this.labSelfReception(f) : this.getPickupComments(f);
  }

  async cancelAssign(f: ActiveFamilyDeliveries) {

    this.assignmentCanceled.emit();

  }
  openWaze(f: ActiveFamilyDeliveries) {
    if (!f.addressOk) {
      this.dialog.YesNoQuestion(use.language.addressNotOkOpenWaze, () => {
        if (this.useWaze())
          f.openWaze();
        else
          f.openGoogleMaps();
      });
    }
    else
      if (this.useWaze())
        f.openWaze();
      else
        f.openGoogleMaps();



  }
  async udpateInfo(f: ActiveFamilyDeliveries) {
    let x = f.courier;
    await f.showDetailsDialog({
      dialog: this.dialog,
      refreshDeliveryStats: () => {
        x = f.courier;
        if (this.userFamilies)
          this.userFamilies.reload();
      }
    });
    if (x != f.courier)
      if (this.userFamilies)
        this.userFamilies.reload();

  }
  copyAddress(f: ActiveFamilyDeliveries) {
    copy(f.address);
    this.dialog.Info(use.language.address + " " + f.address + " " + use.language.wasCopiedSuccefully);
  }
  showStatus() {
    if (this.f.deliverStatus == DeliveryStatus.SelfPickup)
      return false;
    if (this.selfPickupScreen)
      return true;
    return this.f.deliverStatus != DeliveryStatus.ReadyForDelivery;
  }
}
