import { Component, OnInit } from '@angular/core';
import { GridSettings, SelectPopup } from 'radweb';
import { FamilyDeliveryEventsView } from "../families/FamilyDeliveryEventsView";

import { Helpers } from './helpers';
import { SelectService } from '../select-popup/select-service';
import { ResetPasswordAction } from './reset-password';
import { Families } from '../families/families';
import { Route } from '@angular/router';
import { AdminGuard } from '../auth/auth-guard';

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit {
  static route: Route = {
    path: 'helpers',
    component: HelpersComponent,
    data: { name: 'מתנדבות' }, canActivate: [AdminGuard]
  };

  helpers = new GridSettings(new Helpers(), {
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
  previousEvents = new GridSettings(new FamilyDeliveryEventsView(), {
    get: {
      where: e => e.courier.isEqualTo(this.helpers.currentRow ? this.helpers.currentRow.id.value : '-1'),
      orderBy: e => [{ column: e.deliveryDate, descending: true }]
    },
    columnSettings: x => [

      x.eventName,
      {
        column: x.family,
        caption: 'משפחה',
        getValue: x => x.lookup(new Families(), x.family).name.value
      },
      x.deliverStatus

    ]
  });
  /* */
  /* workaround for checkbox not working*/
  get admin() {
    if (this.helpers.currentRow)
      return this.helpers.currentRow.isAdmin.value;
    return false;
  }
  set admin(value: any) {

    this.helpers.currentRow.isAdmin.value = value;

  }
  resetPassword() {
    this.dialog.YesNoQuestion("האם את בטוחה שאת רוצה למחוק את הסיסמה של " + this.helpers.currentRow.name.value, async () => {
      await new ResetPasswordAction().run({ helperId: this.helpers.currentRow.id.value });
      this.dialog.Info("הסיסמה נמחקה");
    });

  }

  constructor(private dialog: SelectService) {
  }

  ngOnInit() {
  }

}
