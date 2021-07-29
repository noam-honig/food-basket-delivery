import { Component, OnInit } from '@angular/core';
import { Event } from '../events/events';

import { BackendMethod, Context } from 'remult';
import { EventInList, eventStatus } from '../events/events';

@Component({
  selector: 'app-org-events',
  templateUrl: './org-events.component.html',
  styleUrls: ['./org-events.component.scss']
})
export class OrgEventsComponent implements OnInit {

  constructor() { }
  events: EventInList[] = [];
  async ngOnInit() {
    this.events = await OrgEventsComponent.getEvents();
  }
  @BackendMethod({ allowed: true })
  static async getEvents(context?: Context): Promise<EventInList[]> {
    return (await context.for(Event).find({ orderBy: e => [e.eventDate, e.startTime], where: e => e.eventStatus.isEqualTo(eventStatus.active) })).map(({
      id,
      name,
      description,
      eventDate,
      startTime,
      endTime,
      city,
      theAddress,
      longLat,
      thePhone,
      thePhoneDisplay,
      thePhoneDescription,
      requiredVolunteers,
      registeredVolunteers
    }) => ({
      id,
      name,
      description,
      eventDate,
      startTime,
      endTime,
      city,
      theAddress,
      longLat,
      thePhone,
      thePhoneDisplay,
      thePhoneDescription,
      requiredVolunteers,
      registeredVolunteers
    }));
  }

}
