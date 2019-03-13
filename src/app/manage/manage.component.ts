import { Component, OnInit } from '@angular/core';
import { ApplicationImages } from "./ApplicationImages";
import { FamilySources } from "../families/FamilySources";
import { BasketType } from "../families/BasketType";
import { SelectService } from '../select-popup/select-service';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { ApplicationSettings } from './ApplicationSettings';
import { Route } from '@angular/router';
import { AnyAdmin } from '../auth/auth-guard';
import { Context } from '../shared/context';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-manage',
  templateUrl: './manage.component.html',
  styleUrls: ['./manage.component.scss']
})
export class ManageComponent implements OnInit {
  static route: Route = {
    path: 'manage',
    component: ManageComponent,
    data: { name: 'הגדרות מערכת' }, canActivate: [AnyAdmin]
  }
  constructor(private dialog: DialogService, private context: Context) { }

  basketType = this.context.for(BasketType).gridSettings({
    columnSettings: x => [
      x.name
    ],
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
      },
      s.logoUrl,
      s.commentForSuccessDelivery,
      s.commentForProblem,
      s.messageForDoneDelivery


    ]

  });
  testSms() {
    return SendSmsAction.getMessage(this.settings.currentRow.smsText.value, this.settings.currentRow.organisationName.value, 'ישראל ישראלי', this.context.info.name, window.location.origin + '/x/zxcvdf');
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
