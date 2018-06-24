import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, DeliveryStatus } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { UserFamiliesList } from './user-families';
import { MapComponent } from '../map/map.component';

@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  familyLists = new UserFamiliesList();

  constructor(public auth: AuthService, private dialog: SelectService) { }
  async ngOnInit() {
    await this.familyLists.initForHelper(this.auth.auth.info.helperId);
    this.map.test(this.familyLists.allFamilies);
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
  initFamilies(){
    this.familyLists.initFamilies();
    this.map.test(this.familyLists.allFamilies);
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
