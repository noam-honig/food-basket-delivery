import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, DeliveryStatus } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { UserFamiliesList } from './user-families';

@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  familyLists = new UserFamiliesList();

  constructor(private auth: AuthService, private dialog: SelectService) { }
  async ngOnInit() {
    await this.familyLists.initForHelper(this.auth.auth.info.helperId);
  }

  async deliveredToFamily(f: Families) {
    this.dialog.displayComment({
      comment: f.courierComments.value,
      ok: async (comment) => {
        f.deliverStatus.listValue = DeliveryStatus.Success;
        f.courierComments.value = comment;
        try {
          await f.save();
          this.familyLists.initFamilies();

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
      showFailStatus: true,

      ok: async (comment, status) => {
        f.deliverStatus.value = status;
        f.courierComments.value = comment;
        try {
          await f.save();
          this.familyLists.initFamilies();

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
      this.familyLists.initFamilies();

    }
    catch (err) {
      this.dialog.Error(err);
    }
  }

}
