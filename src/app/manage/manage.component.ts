import { Component, OnInit } from '@angular/core';
import {  ApplicationSettings, ApplicationImages } from '../models';
import { FamilySources } from "../families/FamilySources";
import { BasketType } from "../families/BasketType";
import { GridSettings } from 'radweb';
import { SelectService } from '../select-popup/select-service';
import { AuthService } from '../auth/auth-service';
import { SendSmsAction } from '../asign-family/send-sms-action';

@Component({
  selector: 'app-manage',
  templateUrl: './manage.component.html',
  styleUrls: ['./manage.component.scss']
})
export class ManageComponent implements OnInit {


  basketType = new GridSettings(new BasketType(), {
    columnSettings: x => [
      x.name
    ],
    allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });
  sources = new GridSettings(new FamilySources(), {
    columnSettings: s => [
      s.name,
      s.phone,
      s.contactPerson
    ], allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });
  settings = new GridSettings(new ApplicationSettings(), {
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    columnSettings: s => [
      s.organisationName,
      s.logoUrl,
      s.address,
      {
        caption: 'כתובת כפי שגוגל הבין',
        getValue: s => s.getGeocodeInformation().getAddress()
      }


    ]

  });
  testSms() {
    return SendSmsAction.getMessage(this.settings.currentRow.smsText.value, this.settings.currentRow.organisationName.value, 'ישראל ישראלי', this.auth.auth.info.name, window.location.origin + '/x/zxcvdf');
  }
  images = new GridSettings(new ApplicationImages(), {
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    columnSettings: i => [
      i.base64Icon,
      i.base64PhoneHomeImage

    ]
  });
  constructor(private dialog: SelectService, private auth: AuthService) { }

  ngOnInit() {
    this.settings.getRecords();
    this.images.getRecords();
  }

}
