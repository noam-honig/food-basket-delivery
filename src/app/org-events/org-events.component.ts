import { Component, OnDestroy, OnInit } from '@angular/core';

import { remult, Remult, Unobserve } from 'remult';
import { EventInList } from '../events/events';
import { RegisterToEvent } from '../event-info/RegisterToEvent';
import { Sites } from '../sites/sites';
import { Roles } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';
import { OrgEventsController } from './org-events.controller';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-org-events',
  templateUrl: './org-events.component.html',
  styleUrls: ['./org-events.component.scss']
})
export class OrgEventsComponent implements OnInit, OnDestroy {

  constructor(public settings: ApplicationSettings, private dialog: DialogService, private route: ActivatedRoute) {

  }
  isGuest = Sites.getOrganizationFromContext(remult) == Sites.guestSchema;
  getLogo() {
    return ApplicationSettings.get(remult).logoUrl;

  }
  ngOnDestroy(): void {
    if (this.unObserve)
      this.unObserve();
  }
  unObserve: Unobserve;
  isAdmin() {
    return remult.isAllowed(Roles.distCenterAdmin);
  }
  events: EventInList[] = [];
  async ngOnInit() {
    if (this.isAdmin())
      return
      

    let sites = (new URL(document.location.href)).searchParams.get("sites");
    this.unObserve = await RegisterToEvent.volunteerInfoChanged.dispatcher.observe(async () => {
      if (this.isGuest) {
        this.dialog.trackVolunteer("list-events");
        this.events = await OrgEventsController.getAllEvents(RegisterToEvent.volunteerInfo.phone, sites);
      }
      else
        this.events = await OrgEventsController.getEvents(RegisterToEvent.volunteerInfo.phone,this.route.snapshot.params['id']);
    })
  }


}
