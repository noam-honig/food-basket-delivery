import { day, Event, EventType, eventDisplayDate, EventInList, volunteersInEvent, eventStatus } from '../events/events';
import { Component, Input, OnInit } from '@angular/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Remult, Field, getFields } from 'remult';
import { EventInfoComponent } from '../event-info/event-info.component';
import { BusyService, DataAreaSettings, DataControl, openDialog, RowButton } from '@remult/angular';
import { DialogService } from '../select-popup/dialog';
import { Roles } from '../auth/roles';
import { use } from '../translate';
import { getCurrentLocation, GetDistanceBetween, Location } from '../shared/googleApiHelpers';
const AllTypes = { id: 'asdfaetfsafads', caption: 'כל הסוגים', count: undefined };
@Component({
  selector: 'app-event-card',
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.scss']
})
export class EventCardComponent implements OnInit {
  constructor(public settings: ApplicationSettings, private remult: Remult, private dialog: DialogService, private busy: BusyService) { }
  @Input() listOptions: RowButton<any>[] = [];
  menuOptions: RowButton<Event>[] = [
    {
      name: use.language.duplicateEvents,
      click: (e) => {
        Event.duplicateEvent(this.remult, this.busy, [e], (newEvents) => {
          if (e.eventStatus == eventStatus.archive) {
            this.events = this.events.filter(x => x != e);
          }
          this.events.push(...newEvents);
          this.refresh();
        });
      }
    },
    {
      name: use.language.moveToArchive,
      click: async e => {
        e.eventStatus = eventStatus.archive;
        await e.save();
        this.events = this.events.filter(x => x != e);
        this.refresh();
      }
    }
  ];
  getStatus(e: EventInList) {
    if (e instanceof Event)
      if (e.eventStatus != eventStatus.active)
        return e.eventStatus.caption;
    return '';
  }
  isAdmin() {
    return this.remult.isAllowed(Roles.distCenterAdmin);
  }
  dates: dateEvents[] = [];
  cities: { id: string, count: number, caption: string }[] = [];
  types: { id: string, count: number, caption: string }[] = [];
  trackBy(i: number, e: EventInList) {
    return e.id;
  }


  @Field({
    caption: 'איפה?'
  })
  city: string = '';
  @Field({ caption: 'סוג התנדבות' })
  type: EventType = AllTypes;
  area: DataAreaSettings;

  _events: EventInList[];
  @Input()
  set events(val: EventInList[]) {
    this._events = val;
    this.refresh();
  }
  showLocation = false;
  refresh() {
    this.dates = [];
    this.events.sort((a, b) => compareEventDate(a, b))

    let firstLongLat: string;


    this.cities.splice(0);
    this.types.splice(0);
    for (const e of this._events) {
      if (!firstLongLat)
        firstLongLat = e.longLat;
      if (e.longLat != firstLongLat)
        this.showLocation = true;
      let d = this.dates.find(d => d.date == eventDisplayDate(e, true));
      if (!d)
        this.dates.push(d = { date: eventDisplayDate(e, true), events: [] });
      d.events.push(e);
      let city = this.cities.find(c => c.id == e.city);
      if (!city) {
        this.cities.push({ id: e.city, count: 1, caption: '' });
      }
      else
        city.count++;
      let type = this.types.find(c => c.id == e.type?.id);
      if (!type) {
        this.types.push({ id: e.type?.id, count: 1, caption: e.type?.caption });
      }
      else
        type.count++;
    }
    this.cities.sort((b, a) => a.count - b.count);
    this.cities.forEach(c => c.caption = c.id + " - " + c.count);
    this.cities.splice(0, 0, { id: '', count: this._events.length, caption: use.language.entireRegion + ' - ' + this._events.length });

    this.types.sort((b, a) => a.count - b.count);
    this.types.forEach(c => c.caption = c.caption + " - " + c.count);


    this.types.splice(0, 0, AllTypes);



    this.dates = this.dates.filter(d => d.events.length > 0);
    this.sortEvents();
    this.area = new DataAreaSettings({
      fields: () => [[{
        field: this.$.city,
        valueList: this.cities,
        visible: () => this.cities.length > 2
      }, {
        field: this.$.type,
        valueList: this.types,
        visible: () => this.types.length > 2
      }]]
    });
  }

  filter(e: EventInList) {
    return (this.city == '' || e.city == this.city) &&
      (this.type == undefined || this.type == AllTypes || e.type.id == this.type.id);
  }
  hasEvents(d: dateEvents) {
    return !!d.events.find(x => this.filter(x));
  }
  get events() {
    return this._events;
  }
  get $() { return getFields(this, this.remult) }

  ngOnInit(): void {

  }
  eventDetails(e: EventInList) {
    this.dialog.trackVolunteer("event-info:" + e.site);
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
    if (e instanceof Event) {
      e.openEditDialog(this.dialog, this.busy);
      this.refresh();
    }
  }
  isFull(e: EventInList) {
    if (e.requiredVolunteers > 0) {
      if (e.requiredVolunteers <= e.registeredVolunteers) {
        return true;
      }
    }
    return false;
  }

  adminVolunteers(e: EventInList) {
    if (this.remult.isAllowed(Roles.distCenterAdmin) && e.registeredVolunteers != undefined)

      if (e.requiredVolunteers)
        return e.registeredVolunteers + '/' + e.requiredVolunteers + ' ' + this.settings.lang.volunteers;
      else
        return e.registeredVolunteers + " " + this.settings.lang.volunteers;
  }
  distance(e: EventInList) {
    if (!this.volunteerLocation)
      return undefined;
    return GetDistanceBetween(this.volunteerLocation, e.location).toFixed(1) + " " + this.settings.lang.km;
  }
  volunteerLocation: Location;
  async sortByDistance() {
    try {
      if (!this.volunteerLocation)
        this.volunteerLocation = await getCurrentLocation(true, this.dialog);
      else
        this.volunteerLocation = undefined;;
      this.sortEvents();
    } catch { }
  }
  sortEvents() {
    if (!this.volunteerLocation)
      this.dates.forEach(d => d.events.sort((a, b) => compareEventDate(a, b)));
    else
      this.dates.forEach(d => d.events.sort((a, b) => GetDistanceBetween(this.volunteerLocation, a.location) - GetDistanceBetween(this.volunteerLocation, b.location)));
  }

}
function compareEventDate(a: EventInList, b: EventInList) {
  let r = a.eventDateJson?.localeCompare(b.eventDateJson);
  if (r != 0) return r;
  return a.startTime?.localeCompare(b.startTime);
}

interface dateEvents { date: string, events: EventInList[] }