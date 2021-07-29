import { Component, OnDestroy, OnInit } from '@angular/core';
import { Event } from '../events/events';

import { BackendMethod, Context, Unobserve } from 'remult';
import { EventInList, eventStatus } from '../events/events';
import { RegisterToEvent } from '../event-info/RegisterToEvent';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { Phone } from '../model-shared/phone';

@Component({
  selector: 'app-org-events',
  templateUrl: './org-events.component.html',
  styleUrls: ['./org-events.component.scss']
})
export class OrgEventsComponent implements OnInit, OnDestroy {

  constructor() {

  }
  ngOnDestroy(): void {
    this.unObserve();
  }
  unObserve: Unobserve;
  events: EventInList[] = [];
  async ngOnInit() {
    this.unObserve = await RegisterToEvent.volunteerInfoChanged.dispatcher.observe(async () => {
      this.events = await OrgEventsComponent.getEvents(RegisterToEvent.volunteerInfo.phone);
    })
  }
  @BackendMethod({ allowed: true })
  static async getEvents(phone: string, context?: Context): Promise<EventInList[]> {
    let helper: HelpersBase = context.currentUser;
    if (!helper && phone)
      helper = await context.for(Helpers).findFirst(h => h.phone.isEqualTo(new Phone(phone)));
    return Promise.all((await context.for(Event).find({
      orderBy: e => [e.eventDate, e.startTime],
      where: e => e.eventStatus.isEqualTo(eventStatus.active)
    })).map(async e => await e.toEventInList(helper)));
  }

}
