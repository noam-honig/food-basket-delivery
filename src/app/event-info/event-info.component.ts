import { Component, OnInit, Output } from '@angular/core';
import { InputField } from '@remult/angular';
import { EventEmitter } from 'events';
import { Context } from 'remult';

import { Event, eventDisplayDate, EventInList, volunteersInEvent } from '../events/events';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Phone } from '../model-shared/phone';
import { RegisterToEvent } from './RegisterToEvent';


@Component({
  selector: 'app-event-info',
  templateUrl: './event-info.component.html',
  styleUrls: ['./event-info.component.scss']
})
export class EventInfoComponent implements OnInit {

  constructor(public settings: ApplicationSettings, private context: Context) { }
  @Output() phoneChanged = new EventEmitter();
  e: EventInList;
  displayDate() {
    return eventDisplayDate(this.e);
  }
  openWaze() {
    window.open('waze://?ll=' + this.e.longLat + "&q=" + encodeURI(this.e.theAddress) + '&navigate=yes');
  }
  reg = new RegisterToEvent(this.context);

  ngOnInit(): void {
  }


  sendWhatsapp(phone: string) {
    Phone.sendWhatsappToPhone(phone, '', this.context);
  }

  async cancelEvent(e: EventInList) {

  }


}
