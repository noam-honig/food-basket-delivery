import { Component, OnInit } from '@angular/core';
import { FamilyDeliveryEventsView } from "../families/FamilyDeliveryEventsView";

import { Helpers } from './helpers';
import { SelectService } from '../select-popup/select-service';
import { Families } from '../families/families';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin, AnyAdmin } from '../auth/auth-guard';
import { RunOnServer } from '../auth/server-action';
import { Context } from '../shared/context';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit {
  constructor(private dialog: DialogService, public context: Context) {
  }
  static route: Route = {
    path: 'helpers',
    component: HelpersComponent,
    data: { name: 'מתנדבות' }, canActivate: [AnyAdmin]
  };

  helpers = this.context.for(Helpers).gridSettings({
    allowDelete: true,
    allowInsert: true,
    allowUpdate: true,
    numOfColumnsInGrid: 2,
    get: {
      orderBy: h => [h.name]
    },
    columnSettings: helpers => [
      helpers.name,
      helpers.phone,

    ],
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes),
    onEnterRow: h => this.previousEvents.getRecords()

  });
  previousEvents = this.context.for(FamilyDeliveryEventsView).gridSettings({
    get: {
      where: e => e.courier.isEqualTo(this.helpers.currentRow ? this.helpers.currentRow.id.value : '-1'),
      orderBy: e => [{ column: e.deliveryDate, descending: true }]
    },
    columnSettings: x => [

      x.eventName,
      {
        column: x.family,
        caption: 'משפחה',
        getValue: x => this.context.for(Families).lookup(x.family).name.value
      },
      x.deliverStatus

    ]
  });

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
