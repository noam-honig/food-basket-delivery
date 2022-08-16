import { Component, Input, OnInit, Output } from '@angular/core';
import { BusyService } from '@remult/angular';
import { EventEmitter } from 'events';

import { remult, Remult } from 'remult';
import { Roles } from '../auth/roles';

import {  Event, eventDisplayDate, EventInList, volunteersInEvent } from '../events/events';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { VolunteerNeedType } from '../manage/VolunteerNeedType';
import { Phone } from '../model-shared/phone';
import { DialogService } from '../select-popup/dialog';
import { openWaze } from '../shared/googleApiHelpers';
import { getLang } from '../sites/sites';
import { RegisterToEvent } from './RegisterToEvent';


@Component({
  selector: 'app-event-info',
  templateUrl: './event-info.component.html',
  styleUrls: ['./event-info.component.scss']
})
export class EventInfoComponent implements OnInit {

  constructor(public settings: ApplicationSettings, public dialog: DialogService, private busy: BusyService) { }
  @Output() phoneChanged = new EventEmitter();
  @Input()
  e: EventInList;
  @Input() noClose = false;
  displayDate() {
    return eventDisplayDate(this.e);
  }
  openWaze() {
    openWaze(this.e.longLat, this.e.theAddress);
  }
  isGeneralEvent(){
    return this.e.eventDateJson.startsWith("999");
  }
  openGoogleMap() {
    window.open('https://maps.google.com/maps?q=' + this.e.longLat + '&hl=' + getLang(remult).languageCode, '_blank');
  }
  reg = new RegisterToEvent(remult);
  isAdmin() {
    return remult.isAllowed(Roles.admin);
  }

  ngOnInit(): void {
  }
  edit() {
    if (this.e instanceof Event)
      this.e.openEditDialog(this.dialog);
  }


  sendWhatsapp(phone: string) {
    Phone.sendWhatsappToPhone(phone, '', remult);
  }
}
