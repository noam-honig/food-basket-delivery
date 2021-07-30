import { Component, OnDestroy, OnInit } from '@angular/core';
import { Event } from '../events/events';

import { BackendMethod, Context, Unobserve } from 'remult';
import { EventInList, eventStatus } from '../events/events';
import { RegisterToEvent } from '../event-info/RegisterToEvent';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { Phone } from '../model-shared/phone';
import { Sites } from '../sites/sites';
import { InitContext } from '../helpers/init-context';
import { Roles } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-org-events',
  templateUrl: './org-events.component.html',
  styleUrls: ['./org-events.component.scss']
})
export class OrgEventsComponent implements OnInit, OnDestroy {

  constructor(private context: Context,public settings:ApplicationSettings) {

  }
  getLogo() {
    return ApplicationSettings.get(this.context).logoUrl;
    
  }
  ngOnDestroy(): void {
    if (this.unObserve)
      this.unObserve();
  }
  unObserve: Unobserve;
  isAdmin() {
    return this.context.isAllowed(Roles.distCenterAdmin);
  }
  events: EventInList[] = [];
  async ngOnInit() {
    if (this.isAdmin())
      return
    this.unObserve = await RegisterToEvent.volunteerInfoChanged.dispatcher.observe(async () => {
      if (Sites.getOrganizationFromContext(this.context) == Sites.guestSchema)
        this.events = await OrgEventsComponent.getAllEvents(RegisterToEvent.volunteerInfo.phone);
      else
        this.events = await OrgEventsComponent.getEvents(RegisterToEvent.volunteerInfo.phone);
    })
  }
  @BackendMethod({ allowed: true })
  static async getAllEvents(phone: string): Promise<EventInList[]> {
    let r: EventInList[] = [];
    for (const org of Sites.schemas) {
      let dp = Sites.getDataProviderForOrg(org);
      let c = new Context();
      c.setDataProvider(dp);
      await InitContext(c, undefined, org);


      let items = await OrgEventsComponent.getEvents(phone, c);

      r.push(...items.map(i => ({ ...i, site: org })));

    }
    return r;
  }
  @BackendMethod({ allowed: true })
  static async getEvents(phone: string, context?: Context): Promise<EventInList[]> {


    let helper: HelpersBase = context.currentUser;
    if (!helper && phone)
      helper = await context.for(Helpers).findFirst(h => h.phone.isEqualTo(new Phone(phone)));
    let midnightToday = new Date();
    midnightToday.setHours(0);

    return Promise.all((await context.for(Event).find({
      orderBy: e => [e.eventDate, e.startTime],
      where: e => e.eventStatus.isEqualTo(eventStatus.active).and(e.eventDate.isGreaterOrEqualTo(midnightToday))
    })).map(async e => await e.toEventInList(helper)));
  }

}
