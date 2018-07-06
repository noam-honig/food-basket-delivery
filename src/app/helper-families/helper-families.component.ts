import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { UserFamiliesList } from '../my-families/user-families';
import { MapComponent } from '../map/map.component';
import { DeliveryStatus, Families } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { SendSmsAction } from '../asign-family/send-sms-action';

@Component({
  selector: 'app-helper-families',
  templateUrl: './helper-families.component.html',
  styleUrls: ['./helper-families.component.scss']
})
export class HelperFamiliesComponent implements OnInit {

  constructor(public auth: AuthService, private dialog: SelectService) { }
  @Input() familyLists: UserFamiliesList;
  @Input() partOfAssign=false;
  ngOnInit() {
    this.familyLists.setMap(this.map);
  }
  async cancelAssign(f: Families) {
    f.courier.value = '';

    await f.save();
    this.familyLists.initForHelper(this.familyLists.helperId);

  }
  async deliveredToFamily(f: Families) {
    this.dialog.displayComment({
      comment: f.courierComments.value,
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
  sendSms() {
    new SendSmsAction().run({ helperId: this.familyLists.helperId });
  }
  updateComment(f: Families) {
    this.dialog.displayComment({
      comment: f.courierComments.value,
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
