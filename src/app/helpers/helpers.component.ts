import { Component, OnInit } from '@angular/core';


import { Helpers } from './helpers';
import { SelectService } from '../select-popup/select-service';
import { Families } from '../families/families';
import { Route } from '@angular/router';

import { RunOnServer } from 'radweb';
import { Context } from 'radweb';
import { DialogService } from '../select-popup/dialog';
import { BusyService } from 'radweb';
import { DateColumn, DataAreaSettings } from 'radweb';
import { Roles, AdminGuard } from '../auth/roles';

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit {
  constructor(private dialog: DialogService, public context: Context, private busy: BusyService) {
  }
  static route: Route = {
    path: 'helpers',
    component: HelpersComponent,
    data: { name: 'מתנדבים' }, canActivate: [AdminGuard]
  };
  searchString: string;

  helpers = this.context.for(Helpers).gridSettings({
    allowDelete: true,
    allowInsert: true,
    allowUpdate: true,
    knowTotalRows: true,
    hideDataArea: true,
    numOfColumnsInGrid: 3,
    get: {
      orderBy: h => [h.name],
      limit: 10,
      where: h => {
        if (this.searchString)
          return h.name.isContains(this.searchString);
        return undefined;
      }
    },
    columnSettings: helpers => [
      helpers.name,
      helpers.phone,
   
      {
        column: helpers.admin,
        width: '100'
      }
      , helpers.smsDate

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

  @RunOnServer({ allowed: Roles.admin })
  static async resetPassword(helperId: string, context?: Context) {

    await context.for(Helpers).foreach(h => h.id.isEqualTo(helperId), async h => {
      h.realStoredPassword.value = '';
      await h.save();
    });
  }



  ngOnInit() {
  }
  fromDate = new DateColumn({
    caption: 'מתאריך',
    valueChange: () => {

      if (this.toDate.value < this.fromDate.value) {
        //this.toDate.value = this.getEndOfMonth();
      }

    }
  });
  toDate = new DateColumn('עד תאריך');
  rangeArea = new DataAreaSettings({
    columnSettings: () => [this.fromDate, this.toDate],
    numberOfColumnAreas: 2
  });

}
