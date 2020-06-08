import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { Event } from './events';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {

  constructor(private context: Context) { }
  events = this.context.for(Event).gridSettings({
    allowUpdate: true,
    allowInsert: true,
    get: {
      limit: 25,
      orderBy: e => [e.eventStatus, e.eventDate, e.startTime]
    },
    hideDataArea: true,
    numOfColumnsInGrid: 100,
    columnSettings: e => [
      e.name,
      e.eventStatus,
      e.eventDate,
      e.startTime,
      e.endTime,
      e.requiredVolunteers,
      e.registeredVolunteers,
      e.description
    ]
  });
  ngOnInit() {
  }

}
