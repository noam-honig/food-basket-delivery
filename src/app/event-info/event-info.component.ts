import { Component, Input, OnInit, Output } from '@angular/core';
import { BusyService, InputField } from '@remult/angular';
import { EventEmitter } from 'events';

import { Context } from 'remult';

import { Event, eventDisplayDate, EventInList, volunteersInEvent } from '../events/events';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Phone } from '../model-shared/phone';
import { DialogService } from '../select-popup/dialog';
import { getLang } from '../sites/sites';
import { RegisterToEvent } from './RegisterToEvent';


@Component({
  selector: 'app-event-info',
  templateUrl: './event-info.component.html',
  styleUrls: ['./event-info.component.scss']
})
export class EventInfoComponent implements OnInit {

  constructor(public settings: ApplicationSettings, private context: Context, public dialog: DialogService, private busy: BusyService) { }
  @Output() phoneChanged = new EventEmitter();
  @Input()
  e: EventInList;
  displayDate() {
    return eventDisplayDate(this.e);
  }
  openWaze() {
    window.open('waze://?ll=' + this.e.longLat + "&q=" + encodeURI(this.e.theAddress) + '&navigate=yes');
  }
  openGoogleMap() {
    window.open('https://maps.google.com/maps?q=' + this.e.longLat + '&hl=' + getLang(this.context).languageCode, '_blank');
  }
  reg = new RegisterToEvent(this.context);

  ngOnInit(): void {
  }
  edit() {
    if (this.e instanceof Event)
      this.e.openEditDialog(this.dialog, this.busy);
  }


  sendWhatsapp(phone: string) {
    Phone.sendWhatsappToPhone(phone, '', this.context);
  }

  async cancelEvent(e: EventInList) {

  }


}
