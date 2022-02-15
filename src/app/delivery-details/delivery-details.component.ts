import { Component, EventEmitter, NgZone, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { RowButton } from '@remult/angular/interfaces';
import { Remult } from 'remult';
import { FamilyInfoComponent } from '../family-info/family-info.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Phone } from '../model-shared/phone';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-delivery-details',
  templateUrl: './delivery-details.component.html',
  styleUrls: ['./delivery-details.component.scss']
})
export class DeliveryDetailsComponent implements OnInit {

  constructor(private dialog: DialogService, public remult: Remult, public settings: ApplicationSettings, private zone: NgZone, public ref: MatDialogRef<any>) {
  }
  famInfo = new FamilyInfoComponent(this.dialog, this.remult, this.settings, this.zone);
  buttons: RowButton<any>[] = [
    {
      name: this.settings.lang.updateComment,
      
      click: () => this.updateComment()
    }
  ];
  phones: { phone: Phone, desc: string }[];
  ngOnInit(): void {
    this.phones = [
      { phone: this.famInfo.f.phone1, desc: this.famInfo.f.phone1Description },
      { phone: this.famInfo.f.phone2, desc: this.famInfo.f.phone2Description },
      { phone: this.famInfo.f.phone3, desc: this.famInfo.f.phone3Description },
      { phone: this.famInfo.f.phone4, desc: this.famInfo.f.phone4Description }
    ];
    for (const { phone } of this.phones) {

      if (phone && !this.dialPhone) {
        this.dialPhone = phone;
      }
      if (phone?.canSendWhatsapp())
        this.whatsAppPhone = phone;
    }

  }
  dialPhone: Phone;
  whatsAppPhone: Phone;
  deliveredToFamily: () => void;
  updateComment: () => void;

}
/*
[V] make address clickable
[V] make each phone clickable
[V] make dial only display if dialable
[V] make whatsapp only display if whatsappable
[] add handle problem.
[] add update comment
[] add user comment
[] add you've been here before
[] add cancel button
[] add update info button[]
[] add copy address
[] add support for private call
[] add management buttons (cancel, and details)
[] add select waze or google
[] add previous activities and show tz
[] add display status and click to cancel status
[] add click on map

V2
[] add left near home to delivered screen
[] internationalize
[] fix dialog bug when openning again and again
*/