import { Component, OnInit } from '@angular/core';
import { ApplicationImages } from "./ApplicationImages";
import { FamilySources } from "../families/FamilySources";
import { BasketType } from "../families/BasketType";

import { SendSmsAction } from '../asign-family/send-sms-action';
import { ApplicationSettings } from './ApplicationSettings';


import { Context, IdEntity, IdColumn, StringColumn, EntityClass } from 'radweb';
import { DialogService } from '../select-popup/dialog';
import { AdminGuard, Roles } from '../auth/roles';
import { Route } from '@angular/router';

@Component({
  selector: 'app-manage',
  templateUrl: './manage.component.html',
  styleUrls: ['./manage.component.scss']
})
export class ManageComponent implements OnInit {
  static route: Route = {
    path: 'manage',
    component: ManageComponent,
    data: {
      name: 'הגדרות מערכת'
    }, canActivate: [AdminGuard]
  }
  wasChange() {
    return this.settings.currentRow && this.images.currentRow && (this.settings.currentRow.wasChanged() || this.images.currentRow.wasChanged());
  }
  save() {
    this.settings.currentRow.save();
    this.images.currentRow.save();
  }
  reset() {
    this.settings.currentRow.reset();
    this.images.currentRow.reset();
  }
  constructor(private dialog: DialogService, private context: Context) { }

  basketType = this.context.for(BasketType).gridSettings({
    columnSettings: x => [
      x.name,
      {
        column: x.boxes,
        width: '100px'
      },
      x.blocked
    ],
    get: {
      limit: 25,
      orderBy: f => [f.name]
    },
    onNewRow: b => b.boxes.value = 1,
    allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });
  sources = this.context.for(FamilySources).gridSettings({
    columnSettings: s => [
      s.name,
      s.phone,
      s.contactPerson
    ], allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    get: {
      limit: 25,
      orderBy: f => [f.name]
    },
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });
  groups = this.context.for(Groups).gridSettings({
    columnSettings: s => [
      s.name,
    ], allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    get: {
      limit: 25,
      orderBy: f => [f.name]
    },
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });
  settings = this.context.for(ApplicationSettings).gridSettings({
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    columnSettings: s => [
      s.organisationName,
      s.address,
      {
        caption: 'כתובת כפי שגוגל הבין',
        getValue: s => s.getGeocodeInformation().getAddress()
      }

    ]
  });
  settingsMore = this.settings.addArea({
    columnSettings: s =>
      [
        s.helpText,
        s.helpPhone,
        {
          caption: '',
          getValue: s => {
            if (!s.helpText.value) {
              return 'מכיוון שלא הוגדר שם בשדה ' + s.helpText.caption + ', למשנע יוצג השם של מי ששייך אותו והטלפון שלו ';
            }
            return '';
          }
        },
        s.defaultStatusType.getColumn()
      ]

  });

  settingsLogo = this.settings.addArea({
    columnSettings: s => [s.logoUrl]
  });
  settingsMessages = this.settings.addArea({
    columnSettings: s => [
      s.commentForSuccessDelivery,
      s.commentForSuccessLeft,
      s.commentForProblem,
      s.messageForDoneDelivery,
      
      s.message1Text,
      s.message1Link,
      s.message1OnlyWhenDone,
      s.message2Text,
      s.message2Link,
      s.message2OnlyWhenDone
    ]
  });


  testSms() {
    return SendSmsAction.getMessage(this.settings.currentRow.smsText.value, this.settings.currentRow.organisationName.value, 'ישראל ישראלי', this.context.user.name, window.location.origin + '/x/zxcvdf');
  }
  images = this.context.for(ApplicationImages).gridSettings({
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    columnSettings: i => [
      i.base64Icon,
      i.base64PhoneHomeImage

    ]
  });

  ngOnInit() {
    this.settings.getRecords();
    this.images.getRecords();
  }

}
@EntityClass
export class Groups extends IdEntity<IdColumn>  {

  name = new StringColumn("קבוצה");

  constructor(context: Context) {
    super(new IdColumn(), {
      name: "groups",
      allowApiRead: Roles.admin,
      allowApiCRUD: Roles.admin,
    });
  }
}