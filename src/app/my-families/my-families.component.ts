import { Component, OnInit, ViewChild } from '@angular/core';
import { UserFamiliesList } from './user-families';
import { Route } from '@angular/router';

import { Context, SignedInGuard, RouteHelperService } from '@remult/core';

import { Helpers, HelperUserInfo } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';

import { LoginComponent } from '../users/login/login.component';
import { AuthService } from '../auth/auth-service';
import { Event, eventStatus, volunteersInEvent } from '../events/events';


@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  static route: Route = {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [SignedInGuard], data: { name: 'משפחות שלי' }
  };
  familyLists = new UserFamiliesList(this.context, this.settings);
  user: HelperUserInfo;

  constructor(public context: Context, public settings: ApplicationSettings, private dialog: DialogService, private helper: RouteHelperService, public sessionManager: AuthService) {
    this.user = context.user as HelperUserInfo;
  }
  async ngOnInit() {
    try {
      await this.familyLists.initForHelper(await this.context.for(Helpers).findFirst(h => h.id.isEqualTo(this.user.theHelperIAmEscortingId ? this.user.theHelperIAmEscortingId : this.context.user.id)));
    }
    catch (err) {
      this.dialog.exception("My Families: " + this.settings.lang.smsLoginFailed, err);
      this.sessionManager.signout();
      this.helper.navigateToComponent(LoginComponent);

    }
    this.context.for(Event).find({ orderBy: e => [e.eventDate, e.startTime], where: e => e.eventStatus.isEqualTo(eventStatus.active) }).then(x => this.events = x);
  }

  volunteerEvents = new Map<string, volunteersInEvent>();
  volunteerInEvent(e: Event) {
    let r = this.volunteerEvents.get(e.id.value);
    if (!r) {
      this.volunteerEvents.set(e.id.value, r = this.context.for(volunteersInEvent).create());
      this.context.for(volunteersInEvent).findFirst(ve => ve.eventId.isEqualTo(e.id).and(ve.helper.isEqualTo(this.familyLists.helper.id))).then(ev => {
        if (ev)
          this.volunteerEvents.set(e.id.value, ev)
      });
    }
    return r;
  }
  async registerToEvent(e: Event) {
    let ev = this.volunteerInEvent(e);
    if (ev.isNew()) {
      ev.eventId.value = e.id.value;
      ev.helper.value = this.familyLists.helper.id.value;
      await ev.save();
      e.registeredVolunteers.value++;
    }
  }
  async cancelEvent(e: Event) {
    let ev = this.volunteerInEvent(e);
    if (!ev.isNew()) {
      await ev.delete();
      e.registeredVolunteers.value--;
      this.volunteerEvents.set(e.id.value, undefined);
    }
  }
  events: Event[] = [];


}
