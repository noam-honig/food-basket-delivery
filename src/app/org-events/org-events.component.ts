import { Component, OnDestroy, OnInit } from '@angular/core';

import { remult, Unobserve } from 'remult';
import { EventInList, isGeneralEvent } from '../events/events';
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
  isGuest = Sites.getOrganizationFromContext() == Sites.guestSchema;
  getLogo() {
    return ApplicationSettings.get().logoUrl;

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
        this.events = await OrgEventsController.getEvents(RegisterToEvent.volunteerInfo.phone, this.route.snapshot.params['id']);
    })
  }
  async saveToExcel() {
    const xlsx = await import('xlsx');
    let wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(this.events.map(e => {
      const url = remult.context.getOrigin() + `/guest/event/${e.site}/${e.id}/${e.remoteUrl ? "remote" : ""}`
      return ({
        "שם התנדבות": e.name,
        "סוג התנדבות": "פומבי",
        "קטגוריה": "עזרה ומזון לנזקקים",
        "תאור": e.description,
        "תאור עם קישור": "לפרטים והרשמה לחצו " + url + "\n\n" + e.description,
        "שם פרטי איש קשר": e.thePhoneDescription,
        "טלפון איש קשר": e.thePhoneDisplay,
        "חד פעמי/חוזרת": isGeneralEvent(e) ? "חוזרת" : "חד פעמית",
        "תאריך": isGeneralEvent(e) ? "" : e.eventDateJson,
        "משעה": e.startTime,
        "עד שעה": e.endTime,
        "קישור": url
      })
    })));
    xlsx.writeFile(wb, "hagai-events.xlsx");

  }


}
