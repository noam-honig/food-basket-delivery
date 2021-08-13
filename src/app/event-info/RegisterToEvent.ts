import { DataControl, openDialog } from '@remult/angular';
import { BackendMethod, Context, Controller, getFields, Validators, EventSource } from 'remult';
import { actionInfo } from 'remult/src/server-action';
import { EventInList, volunteersInEvent, Event } from '../events/events';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { InitContext } from '../helpers/init-context';
import { getSettings } from '../manage/ApplicationSettings';
import { Phone } from '../model-shared/phone';
import { DialogService } from '../select-popup/dialog';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { Sites } from '../sites/sites';
import { Field } from '../translate';


function storedInfo(): VolunteerInfo {
    let r = localStorage.getItem(infoKeyInStorage);
    if (r)
        return JSON.parse(r);
    return {
        phone: '',
        name: ''
    }
}


@Controller('event-Info')
export class RegisterToEvent {
    constructor(private context: Context) {
        if (!actionInfo.runningOnServer) {

            this.phone = new Phone(RegisterToEvent.volunteerInfo.phone);
            this.name = RegisterToEvent.volunteerInfo.name;
        }
    }
    static volunteerInfo: VolunteerInfo;
    static volunteerInfoChanged = new EventSource();
    @DataControl({ allowClick: () => false })
    @Field<RegisterToEvent>({
        translation: l => l.phone,
        valueType: Phone,
        validate: (e, c) => {
            c.value = new Phone(Phone.fixPhoneInput(c.value.thePhone, e.context))
            Phone.validatePhone(c, e.context, true);

        }
    })
    phone: Phone;
    @Field<RegisterToEvent>({
        caption: "שם",
        validate: (e, name) => Validators.required(e, name, e.context.lang.nameIsTooShort)
    })

    name: string;
    @Field({ translation: l => l.rememberMeOnThisDevice })
    rememberMeOnThisDevice: boolean;
    get $() { return getFields(this); }
    async registerToEvent(e: EventInList, dialog: DialogService) {
        dialog.trackVolunteer("register-event:" + e.site);
        this.rememberMeOnThisDevice = storedInfo().name != '';
        if (!this.context.authenticated())
            await openDialog(InputAreaComponent, x => x.args = {
                title: getSettings(this.context).lang.register,
                settings: {
                    fields: () => [this.$.phone, this.$.name, this.$.rememberMeOnThisDevice]
                },
                cancel: () => { },
                ok: async () => {

                    this.updateEvent(e, await this.registerVolunteerToEvent(e.id, e.site, true));
                    RegisterToEvent.volunteerInfo = { phone: this.phone.thePhone, name: this.name };
                    if (this.rememberMeOnThisDevice)
                        localStorage.setItem(infoKeyInStorage, JSON.stringify(RegisterToEvent.volunteerInfo));
                    if (this.phone.thePhone != RegisterToEvent.volunteerInfo.phone)
                        RegisterToEvent.volunteerInfoChanged.fire();

                }
            });
        else {
            this.phone = this.context.currentUser.phone;
            this.name = this.context.currentUser.name;
            this.updateEvent(e, await this.registerVolunteerToEvent(e.id, e.site, true));
        }
    }
    async updateEvent(e: EventInList, update: EventInList) {
        if (e instanceof Event)
            await e._.reload();
        else Object.assign(e, update);
    }
    async removeFromEvent(e: EventInList, dialog: DialogService) {
        dialog.trackVolunteer("un-register-event:" + e.site);
        this.updateEvent(e, await this.registerVolunteerToEvent(e.id, e.site, false));
    }
    @BackendMethod({ allowed: true })
    async registerVolunteerToEvent(id: string, site: string, register) {

        if (site) {
            let dp = Sites.getDataProviderForOrg(site);

            let orig = this.context;
            this.context = new Context();
            this.context.setDataProvider(dp);
            Sites.setSiteToContext(this.context, site, orig);
            await InitContext(this.context);
        }
        let helper: HelpersBase;
        if (this.context.authenticated()) {
            helper = this.context.currentUser;
        }
        else {
            helper = await this.context.for(Helpers).findFirst({
                where: h => h.phone.isEqualTo(this.phone),
                createIfNotFound: register
            });
            if (helper.isNew()) {
                helper.name = this.name;
                await helper.save();
            }
            this.context.currentUser = helper as Helpers;
        }
        let helperInEvent = await this.context.for(volunteersInEvent).findFirst({
            where: v => v.eventId.isEqualTo(id).and(v.helper.isEqualTo(helper)),
            createIfNotFound: register
        });
        if (register) {
            helperInEvent.canceled = false;
            helperInEvent.fromGeneralList = !!site;
            await helperInEvent.save();
        }
        else {
            helperInEvent.canceled = true;
            await helperInEvent.save();
        }
        return (await this.context.for(Event).findId(id)).toEventInList(helper);
    }
}
const infoKeyInStorage = "myVolunteerInfo";
interface VolunteerInfo {
    phone: string;
    name: string;
}

if (!actionInfo.runningOnServer) {
    RegisterToEvent.volunteerInfo = storedInfo();
}