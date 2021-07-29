import { Event, eventDisplayDate, EventInList, volunteersInEvent } from '../events/events';
import { Component, Input, OnInit } from '@angular/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Context } from 'remult';
import { EventInfoComponent } from '../event-info/event-info.component';
import { BusyService, openDialog, RowButton } from '@remult/angular';
import { DialogService } from '../select-popup/dialog';
import { Roles } from '../auth/roles';



@Component({
  selector: 'app-event-card',
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.scss']
})
export class EventCardComponent implements OnInit {
  constructor(public settings: ApplicationSettings, private context: Context, private dialog: DialogService, private busy: BusyService) { }
  menuOptions = Event.rowButtons(this.settings, this.dialog, this.busy);
  isAdmin() {
    return this.context.isAllowed(Roles.distCenterAdmin);
  }



  @Input() events: EventInList[];
  ngOnInit(): void {
  }
  eventDetails(e: EventInList) {
    openDialog(EventInfoComponent, x => x.e = e);
  }
  displayDate(e: EventInList) {
    return eventDisplayDate(e);
  }
  clickButton(b: RowButton<Event>, e: EventInList) {
    if (e instanceof Event)
      b.click(e);
  }

}

