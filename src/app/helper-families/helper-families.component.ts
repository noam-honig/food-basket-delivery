import { Component, OnInit, Input, ViewChild, Output, EventEmitter } from '@angular/core';
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
import { Context } from '../shared/context';
import { Column } from 'radweb';

@Component({
  selector: 'app-helper-families',
  templateUrl: './helper-families.component.html',
  styleUrls: ['./helper-families.component.scss']
})
export class HelperFamiliesComponent implements OnInit {

  constructor(public auth: AuthService, private dialog: DialogService, private router: Router, private selectService: SelectService, private context: Context) { }
  @Input() familyLists: UserFamiliesList;
  @Input() partOfAssign = false;
  @Input() partOfReview = false;
  @Output() assignmentCanceled = new EventEmitter<void>();
  @Output() assignSmsSent = new EventEmitter<void>();
  ngOnInit() {
    this.familyLists.setMap(this.map);

  }
  async cancelAssign() {
    this.dialog.analytics('Cancel Assign');
    this.familyLists.reload();
    this.assignmentCanceled.emit();
  }
  cancelAll() {
    this.dialog.YesNoQuestion("האם אתה בטוח שאתה רוצה לבטל שיוך ל" + this.familyLists.toDeliver.length + " משפחות?", async () => {
      this.dialog.analytics('cancel all');
      for (const f of this.familyLists.toDeliver) {
        f.courier.value = '';
        await f.save();
      }
      this.cancelAssign();

    });

  }
  allDoneMessage() { return ApplicationSettings.get(this.context).messageForDoneDelivery.value; };
  async deliveredToFamily(f: Families) {
    this.deliveredToFamilyOk(f, DeliveryStatus.Success, s => s.commentForSuccessDelivery);
  }
  async leftThere(f: Families) {
    this.deliveredToFamilyOk(f, DeliveryStatus.SuccessLeftThere, s => s.commentForSuccessLeft);
  }
  async deliveredToFamilyOk(f: Families, status: DeliveryStatus, helpText: (s: ApplicationSettings) => Column<any>) {
    this.selectService.displayComment({
      comment: f.courierComments.value,
      assignerName: f.courierHelpName(),
      assignerPhone: f.courierHelpPhone(),
      helpText,
      ok: async (comment) => {
        f.deliverStatus.listValue = status;
        f.courierComments.value = comment;
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
      comment: f.courierComments.value,
      showFailStatus: true,
      assignerName: f.courierHelpName(),
      assignerPhone: f.courierHelpPhone(),
      helpText: s => s.commentForProblem,

      ok: async (comment, status) => {
        f.deliverStatus.value = status;
        f.courierComments.value = comment;
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
    this.dialog.analytics('Send SMS ' + (reminder ? 'reminder' : ''));
    await SendSmsAction.SendSms(this.familyLists.helperId, reminder);
    this.assignSmsSent.emit();
    if (reminder)
      this.familyLists.helperOptional.reminderSmsDate.dateValue = new Date();
  }

  updateComment(f: Families) {
    this.selectService.displayComment({
      comment: f.courierComments.value,
      assignerName: f.courierHelpName(),
      assignerPhone: f.courierHelpPhone(),
      helpText: s => s.commentForSuccessDelivery,
      ok: async comment => {
        f.courierComments.value = comment;
        await f.save();
        this.dialog.analytics('Update Comment');
      }
      ,
      cancel: () => { }
    });
  }
  async returnToDeliver(f: Families) {
    f.deliverStatus.listValue = DeliveryStatus.ReadyForDelivery;
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
