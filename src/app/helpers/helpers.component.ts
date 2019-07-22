import { Component, OnInit } from '@angular/core';


import { Helpers } from './helpers';
import { SelectService } from '../select-popup/select-service';
import { Families } from '../families/families';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin, AnyAdmin } from '../auth/auth-guard';
import { RunOnServer } from '../auth/server-action';
import { Context } from '../shared/context';
import { DialogService } from '../select-popup/dialog';
import { BusyService } from '../select-popup/busy-service';

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit {
  constructor(private dialog: DialogService, public context: Context,private busy:BusyService) {
  }
  static route: Route = {
    path: 'helpers',
    component: HelpersComponent,
    data: { name: 'מתנדבים' }, canActivate: [AnyAdmin]
  };
  searchString:string;

  helpers = this.context.for(Helpers).gridSettings({
    allowDelete: true,
    allowInsert: true,
    allowUpdate: true,
    numOfColumnsInGrid: 2,
    get: {
      orderBy: h => [h.name],
      limit:10,
      where:h=>{
        if (this.searchString)
          return h.name.isContains(this.searchString);
          return undefined;
      }
    },
    columnSettings: helpers => [
      helpers.name,
      helpers.phone,

    ],
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes),
    

  });
  async doSearch() {
    if (this.helpers.currentRow && this.helpers.currentRow.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.helpers.getRecords());
  }


  resetPassword() {
    this.dialog.YesNoQuestion("האם את בטוחה שאת רוצה למחוק את הסיסמה של " + this.helpers.currentRow.name.value, async () => {
      await HelpersComponent.resetPassword(this.helpers.currentRow.id.value);
      this.dialog.Info("הסיסמה נמחקה");
    });

  }
  @RunOnServer({ allowed: c => c.isAdmin() })
  static async resetPassword(helperId: string, context?: Context) {

    await context.for(Helpers).foreach(h => h.id.isEqualTo(helperId), async h => {
      h.realStoredPassword.value = '';
      await h.save();
    });
  }



  ngOnInit() {
  }

}
