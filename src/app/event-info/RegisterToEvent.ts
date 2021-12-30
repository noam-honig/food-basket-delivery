import { DataControl, openDialog } from '@remult/angular';
import { BackendMethod, Remult, Controller, getFields, Validators, EventSource, FieldMetadata, FieldRef, Fields } from 'remult';
import { actionInfo } from 'remult/src/server-action';
import { EventInList, volunteersInEvent, Event, eventDisplayDate } from '../events/events';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { InitContext } from '../helpers/init-context';
import { CustomColumn, getSettings, registerQuestionForVolunteers } from '../manage/ApplicationSettings';
import { Phone } from '../model-shared/phone';
import { Email } from '../model-shared/types';
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
    static init() {
        if (!RegisterToEvent.volunteerInfo)
            RegisterToEvent.volunteerInfo = storedInfo();
    }
    questions: {
        field: FieldRef,
        show: () => boolean,
        helperField?: FieldMetadata,
        getFieldToUpdate: (h: Fields<Helpers>, e: Fields<volunteersInEvent>) => FieldRef
    }[] = [];
    constructor(private remult: Remult) {






    }
    async init() {
        let s = (await this.remult.getSettings());
        if (!actionInfo.runningOnServer) {

            this.phone = new Phone(RegisterToEvent.volunteerInfo.phone);
            this.name = RegisterToEvent.volunteerInfo.name;
            let h = (await this.remult.getCurrentUser())
            if (h) {
                this.socialSecurityNumber = h.socialSecurityNumber;
                this.email = h.email;
                this.preferredDistributionAreaAddress = h.preferredDistributionAreaAddress;
                this.preferredFinishAddress = h.preferredFinishAddress;
            }
        }
        this.questions.push({ field: this.$.socialSecurityNumber, show: () => s.registerAskTz, getFieldToUpdate: h => h.socialSecurityNumber })
        this.questions.push({ field: this.$.email, show: () => s.registerAskEmail, getFieldToUpdate: h => h.email })
        this.questions.push({ field: this.$.preferredDistributionAreaAddress, show: () => s.registerAskPreferredDistributionAreaAddress, getFieldToUpdate: h => h.preferredDistributionAreaAddress })
        this.questions.push({ field: this.$.preferredFinishAddress, show: () => s.registerAskPreferredFinishAddress, getFieldToUpdate: h => h.preferredFinishAddress })
        this.questions.push({ field: this.$.a1, show: () => !!s.questionForRegistration1Caption, getFieldToUpdate: (h, e) => e.a1 });
        this.questions.push({ field: this.$.a2, show: () => !!s.questionForRegistration2Caption, getFieldToUpdate: (h, e) => e.a2 });
        this.questions.push({ field: this.$.a3, show: () => !!s.questionForRegistration3Caption, getFieldToUpdate: (h, e) => e.a3 });
        this.questions.push({ field: this.$.a4, show: () => !!s.questionForRegistration4Caption, getFieldToUpdate: (h, e) => e.a4 });
    }
    static volunteerInfo: VolunteerInfo;
    static volunteerInfoChanged = new EventSource();
    @DataControl({ allowClick: () => false })
    @Field<RegisterToEvent>({
        translation: l => l.phone,
        valueType: Phone,
        validate: (e, c) => {
            if (!e.remult.authenticated()) {
                c.value = new Phone(Phone.fixPhoneInput(c.value.thePhone, e.remult))
                Phone.validatePhone(c, e.remult, true);
            }

        }
    })
    phone: Phone;
    @Field<RegisterToEvent>({
        caption: "שם",
        validate: (e, name) => {
            if (!e.remult.authenticated()) {
                Validators.required(e, name, e.remult.lang.nameIsTooShort)
            }
        }
    })
    name: string;
    @Field({ translation: l => l.rememberMeOnThisDevice })
    rememberMeOnThisDevice: boolean;

    @CustomColumn(() => registerQuestionForVolunteers[1])
    a1: string;
    @CustomColumn(() => registerQuestionForVolunteers[2])
    a2: string;
    @CustomColumn(() => registerQuestionForVolunteers[3])
    a3: string;
    @CustomColumn(() => registerQuestionForVolunteers[4])
    a4: string;
    @Field({ translation: l => l.socialSecurityNumber })
    socialSecurityNumber: string;
    @Field()
    email: Email;
    @Field({ translation: l => l.preferredDistributionArea })
    preferredDistributionAreaAddress: string;
    @Field({

        dbName: 'preferredDistributionAreaAddress2'
    })
    preferredFinishAddress: string;

    get $() { return getFields(this); }
    async registerToEvent(e: EventInList, dialog: DialogService) {
        dialog.trackVolunteer("register-event:" + e.site);
        await this.init();
        let lang = this.remult.lang;
        this.rememberMeOnThisDevice = storedInfo().name != '';
        let currentHelper = (await this.remult.getCurrentUser());
        if (!this.remult.authenticated() || this.questions.filter(x => x.show()).length > 0)
            await openDialog(InputAreaComponent, x => x.args = {
                title: lang.register,
                helpText: lang.registerHelpText,
                settings: {
                    fields: () => [this.$.name, this.$.phone, ...this.questions.filter(x => x.show()).map(x => ({ field: x.field, click: null })), this.$.rememberMeOnThisDevice]
                },
                cancel: () => { },
                ok: async () => {

                    this.updateEvent(e, await this.registerVolunteerToEvent(e.id, e.site, true));

                    if (currentHelper)
                        await currentHelper._.reload();
                    let refresh = false;
                    if (this.phone.thePhone != RegisterToEvent.volunteerInfo.phone)
                        refresh = true;
                    RegisterToEvent.volunteerInfo = { phone: this.phone.thePhone, name: this.name };
                    if (this.rememberMeOnThisDevice)
                        localStorage.setItem(infoKeyInStorage, JSON.stringify(RegisterToEvent.volunteerInfo));
                    if (refresh)
                        RegisterToEvent.volunteerInfoChanged.fire();
                    let message = lang.youVeRegisteredTo + " " + e.name + ", " + eventDisplayDate(e) + lang.thanksForVolunteering;
                    dialog.messageDialog(message).then(() => {
                        dialog.Info(message);
                    });

                }
            });
        else {
            this.phone = currentHelper.phone;
            this.name = currentHelper.name;
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
    async registerVolunteerToEvent(id: string, site: string, register: boolean) {
        await this.init();
        if (site) {
            let dp = Sites.getDataProviderForOrg(site);

            let orig = this.remult;
            this.remult = new Remult();
            this.remult.setDataProvider(dp);
            Sites.setSiteToContext(this.remult, site, orig);
            await InitContext(this.remult);
        }
        let helper: Helpers;
        if (this.remult.authenticated()) {
            helper = await this.remult.repo(Helpers).findId(this.remult.user.id);
        }
        else {
            helper = await this.remult.repo(Helpers).findFirst({ phone: this.phone }, {
                createIfNotFound: register
            });
            if (helper.isNew()) {
                helper.name = this.name;
                await helper.save();
            }
            this.remult.setUser({
                id: helper.id,
                name: helper.name,
                roles: []
            });
        }
        let helperInEvent = await this.remult.repo(volunteersInEvent).findFirst({ eventId: id, helper }, {
            createIfNotFound: register
        });
        if (register) {
            helperInEvent.canceled = false;
            helperInEvent.fromGeneralList = !!site;
            for (const q of this.questions.filter(q => q.show())) {
                if (q.field.displayValue || this.remult.authenticated()) {
                    let target = q.getFieldToUpdate(helper.$, helperInEvent.$);
                    if (target)
                        target.value = q.field.value;
                }
            }
            await helper.save();
            await helperInEvent.save();
        }
        else {
            helperInEvent.canceled = true;
            await helperInEvent.save();
        }
        return (await this.remult.repo(Event).findId(id)).toEventInList(helper);
    }
}
const infoKeyInStorage = "myVolunteerInfo";
interface VolunteerInfo {
    phone: string;
    name: string;
}

