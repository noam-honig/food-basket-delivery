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

@Component({
  selector: 'app-helper-families',
  templateUrl: './helper-families.component.html',
  styleUrls: ['./helper-families.component.scss']
})
export class HelperFamiliesComponent implements OnInit {

  constructor(public auth: AuthService, private dialog: DialogService, private router: Router,private selectService:SelectService) { }
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
    await new SendSmsAction().run({ helperId: this.familyLists.helperId, reminder: reminder });
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
