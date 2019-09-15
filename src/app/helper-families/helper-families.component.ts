import { Component, OnInit, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { BusyService } from 'radweb';
import * as copy from 'copy-to-clipboard';
import { UserFamiliesList } from '../my-families/user-families';
import { MapComponent } from '../map/map.component';
import { Families } from '../families/families';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { AuthService } from '../auth/auth-service';
import { DialogService } from '../select-popup/dialog';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { Router } from '@angular/router';
import { SelectService } from '../select-popup/select-service';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Context } from 'radweb';
import { Column } from 'radweb';
import { translate } from '../translate';

@Component({
  selector: 'app-helper-families',
  templateUrl: './helper-families.component.html',
  styleUrls: ['./helper-families.component.scss']
})
export class HelperFamiliesComponent implements OnInit {

  constructor(public auth: AuthService, private dialog: DialogService, private router: Router, private selectService: SelectService, private context: Context, private busy: BusyService) { }
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
  async cancelAssign(f: Families) {
    this.dialog.analytics('Cancel Assign');
    f.courier.value = '';
    await f.save();
    this.familyLists.reload();
    this.assignmentCanceled.emit();
  }
  cancelAll() {
    this.dialog.YesNoQuestion("האם אתה בטוח שאתה רוצה לבטל שיוך ל" + this.familyLists.toDeliver.length + translate(" משפחות?"), async () => {
      await this.busy.doWhileShowingBusy(async () => {

        this.dialog.analytics('cancel all');
        for (const f of this.familyLists.toDeliver) {
          f.courier.value = '';
          await f.save();
        }
        this.familyLists.reload();
        this.assignmentCanceled.emit();
      });
    });

  }
  okAll() {
    this.dialog.YesNoQuestion("האם אתה בטוח שאתה רוצה לסמן נמסר בהצלחה ל" + this.familyLists.toDeliver.length + translate(" משפחות?"), async () => {
      this.busy.doWhileShowingBusy(async () => {

        this.dialog.analytics('ok  all');
        for (const f of this.familyLists.toDeliver) {
          f.deliverStatus.value = DeliveryStatus.Success;
          await f.save();
        }
        this.initFamilies();
      });
    });
  }
  get settings() { return ApplicationSettings.get(this.context); }
  allDoneMessage() { return ApplicationSettings.get(this.context).messageForDoneDelivery.value; };
  async deliveredToFamily(f: Families) {
    this.deliveredToFamilyOk(f, DeliveryStatus.Success, s => s.commentForSuccessDelivery);
  }
  async leftThere(f: Families) {
    this.deliveredToFamilyOk(f, DeliveryStatus.SuccessLeftThere, s => s.commentForSuccessLeft);
  }
  async deliveredToFamilyOk(f: Families, status: DeliveryStatus, helpText: (s: ApplicationSettings) => Column<any>) {
    this.selectService.displayComment({
      family:f,
      comment: f.courierComments.value,
      assignerName: f.courierHelpName(),
      assignerPhone: f.courierHelpPhone(),
      helpText,
      ok: async (comment) => {
        f.deliverStatus.value = status;
        f.courierComments.value = comment;
        f.checkNeedsWork();
        try {
          await f.save();
          this.dialog.analytics('delivered');
          this.initFamilies();
          if (this.familyLists.toDeliver.length == 0) {
            this.dialog.YesNoQuestion(this.allDoneMessage());
          }

        }
        catch (err) {
          this.dialog.Error(err);
        }
      },
      cancel: () => { }
    });

  }
  initFamilies() {
    this.familyLists.initFamilies();

  }
  showLeftFamilies() {
    return this.partOfAssign || this.partOfReview || this.familyLists.toDeliver.length > 0;
  }
  async couldntDeliverToFamily(f: Families) {
    this.selectService.displayComment({
      family:f,
      comment: f.courierComments.value,
      showFailStatus: true,
      assignerName: f.courierHelpName(),
      assignerPhone: f.courierHelpPhone(),
      helpText: s => s.commentForProblem,

      ok: async (comment, status) => {
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
    await SendSmsAction.SendSms(this.familyLists.helperId, reminder);
    this.assignSmsSent.emit();
    if (reminder)
      this.familyLists.helperOptional.reminderSmsDate.value = new Date();
  }
  async sendWhatsapp() {
    let phone = this.smsPhone;
    if (phone.startsWith('0')) {
      phone = '972' + phone.substr(1);
    }
    window.open('https://wa.me/' + phone + '?text=' + encodeURI(this.smsMessage), '_blank');
  }
  smsMessage: string = '';
  smsPhone: string = '';
  prepareMessage() {
    this.busy.donotWait(async () => {
      await SendSmsAction.generateMessage(this.context, this.familyLists.helperId, window.origin, false, this.context.user.name, (phone, message, sender) => {
        this.smsMessage = message;
        this.smsPhone = phone;
      });
    });
  }
  async sendPhoneSms() {
    try {
      window.open('sms:' + this.smsPhone + ';?&body=' + encodeURI(this.smsMessage), '_blank');
    } catch (err) {
      this.dialog.Error(err);
    }
  }
  async copyMessage() {
    copy(this.smsMessage);
    this.dialog.Info("הודעה הועתקה");
  }

  updateComment(f: Families) {
    this.selectService.displayComment({
      family:f,
      comment: f.courierComments.value,
      assignerName: f.courierHelpName(),
      assignerPhone: f.courierHelpPhone(),
      helpText: s => s.commentForSuccessDelivery,
      ok: async comment => {
        f.courierComments.value = comment;
        f.checkNeedsWork();
        await f.save();
        this.dialog.analytics('Update Comment');
      }
      ,
      cancel: () => { }
    });
  }
  showRouteOnGoogleMaps() {

    let s = ApplicationSettings.get(this.context);
    let url = 'https://www.google.com/maps/dir/' + encodeURI(s.getGeocodeInformation().getAddress());

    for (const f of this.familyLists.toDeliver) {
      url += '/' + encodeURI(f.getGeocodeInformation().getAddress());
    }
    window.open(url + "?hl=iw", '_blank');
    //window.open(url,'_blank');
  }
  async returnToDeliver(f: Families) {
    f.deliverStatus.value = DeliveryStatus.ReadyForDelivery;
    f.correntAnErrorInStatus.value = true;
    try {
      await f.save();
      this.dialog.analytics('Return to Deliver');
      this.initFamilies();
    }
    catch (err) {
      this.dialog.Error(err);
    }
  }
  @ViewChild("map") map: MapComponent;
}
