import { day, Event, EventType, eventDisplayDate, EventInList, volunteersInEvent } from '../events/events';
import { Component, Input, OnInit } from '@angular/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Context, Field, getFields } from 'remult';
import { EventInfoComponent } from '../event-info/event-info.component';
import { BusyService, DataAreaSettings, DataControl, openDialog, RowButton } from '@remult/angular';
import { DialogService } from '../select-popup/dialog';
import { Roles } from '../auth/roles';
import { use } from '../translate';
import { getCurrentLocation, GetDistanceBetween, Location } from '../shared/googleApiHelpers';

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
  dates: { date: string, events: EventInList[] }[] = [];
  cities: { id: string, count: number, caption: string }[] = [];


  @Field({
    caption: 'איפה?'
  })
  city: string = '';
  @Field({ caption: 'סוג התנדבות' })
  type: EventType;
  area: DataAreaSettings;

  _events: EventInList[];
  @Input()
  set events(val: EventInList[]) {
    this._events = val;
    this.dates = [];
    for (const d of [use.language.past, use.language.today, use.language.tomorrow, use.language.thisWeek, use.language.nextWeek, use.language.later]) {

      this.dates.push({ date: d, events: [] });
    }
    this.cities.splice(0);
    for (const e of val) {
      this.dates.find(d => d.date == eventDisplayDate(e, true)).events.push(e);
      let city = this.cities.find(c => c.id == e.city);
      if (!city) {
        this.cities.push({ id: e.city, count: 1, caption: '' });
      } else
        city.count++;
    }
    this.cities.sort((b, a) => a.count - b.count);
    this.cities.forEach(c => c.caption = c.id + " - " + c.count);
    this.cities.splice(0, 0, { id: '', count: val.length, caption: 'כל הארץ - ' + val.length });
    this.dates = this.dates.filter(d => d.events.length > 0);
    this.sortEvents();
    this.area = new DataAreaSettings({
      fields: () => [[{
        field: this.$.city,
        valueList: this.cities
      }, this.$.type]]
    })
  }
  filter(e: EventInList) {
    return (this.city == '' || e.city == this.city) &&
      (this.type == undefined || e.type.id == this.type.id);
  }
  get events() {
    return this._events;
  }
  get $() { return getFields(this, this.context) }

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
  showVolunteers(e: EventInList) {
    if (e instanceof Event)
      e.showVolunteers(this.dialog, this.busy);
  }
  edit(e: EventInList) {
    if (e instanceof Event)
      e.openEditDialog(this.dialog, this.busy);
  }
  getRelativeDate(e: EventInList) {
    let today = new Date();
    today.setHours(0);
    let t = today.valueOf();
    let d = e.eventDate.valueOf();

    if (d > t) {
      if (d < t + day)
        return use.language.today;
      if (d < t + day * 2)
        return use.language.tomorrow;

    }
  }

  volunteerText(e: EventInList) {
    if (e.requiredVolunteers > 0) {
      if (e.requiredVolunteers == e.registeredVolunteers) {
        return "הארוע מלא";
      }
      // return "חסרים " + (e.requiredVolunteers - e.registeredVolunteers) + " מתנדבים";
    }
    if (this.context.isAllowed(Roles.distCenterAdmin))
      return e.registeredVolunteers + " מתנדבים";
  }
  distance(e: EventInList) {
    if (!this.volunteerLocation)
      return undefined;
    return GetDistanceBetween(this.volunteerLocation, e.location).toFixed(1) + " " + this.settings.lang.km;
  }
  volunteerLocation: Location;
  async sortByDistance() {
    this.volunteerLocation = await getCurrentLocation(true, this.dialog);
    this.sortEvents();
  }
  sortEvents() {
    if (!this.volunteerLocation)
      this.dates.forEach(d => d.events.sort((a, b) => a.eventDate?.valueOf() - b.eventDate?.valueOf()));
    else
      this.dates.forEach(d => d.events.sort((a, b) => GetDistanceBetween(a.location, b.location)));
  }

}

