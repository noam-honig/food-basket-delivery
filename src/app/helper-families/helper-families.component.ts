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
  async cancelAssign(f: Families) {
    this.familyLists.reload();
    this.assignmentCanceled.emit();
  }
  allDoneMessage() { return ApplicationSettings.get(this.context).messageForDoneDelivery.value; };
  async deliveredToFamily(f: Families) {
    this.selectService.displayComment({
      comment: f.courierComments.value,
      assignerName: f.courierAssignUserName.value,
      assignerPhone: f.courierAssignUserPhone.value,
      ok: async (comment) => {
        f.deliverStatus.listValue = DeliveryStatus.Success;
        f.courierComments.value = comment;
        try {
          await f.save();
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
      assignerName: f.courierAssignUserName.value,
      assignerPhone: f.courierAssignUserPhone.value,

      ok: async (comment, status) => {
        f.deliverStatus.value = status;
        f.courierComments.value = comment;
        try {
          await f.save();
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
    await SendSmsAction.SendSms(this.familyLists.helperId, reminder);
    this.assignSmsSent.emit();
    if (reminder)
      this.familyLists.helperOptional.reminderSmsDate.dateValue = new Date();
  }

  updateComment(f: Families) {
    this.selectService.displayComment({
      comment: f.courierComments.value,
      assignerName: f.courierAssignUserName.value,
      assignerPhone: f.courierAssignUserPhone.value,
      ok: async comment => {
        f.courierComments.value = comment;
        await f.save();
      }
      ,
      cancel: () => { }
    });
  }
  async returnToDeliver(f: Families) {
    f.deliverStatus.listValue = DeliveryStatus.ReadyForDelivery;
    try {
      await f.save();
      this.initFamilies();
    }
    catch (err) {
      this.dialog.Error(err);
    }
  }
  @ViewChild("map") map: MapComponent;
}
