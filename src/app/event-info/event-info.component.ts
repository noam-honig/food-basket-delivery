import { Component, OnInit } from '@angular/core';
import { DataControl, InputField, openDialog } from '@remult/angular';
import { BackendMethod, Context, Controller, getFields, Validators } from 'remult';

import { Event, eventDisplayDate, EventInList, volunteersInEvent } from '../events/events';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Phone } from '../model-shared/phone';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { Field } from '../translate';

@Controller('event-info')
@Component({
  selector: 'app-event-info',
  templateUrl: './event-info.component.html',
  styleUrls: ['./event-info.component.scss']
})
export class EventInfoComponent implements OnInit {

  constructor(public settings: ApplicationSettings, private context: Context) { }
  e: EventInList;
  displayDate() {
    return eventDisplayDate(this.e);
  }
  openWaze() {
    window.open('waze://?ll=' + this.e.longLat + "&q=" + encodeURI(this.e.theAddress) + '&navigate=yes');
  }

  ngOnInit(): void {
  }


  sendWhatsapp(phone: string) {
    Phone.sendWhatsappToPhone(phone, '', this.context);
  }
  @DataControl({ allowClick: () => false })
  @Field<EventInfoComponent>({
    translation: l => l.phone,
    valueType: Phone,
    validate: (e, c) => Phone.validatePhone(c, e.context, true)
  })
  phone: Phone = new Phone('');
  @Field<EventInfoComponent>({
    caption: "שם",
    validate: (s, e) => Validators.required(s, e, s.settings.lang.nameIsTooShort)
  })
  name: string;
  @Field({ translation: l => l.rememberMeOnThisDevice })
  rememberMeOnThisDevice: boolean;
  get $() { return getFields(this) }
  async registerToEvent(e: EventInList) {

    await openDialog(InputAreaComponent, x => x.args = {
      title: this.settings.lang.register,
      settings: {
        fields: () => [this.$.phone, this.$.name, this.$.rememberMeOnThisDevice]
      },
      cancel: () => { },
      ok: async () => {
        await this.registerVolunteerToEvent(e.id);
      }
    })






  }
  @BackendMethod({ allowed: true })
  async registerVolunteerToEvent(id: string, context?: Context) {
    this.phone = new Phone(Phone.fixPhoneInput(this.phone.thePhone, context));
    let helper: HelpersBase;
    if (context.authenticated()) {
      helper = context.currentUser;
    }
    else {
      helper = await context.for(Helpers).findFirst({ where: h => h.phone.isEqualTo(this.phone) })
    }
    /*
  let ev = this.volunteerInEvent(e);
  if (ev.isNew()) {
    ev.eventId = e.id;
    //  ev.helper = this.familyLists.helper;
    await ev.save();
    e.registeredVolunteers++;
  }*/
  }
  async cancelEvent(e: EventInList) {
    let ev = this.volunteerInEvent(e);
    if (!ev.isNew()) {
      await ev.delete();
      e.registeredVolunteers--;
      this.volunteerEvents.set(e.id, undefined);
    }
  }
  volunteerEvents = new Map<string, volunteersInEvent>();
  volunteerInEvent(e: EventInList) {
    let r = this.volunteerEvents.get(e.id);
    if (!r) {
      this.volunteerEvents.set(e.id, r = this.context.for(volunteersInEvent).create());
      // this.context.for(volunteersInEvent).findFirst(ve => ve.eventId.isEqualTo(e.id).and(ve.helper.isEqualTo(this.familyLists.helper))).then(ev => {


    }

    return r;
  }

}
