import { Component, OnInit, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { UserFamiliesList } from '../my-families/user-families';
import { MapComponent } from '../map/map.component';
import { DeliveryStatus, Families, Helpers } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { Router } from '@angular/router';

@Component({
  selector: 'app-helper-families',
  templateUrl: './helper-families.component.html',
  styleUrls: ['./helper-families.component.scss']
})
export class HelperFamiliesComponent implements OnInit {

  constructor(public auth: AuthService, private dialog: SelectService, private router: Router) { }
  @Input() familyLists: UserFamiliesList;
  @Input() partOfAssign = false;
  @Input() partOfReview = false;
  @Output() assignmentCanceled = new EventEmitter<void>();
  ngOnInit() {
    this.familyLists.setMap(this.map);
    
  }
  async cancelAssign(f: Families) {
    f.courier.value = '';

    await f.save();
    this.familyLists.reload();
    this.assignmentCanceled.emit();

  }
  async deliveredToFamily(f: Families) {
    this.dialog.displayComment({
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
    this.dialog.displayComment({
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
  sendSms(reminder: Boolean) {
    new SendSmsAction().run({ helperId: this.familyLists.helperId, reminder: reminder });
    if (reminder)
      this.familyLists.helperOptional.reminderSmsDate.dateValue = new Date();
  }

  updateComment(f: Families) {
    this.dialog.displayComment({
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
