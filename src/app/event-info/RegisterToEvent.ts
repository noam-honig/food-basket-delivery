import { DataControl } from '@remult/angular/interfaces';
import { BackendMethod, Controller, getFields, Validators, EventSource, FieldMetadata, FieldRef, Fields, FieldsRef, remult } from 'remult';
import { actionInfo } from 'remult/src/server-action';
import { EventInList, volunteersInEvent, Event, eventDisplayDate } from '../events/events';
import { Helpers } from '../helpers/helpers';
import { InitContext, UITools } from '../helpers/init-context';
import { CustomColumn, registerQuestionForVolunteers } from '../manage/ApplicationSettings';
import { ManageController } from '../manage/manage.controller';
import { Phone } from '../model-shared/phone';
import { Email } from '../model-shared/types';
import { doOnRemoteHagai } from '../overview/remoteHagai';
import { Sites } from '../sites/sites';
import { Field, use } from '../translate';


function storedInfo(): VolunteerInfo {
    let r = localStorage.getItem(infoKeyInStorage);
    if (r)
        return JSON.parse(r);
    return {
        phone: '',
        name: '',
        lastName: ''
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
        getFieldToUpdate: (h: FieldsRef<Helpers>, e: FieldsRef<volunteersInEvent>) => FieldRef
    }[] = [];
    inited = false;
    async init() {
        if (this.inited)
            return;
        this.inited = true;
        let s = (await remult.context.getSettings());
        if (!actionInfo.runningOnServer) {

            this.phone = new Phone(RegisterToEvent.volunteerInfo.phone);
            this.name = RegisterToEvent.volunteerInfo.name;
            this.lastName = RegisterToEvent.volunteerInfo.lastName || '';
            let h = (await remult.context.getCurrentUser())
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
            if (!remult.authenticated()) {
                c.value = new Phone(Phone.fixPhoneInput(c.value.thePhone))
                Phone.validatePhone(c, true);
            }

        }
    })
    phone: Phone;
    @Field<RegisterToEvent>({
        caption: "שם",
        validate: (e, name) => {
            if (!remult.authenticated()) {
                Validators.required(e, name, remult.context.lang.nameIsTooShort)
            }
        }
    })
    name: string;
    @Field<RegisterToEvent>({
        caption: use.language.lastName
    })
    lastName: string;
    @Field({ translation: l => l.rememberMeOnThisDevice })
    rememberMeOnThisDevice: boolean;

    @CustomColumn(() => registerQuestionForVolunteers[1])
    a1: string = '';
    @CustomColumn(() => registerQuestionForVolunteers[2])
    a2: string = '';
    @CustomColumn(() => registerQuestionForVolunteers[3])
    a3: string = '';
    @CustomColumn(() => registerQuestionForVolunteers[4])
    a4: string = '';
    @Field({ translation: l => l.socialSecurityNumber })
    socialSecurityNumber: string = '';
    @Field()
    email: Email = new Email('');
    @Field({ translation: l => l.preferredDistributionAreaAddress, customInput: c => c.addressInput() })
    preferredDistributionAreaAddress: string = '';
    @Field({

        dbName: 'preferredDistributionAreaAddress2'
        , customInput: c => c.addressInput()
    })
    preferredFinishAddress: string = '';

    get $() { return getFields(this, remult); }
    async registerToEvent(e: EventInList, ui: UITools) {
        ui.trackVolunteer("register-event:" + e.site);
        await this.init();
        this.a1 = '';
        this.a2 = '';
        this.a3 = '';
        this.a4 = '';
        const sp = new URLSearchParams(window.location.search);
        for (const f of [this.$.a1, this.$.a2, this.$.a3, this.$.a4]) {
            let val = sp.get(f.metadata.key);
            if (val)
                f.value = val;
        }
        let lang = remult.context.lang;
        this.rememberMeOnThisDevice = storedInfo().name != '';
        let currentHelper = (await remult.context.getCurrentUser());
        if (remult.authenticated()) {
            this.phone = currentHelper.phone;
            this.name = currentHelper.name;
        }
        if (!remult.authenticated() || this.questions.filter(x => x.show()).length > 0 || e.remoteUrl)
            await ui.inputAreaDialog({
                title: lang.register,
                helpText: lang.registerHelpText,
                fields: [{ field: this.$.name, visible: () => !remult.authenticated() },
                { field: this.$.lastName, visible: () => !remult.authenticated() }, { field: this.$.phone, visible: () => !remult.authenticated() }, ...this.questions.filter(x => x.show()).map(x => ({ field: x.field, click: null })), this.$.rememberMeOnThisDevice],
                cancel: () => { },
                ok: async () => {

                    this.updateEvent(e, await this.registerVolunteerToEvent(e.id, e.site, true, e.remoteUrl));

                    if (currentHelper)
                        await currentHelper._.reload();
                    let refresh = false;
                    if (this.phone.thePhone != RegisterToEvent.volunteerInfo.phone)
                        refresh = true;
                    RegisterToEvent.volunteerInfo = { phone: this.phone.thePhone, name: this.name, lastName: this.lastName };
                    if (this.rememberMeOnThisDevice)
                        localStorage.setItem(infoKeyInStorage, JSON.stringify(RegisterToEvent.volunteerInfo));
                    if (refresh)
                        RegisterToEvent.volunteerInfoChanged.fire();
                    let message = lang.youVeRegisteredTo + " " + e.name + ", " + eventDisplayDate(e) + lang.thanksForVolunteering;
                    ui.messageDialog(message).then(() => {
                        ui.Info(message);
                    });

                }
            });
        else {

            this.updateEvent(e, await this.registerVolunteerToEvent(e.id, e.site, true, e.remoteUrl));
        }
    }
    async updateEvent(e: EventInList, update: EventInList) {
        if (e instanceof Event)
            await e._.reload();
        else Object.assign(e, update);
    }
    async removeFromEvent(e: EventInList, ui: UITools) {
        ui.trackVolunteer("un-register-event:" + e.site);
        this.updateEvent(e, await this.registerVolunteerToEvent(e.id, e.site, false, e.remoteUrl));
    }
    @BackendMethod({ allowed: true })
    async registerVolunteerToEvent(id: string, site: string, register: boolean, remoteUrl?: string) {
        if (remoteUrl)
            return await doOnRemoteHagai(async (remote, url) => {
                return await remote.call(this.registerVolunteerToEvent, this,id, site, register, remoteUrl).then((x: EventInList) => ({ ...x, remoteUrl: url, eventLogo: remoteUrl + x.eventLogo }));
            });
        await this.init();
        if (site) {
            let dp = Sites.getDataProviderForOrg(site);

            remult.dataProvider = (dp);
            Sites.setSiteToContext(site);
            await InitContext(remult);
        }
        let helper: Helpers;
        if (remult.authenticated()) {
            helper = await remult.repo(Helpers).findId(remult.user.id);
        }
        else {
            helper = await remult.repo(Helpers).findFirst({ phone: this.phone }, {
                createIfNotFound: register
            });
            if (helper.isNew()) {
                helper.name = (this.name + ' ' + this.lastName).trim();
                await helper.save();
            }
            remult.user = ({
                id: helper.id,
                name: helper.name,
                roles: [],
                theHelperIAmEscortingId: undefined, distributionCenter: '', escortedHelperName: ""
            });
        }
        let helperInEvent = await remult.repo(volunteersInEvent).findFirst({ eventId: id, helper }, {
            createIfNotFound: register
        });
        if (register) {
            helperInEvent.canceled = false;
            helperInEvent.fromGeneralList = !!site;
            for (const q of this.questions.filter(q => q.show())) {
                if (q.field.displayValue || remult.authenticated()) {
                    let target = q.getFieldToUpdate(helper.$, helperInEvent.$);
                    if (target)
                        target.value = q.field.value;
                }
            }
            await helper.save();
            //console.log(helperInEvent.$.toArray().filter(x => x.valueChanged()).map(({ value, originalValue, ...f }) => ({ key: f.metadata.key, value, originalValue })));
            await helperInEvent.save();
        }
        else {
            helperInEvent.canceled = true;
            await helperInEvent.save();
        }
        const event = await remult.repo(Event).findId(id);
        try {
            const l = remult.context.lang;
            const what = helper.name + " " + (register ? l.hasRegisteredTo : l.hasCanceledRegistration) + " " + event.name
            ManageController.sendEmailFromHagaiAdmin(what,
                l.hello + " " + (await remult.context.getSettings()).organisationName + "\r\n\r\n" +
                what + " " + l.thatWillTakePlaceAt + " " + event.$.eventDate.displayValue);

        }
        catch { }
        return (event).toEventInList(helper);
    }
}
const infoKeyInStorage = "myVolunteerInfo";
interface VolunteerInfo {
    phone: string;
    name: string;
    lastName: string;
}
