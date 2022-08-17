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

  constructor(private dialog: DialogService,  public settings: ApplicationSettings, private zone: NgZone, public ref: MatDialogRef<any>) {
  }
  famInfo = new FamilyInfoComponent(this.dialog, this.settings, this.zone);
  buttons: RowButton<any>[] = [
    {
      name: this.settings.lang.updateComment,
      icon: 'comment',
      click: () => this.updateComment()
    },

    {
      name: this.settings.lang.copyAddress,
      click: () => this.famInfo.copyAddress(this.famInfo.f),
      icon: "content_copy"
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
  couldntDeliverToFamily: VoidFunction;
  returnToDeliver: VoidFunction;
  async updateInfo() {
    const x = this.famInfo.f.courier;
    await this.famInfo.udpateInfo(this.famInfo.f);
    if (x != this.famInfo.f.courier) {
      this.ref.close()
    }
  }
  async cancelAssignment() {
    await this.famInfo.cancelAssign(this.famInfo.f)
    this.ref.close();
  }

}
/*
[V] make address clickable
[V] make each phone clickable
[V] make dial only display if dialable
[V] make whatsapp only display if whatsappable
[V] add handle problem.
[V] add update comment
[V] add user comment
[V] add you've been here before
[V] add cancel button
[V] add update info button
[V] add management buttons (cancel, and details)
[V] add copy address
[V] add select waze or google
[V] add previous activities and show tz
[V] add display status and click to cancel status
[V] add click on map
[V] change volunteer in update delivery should close 
[] handle display when not full screen
V2
[] add left near home to delivered screen
[] internationalize
[] fix dialog bug when openning again and again
[] handle family picked up
[] add support for private call
*/