import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, DeliveryStatus } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {


  toDeliver: Families[] = [];
  delivered: Families[] = [];
  problem: Families[] = [];
  constructor(private auth: AuthService, private dialog: SelectService) { }
  allFamilies: Families[] = [];
  async ngOnInit() {
    var f = new Families();
    this.allFamilies = await f.source.find({ where: f.courier.isEqualTo(this.auth.auth.info.helperId) });
    this.initFamilies();
  }
  initFamilies() {
    this.toDeliver = this.allFamilies.filter(f => f.deliverStatus.listValue == DeliveryStatus.Assigned);
    this.delivered = this.allFamilies.filter(f => f.deliverStatus.listValue == DeliveryStatus.Success);
    this.problem = this.allFamilies.filter(f => {
      switch (f.deliverStatus.listValue) {
        case DeliveryStatus.FailedBadAddress:
        case DeliveryStatus.FailedNotHome:
        case DeliveryStatus.FailedOther:
          return true;
      }
      return false;

    });
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
  async couldntDeliverToFamily(f: Families) {
    this.dialog.displayComment({
      comment: f.courierComments.value,
      showFailStatus:true,
      
      ok: async (comment,status) => {
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
    f.deliverStatus.listValue = DeliveryStatus.Assigned;
    try {
      await f.save();
      this.initFamilies();

    }
    catch (err) {
      this.dialog.Error(err);
    }
  }

}
