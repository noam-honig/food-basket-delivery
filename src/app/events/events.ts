import { IdEntity,  Entity, FieldsMetadata, Allow, EntityRef, FieldMetadata, Validators, isBackend, BackendMethod, ProgressListener, ValueConverters, remult } from "remult";
import { DataControl, DataControlInfo, DataControlSettings, GridSettings, InputField, RowButton } from '@remult/angular/interfaces';
import { use, ValueListFieldType, Field, Fields } from "../translate";
import { getLang } from '../sites/sites';
import { Roles } from "../auth/roles";
import { Helpers, HelpersBase } from "../helpers/helpers";
import { DateTimeColumn, ChangeDateColumn } from "../model-shared/types";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { saveToExcel } from '../shared/saveToExcel';
import { ApplicationSettings, CustomColumn, getSettings, registerQuestionForVolunteers } from "../manage/ApplicationSettings";

import { DistributionCenters } from "../manage/distribution-centers";
import { AddressHelper, Location } from "../shared/googleApiHelpers";

import { DeliveryStatus } from "../families/DeliveryStatus";

import * as moment from "moment";

import { messageMerger, MessageTemplate } from "../edit-custom-message/messageMerger";
import { SendSmsUtils } from "../asign-family/send-sms-action";
import { SendBulkSms } from "../helpers/send-bulk-sms";
import { UITools } from "../helpers/init-context";
import { Callers } from "../manage-callers/callers";
import { VolunteerNeedType } from "../manage/VolunteerNeedType";




@ValueListFieldType({
    caption: use.language.eventType
})
export class EventType {
    static foodDelivery = new EventType(use.language.foodDelivery, "");
    static packaging = new EventType(use.language.parcelPackaging);
    static other = new EventType(use.language.other);
    constructor(public caption: string, public id: string = undefined) {

    }
}


@ValueListFieldType({
    translation: l => l.eventStatus,
    defaultValue: () => eventStatus.active
})

export class eventStatus {
    static active = new eventStatus(0, use.language.activeEventStatus);
    static preparation = new eventStatus(5, use.language.eventPreparation);
    static archive = new eventStatus(9, use.language.archiveEventStatus);

    constructor(public id: number, public caption: string) {

    }
}
@Entity<Event>('events', {
    allowApiCrud: Roles.admin,
    allowApiRead: Allow.authenticated,
    saving: async (self) => {
        if (isBackend()) {
            await self.addressHelper.updateApiResultIfChanged();
            if (self.distributionCenter == null)
                self.distributionCenter = await remult.context.defaultDistributionCenter();
        }
    },
    apiPrefilter: () => ({
        eventStatus: !remult.isAllowed(Roles.admin) ? eventStatus.active : undefined
    })
}
)
export class Event extends IdEntity {
    async toEventInList(helper: HelpersBase): Promise<EventInList> {
        let {
            id,
            name,
            type,
            description,
            eventDateJson,
            startTime,
            endTime,
            city,
            theAddress,
            longLat,
            thePhone,
            thePhoneDisplay,
            thePhoneDescription,
            requiredVolunteers,
            registeredVolunteers,
            location,
            orgName,
            eventLogo
        } = this;
        return {
            id,
            name,
            type,
            description,
            eventDateJson,
            startTime,
            endTime,
            city,
            theAddress,
            longLat,
            thePhone,
            thePhoneDisplay,
            thePhoneDescription,
            requiredVolunteers,
            registeredVolunteers,
            registeredToEvent: await this.volunteeredIsRegisteredToEvent(helper),
            eventLogo,
            location,
            orgName

        }
    }
    async volunteeredIsRegisteredToEvent(helper: HelpersBase) {
        if (!helper)
            return false;
        return !!(await remult.repo(volunteersInEvent).findFirst({
            helper,
            eventId: this.id,
            canceled: false
        }))
    }
    @Field<Event>({
        serverExpression: async self => self.volunteeredIsRegisteredToEvent((await remult.context.getCurrentUser()))
    })
    registeredToEvent: boolean;

    createMessage(volunteer: volunteersInEvent) {
        return new messageMerger([
            { token: "מתנדב", caption: "שם המתנדב", value: volunteer.helper.name },
            { token: "ארוע", caption: "שם הארוע", value: this.name },
            { token: "כתובת", value: this.theAddress },
            { token: "תאריך", caption: "מועד הארוע", value: eventDisplayDate(this) },
            { token: "משעה", value: this.startTime },
            { token: "עד שעה", value: this.endTime },
            { token: "ארגון", value: getSettings().organisationName },
        ]);
    }

    async showVolunteers(ui: UITools) {
        if (remult.isAllowed(Roles.admin))
            await this.save();
        await volunteersInEvent.displayVolunteer({  event: this, ui })
        await this._.reload();
    }

    @BackendMethod({ allowed: Roles.admin, queue: true })
    async sendParticipationConfirmMessage(progress?: ProgressListener) {
        let settings = await ApplicationSettings.getAsync();
        if (!settings.bulkSmsEnabled)
            throw "אינך רשאי לשלוח הודעות לקבוצה";
        let i = 0;
        for await (const v of remult.repo(volunteersInEvent).query({
            progress,
            where: {
                eventId: this.id,
                canceled: false,
                confirmed: false
            }
        }
        )) {
            if (v.helper)
                if (!v.helper.doNotSendSms) {
                    await new SendSmsUtils().sendSms(v.helper.phone.thePhone,
                        this.createMessage(v).merge(settings.confirmEventParticipationMessage),
                         v.helper, {
                        eventId: this.id
                    });
                    i++;

                }
        }
        return "נשלחו " + i + " הודעות";
    }
    @BackendMethod({ allowed: Roles.admin, queue: true })
    async sendParticipationReminderMessageMessage(progress?: ProgressListener) {
        let settings = await ApplicationSettings.getAsync();
        if (!settings.bulkSmsEnabled)
            throw "אינך רשאי לשלוח הודעות לקבוצה";
        const message = await remult.repo(MessageTemplate).findId("attendanceReminder", { createIfNotFound: true });
        let i = 0;
        for await (const v of remult.repo(volunteersInEvent).query({
            progress,
            where: {
                eventId: this.id,
                canceled: false,
            }
        }
        )) {
            if (v.helper)
                if (!v.helper.doNotSendSms) {
                    if (v.assignedDeliveries > 0 && v.lastAssignTime < v.helper.smsDate)
                        continue;
                    await new SendSmsUtils().sendSms(v.helper.phone.thePhone,
                        this.createMessage(v).merge(message.template),
                         v.helper, {
                        eventId: this.id
                    });
                    i++;

                }
        }
        return "נשלחו " + i + " הודעות";
    }

    @Field<Event>({
        translation: l => l.eventName,
        validate: (s, c) => Validators.required(s, c, remult.context.lang.nameIsTooShort)
    })
    name: string;
    @Field()
    type: EventType = EventType.foodDelivery;
    @Field()
    eventStatus: eventStatus = eventStatus.active;
    @Field({ translation: l => l.eventDescription, customInput: x => x.textArea() })
    description: string;
    @Fields.dateOnly<Event>({
        translation: l => l.eventDate,
        validate: (s, c) => {
            if (!c.value || c.value.getFullYear() < 2018)
                c.error = remult.context.lang.invalidDate;
        }
    })
    eventDate: Date = new Date();
    @Field({ inputType: "time", translation: l => l.eventTime })
    @DataControl({ width: '110' })
    startTime: string;
    @Field({ inputType: "time", translation: l => l.eventEndTime })
    @DataControl({ width: '110' })
    endTime: string;
    @Fields.integer({ translation: l => l.requiredVolunteers })
    requiredVolunteers: number;
    @Field()
    addressApiResult: string;
    @Field({ translation: l => l.address })
    address: string;
    addressHelper = new AddressHelper(() => this.$.address, () => this.$.addressApiResult);
    @Field<Event>({
        allowApiUpdate: Roles.admin
    })
    distributionCenter: DistributionCenters;

    @Field({ translation: l => l.phone1 })
    phone1: Phone;
    @Field({ translation: l => l.phone1Description })
    phone1Description: string;
    @Field({
        translation: l => l.attendingVolunteers,
        sqlExpression: async (selfDefs) => {
            var vie = SqlFor(remult.repo(volunteersInEvent));
            let self = SqlFor(selfDefs);
            var sql = new SqlBuilder();
            return sql.columnCount(self, {
                from: vie,
                where: () => [sql.eq(vie.eventId, self.id), vie.where({ canceled: false })]
            })
        }
    }
    )
    registeredVolunteers: number;
    @Field({
        translation: l => l.confirmedVolunteers,
        sqlExpression: async (selfDefs) => {
            var vie = SqlFor(remult.repo(volunteersInEvent));
            let self = SqlFor(selfDefs);
            var sql = new SqlBuilder();
            return sql.columnCountWithAs(self, {
                from: vie,
                where: () => [sql.eq(vie.eventId, self.id), vie.where({ canceled: false, confirmed: true })]
            }, "confirmed")
        }
    })
    confirmedVolunteers: number;

    @Field()
    specificUrl: string = '';
    @Field()
    imageUrl: string = '';

    get eventLogo() {
        if (this.imageUrl)
            return this.imageUrl;
        return getSettings().logoUrl;
    }
    get location() {
        return this.getAddress()?.location;
    }
    get orgName() {
        return getSettings().organisationName;
    }
    get eventDateJson() {
        return ValueConverters.DateOnly.toJson(this.eventDate);
    }

    openEditDialog(ui: UITools, cancel: () => void = () => { }) {
        ui.inputAreaDialog({
            title: use.language.eventInfo,
            fields: Event.displayColumns(this._.repository.metadata.fields, ui)
                .map(x => mapFieldMetadataToFieldRef(this._, x)),
            ok: () => this.save(),
            cancel: () => {
                this._.undoChanges();
                cancel();
            },
            buttons: [
                {
                    text: use.language.volunteers,
                    click: () => this.showVolunteers(ui)
                }
            ]
        });
    }
    static rowButtons(settings: ApplicationSettings, ui: UITools): RowButton<Event>[] {
        return [
            {
                name: settings.lang.eventInfo,
                click: async (e) => {
                    e.openEditDialog(ui)
                }
            },
            {
                name: settings.lang.volunteers,
                click: async (e) => {
                    e.showVolunteers(ui);
                }
            }
        ];
    }
    static async duplicateEvent( ui: UITools, events: Event[], done: (createdEvents: Event[]) => void) {
        let settings = (await remult.context.getSettings());
        let archiveCurrentEvent = new InputField<boolean>({ valueType: Boolean, caption: settings.lang.archiveCurrentEvent });
        archiveCurrentEvent.value = true;
        let date = new InputField<Date>({ caption: settings.lang.eventDate, valueConverter: ValueConverters.DateOnly });
        date.value = new Date();
        await ui.inputAreaDialog({
            title: settings.lang.duplicateEvents,
            fields: [archiveCurrentEvent, date],
            cancel: () => { },
            ok: async () => {
                await ui.doWhileShowingBusy(async () => {
                    let r: Event[] = [];
                    for (const current of events) {
                        let e = remult.repo(Event).create({
                            name: current.name,
                            type: current.type,
                            description: current.description,
                            requiredVolunteers: current.requiredVolunteers,
                            startTime: current.startTime,
                            endTime: current.endTime,
                            eventDate: date.value,
                            address: current.address,
                            phone1: current.phone1,
                            phone1Description: current.phone1Description,
                            distributionCenter: current.distributionCenter,
                            specificUrl: current.specificUrl
                        });
                        r.push(e);


                        await e.save();
                        for (const c of await remult.repo(volunteersInEvent).find({
                            where: {
                                duplicateToNextEvent: true,
                                eventId: current.id
                            }
                        })) {
                            let v = remult.repo(volunteersInEvent).create();
                            v.eventId = e.id;
                            v.helper = c.helper;
                            v.duplicateToNextEvent = true;
                            await v.save();

                        }
                        if (archiveCurrentEvent.value) {
                            current.eventStatus = eventStatus.archive;
                            await current.save();
                        }
                    }
                    done(r);
                });
            }
        });
    }

    static displayColumns(e: FieldsMetadata<Event>, ui: UITools) {
        let r = [
            e.name,
            e.type,
            e.description,
            { width: '150', field: e.eventDate },
            e.startTime,
            e.endTime,
            { width: '100', field: e.requiredVolunteers },
            { width: '100', field: e.registeredVolunteers },
            { width: '100', field: e.confirmedVolunteers },
            { width: '150', field: e.eventStatus },
            { field: e.distributionCenter, visible: () => ui.hasManyCenters },
            e.address,
            e.phone1,
            e.phone1Description,
            e.specificUrl,
            e.imageUrl
        ];
        return r;
    }
    get thePhoneDescription() {
        if (this.phone1?.thePhone)
            return this.phone1Description;
        if (this.distributionCenter.phone1?.thePhone)
            return this.distributionCenter.phone1Description;
        return getSettings().helpText;
    }
    getPhone(): Phone {
        if (this.phone1?.thePhone)
            return this.phone1;
        if (this.distributionCenter.phone1?.thePhone)
            return this.distributionCenter.phone1;
        return getSettings().helpPhone;
    }
    get thePhone() {
        return this.getPhone()?.thePhone;
    }
    get thePhoneDisplay() {
        if (this.getPhone()?.thePhone)
            return this.getPhone().displayValue;
    }
    get theAddress() {
        if (this.getAddress().ok)
            return this.getAddress().getAddress;
    }
    getAddress() {
        if (this.addressHelper.ok)
            return this.addressHelper;
        if (this.distributionCenter?.addressHelper.ok)
            return this.distributionCenter.addressHelper;
        return getSettings().addressHelper;
    }
    get city() {
        if (this.getAddress().ok)
            return this.getAddress().getCity;
    }
    get longLat() {
        if (this.getAddress().ok)
            return this.getAddress().getlonglat;
    }


}
export function mapFieldMetadataToFieldRef(e: EntityRef<any>, x: DataControlInfo<any>) {
    let y = x as DataControlSettings<any, any>;
    if (y.getValue) {
        return y;
    }
    if (y.field) {
        return { ...y, field: e.fields.find(y.field as FieldMetadata) };
    }
    return e.fields.find(y as FieldMetadata);
}
@Entity<volunteersInEvent>('volunteersInEvent', {
    allowApiCrud: Allow.authenticated,
    allowApiDelete: false,
    apiPrefilter: () => ({
        helper: !remult.isAllowed([Roles.admin, Roles.distCenterAdmin]) ? { $id: [remult.user?.id] } : undefined
    }),
    saving: async (self) => {
        if (self.isNew() && isBackend()) {
            self.createDate = new Date();
            self.createUser = (await remult.context.getCurrentUser());
        }
        if (self.canceled && self.$.canceled.valueChanged()) {
            self.cancelUser = (await remult.context.getCurrentUser());

        }
        if (self.isNew() || self.$.canceled.valueChanged())
            self.registerStatusDate = new Date();
    }
})
export class volunteersInEvent extends IdEntity {
    @Field()
    eventId: string;
    @Field()
    helper: HelpersBase;

    @Field<volunteersInEvent>({
        translation: l => l.volunteerName,
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(remult.repo(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.name],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    helperName: string;

    @Field<volunteersInEvent>({
        translation: l => l.volunteerComment,
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(remult.repo(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.eventComment],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    volunteerComment: string;
    @Field({
        translation: l => l.volunteerPhoneNumber,
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(remult.repo(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.phone],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    helperPhone: Phone;
    @Field({
        translation: l => l.deliveriesAssigned,
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let d = SqlFor(remult.repo(ActiveFamilyDeliveries));
            return sql.columnCount(self, { from: d, where: () => [sql.eq(self.helper, d.courier)] })
        }
    })
    assignedDeliveries: number;

    @Field({ allowApiUpdate: Roles.distCenterAdmin, translation: l => l.confirmed })
    confirmed: boolean;

    @Field({ allowApiUpdate: Roles.distCenterAdmin })
    canceled: boolean;

    @Field({
        translation: l => l.delveriesSuccessfulEver,
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let d = SqlFor(remult.repo(FamilyDeliveries));
            return sql.columnCountWithAs(self, { from: d, where: () => [sql.eq(self.helper, d.courier), d.where({ deliverStatus: DeliveryStatus.isSuccess() })] }, 'succesfulDeliveries')
        }
    })

    succesfulDeliveries: number;
    @Field<volunteersInEvent>({
        translation: l => l.email,
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(remult.repo(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.email],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    helperEmail: string;
    @Field<volunteersInEvent>({
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(remult.repo(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.preferredDistributionAreaAddress],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    preferredDistributionAreaAddress: string;
    @Field<volunteersInEvent>({
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(remult.repo(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.preferredFinishAddress],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    preferredFinishAddress: string;
    @Field<volunteersInEvent>({
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(remult.repo(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.preferredDistributionAreaAddressCity],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    preferredDistributionAreaAddressCity: string;
    @Field<volunteersInEvent>({
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(remult.repo(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.preferredFinishAddressCity],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    preferredFinishAddressCity: string;
    @Field({
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(remult.repo(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.smsDate],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    lastSmsTime: Date;
    @Field({
        sqlExpression: async (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let d = SqlFor(remult.repo(FamilyDeliveries));
            return sql.columnMaxWithAs(self, d.courierAssingTime, { from: d, where: () => [sql.eq(self.helper, d.courier)] }, 'lastAssignTime')
        }
    })
    lastAssignTime: Date;
    @Field({ translation: l => l.duplicateForNextEvent })
    duplicateToNextEvent: boolean;
    @ChangeDateColumn({ translation: l => l.createDate })
    createDate: Date;
    @Field({ translation: l => l.createUser, allowApiUpdate: false })
    createUser: HelpersBase;

    @ChangeDateColumn()
    registerStatusDate: Date;
    @Field({ translation: l => l.cancelUser, allowApiUpdate: false })
    cancelUser: HelpersBase;


    @Field({ allowApiUpdate: false })
    fromGeneralList: boolean;


    @CustomColumn(() => registerQuestionForVolunteers[1])
    a1: string;
    @CustomColumn(() => registerQuestionForVolunteers[2])
    a2: string;
    @CustomColumn(() => registerQuestionForVolunteers[3])
    a3: string;
    @CustomColumn(() => registerQuestionForVolunteers[4])
    a4: string;


    static async displayVolunteer({  event, ui }: {
        event: Event,
        ui: UITools

    }) {
        const settings = await remult.context.getSettings();
        const gridSettings = new GridSettings<volunteersInEvent>(remult.repo(volunteersInEvent), {

            rowsInPage: 50,
            allowUpdate: true,
            where: () => ({ eventId: event.id }),
            orderBy: { registerStatusDate: "desc" },
            knowTotalRows: true,
            numOfColumnsInGrid: 10,
            columnSettings: (ev: FieldsMetadata<volunteersInEvent>) => [
                { width: '100', field: ev.helperName, readonly: true },
                {
                    caption: getLang().volunteerStatus,
                    getValue: v => {
                        if (v.canceled)
                            return use.language.canceledParticipation;
                        let additionalText = '';
                        if (v.confirmed)
                            additionalText = ", " + v.$.confirmed.metadata.caption;
                        if (v.assignedDeliveries > 0)
                            if (v.lastAssignTime < v.lastSmsTime)
                                return getLang().smsSent + additionalText;
                            else
                                return getLang().assigned + additionalText;
                        else if (v.succesfulDeliveries == 0)
                            return getLang().newVolunteer + additionalText
                        else return getLang().unAsigned + additionalText

                    },
                    width: '100'
                },
                { width: '100', field: ev.assignedDeliveries, readonly: true },
                { width: '100', field: ev.succesfulDeliveries, readonly: true },
                { width: '150', field: ev.helperPhone, readonly: true },
                { readonly: true, field: ev.helperEmail },
                { width: '100', field: ev.duplicateToNextEvent },
                ev.registerStatusDate,
                ev.fromGeneralList,
                ev.createDate,
                ev.createUser,
                ev.canceled,
                ev.cancelUser,
                ev.a1, ev.a2, ev.a3, ev.a4,
                ev.confirmed,
                ev.volunteerComment,
                ev.preferredDistributionAreaAddress,
                ev.preferredFinishAddress,
                ev.preferredDistributionAreaAddressCity,
                ev.preferredFinishAddressCity
            ],
            rowCssClass: v => {
                if (v.canceled)
                    return "forzen";
                if (v.assignedDeliveries > 0)
                    if (v.lastAssignTime < v.lastSmsTime)
                        return 'deliveredOk';
                    else
                        return 'largeDelivery';
                else if (v.succesfulDeliveries == 0)
                    return 'newVolunteer'
                return '';
            },
            gridButtons: [
                {
                    name: getLang().sendRequestConfirmSms,
                    visible: () => getSettings().bulkSmsEnabled && gridSettings.currentRow,
                    click: async () => {
                        ui.editCustomMessageDialog({
                            helpText: 'פעולה זו תשלח הודעה לכל מתנדבי הארוע ותבקש מהם לאשר הגעה.  אם המתנדב ישיב "כן", ירשם שהוא אישור הגעה, אם השיב "לא" ירשם שביטל השתתפות ואם השיב "הסר" יוסר מרשימות התפוצה',
                            title: getLang().sendRequestConfirmSms,
                            message: event.createMessage(gridSettings.currentRow),
                            templateText: settings.confirmEventParticipationMessage,
                            buttons: [
                                {
                                    name: 'שמור הודעה',
                                    click: async ({ templateText }) => {
                                        settings.confirmEventParticipationMessage = templateText;
                                        await settings.save();
                                        ui.Info("העדכון נשמר")
                                    }
                                }, {
                                    name: "שלח הודעה",
                                    click: async ({ templateText, close }) => {
                                        let count = gridSettings.totalRows;
                                        if (await ui.YesNoPromise("לשלוח הודעה לכל המתנדבים שנרשמו?")) {
                                            settings.confirmEventParticipationMessage = templateText;
                                            await settings.save();
                                            let result = await event.sendParticipationConfirmMessage();
                                            ui.Info(result);
                                            close();
                                        }
                                    }
                                }
                            ]
                        });
                    }
                },
                {
                    name: getLang().sendAttendanceReminder,
                    visible: () => getSettings().bulkSmsEnabled && gridSettings.currentRow,
                    click: async () => {
                        const message = await remult.repo(MessageTemplate).findId("attendanceReminder", { createIfNotFound: true });


                        ui.editCustomMessageDialog({
                            helpText: 'פעולה זו תשלח הודעה לכל מתנדבי הארוע',
                            title: getLang().sendAttendanceReminder,
                            message: event.createMessage(gridSettings.currentRow),
                            templateText: message.template,
                            buttons: [
                                {
                                    name: 'שמור הודעה',
                                    click: async ({ templateText }) => {
                                        message.template = templateText;
                                        await message.save();
                                        ui.Info("העדכון נשמר")
                                    }
                                }, {
                                    name: "שלח הודעה",
                                    click: async ({ templateText, close }) => {
                                        let count = gridSettings.totalRows;
                                        if (await ui.YesNoPromise("לשלוח הודעה לכל המתנדבים שנרשמו?")) {
                                            message.template = templateText;
                                            await message.save();
                                            let result = await event.sendParticipationReminderMessageMessage();
                                            ui.Info(result);
                                            close();
                                        }
                                    }
                                }
                            ]
                        });
                    }
                },
                {
                    name: 'סמן את כל המתנדבים כטלפנים',
                    visible: () => settings.usingCallModule,
                    click: async () => {
                        ui.Info(await Callers.updateEventVolunteerAsCallers(event.id))
                    }
                },
                {
                    name: getLang().exportToExcel,
                    click: async () => {
                        saveToExcel((await remult.context.getSettings()), remult.repo(volunteersInEvent), gridSettings, use.language.volunteersRegisteredTo + " " + event.name, ui,
                            (e, c) => c == e.$.id || c == e.$.eventId || c == e.$.helperName || c == e.$.helperPhone)
                    }
                }
            ],
            rowButtons: [
                {
                    name: getLang().assignDeliveryMenu,
                    icon: 'list_alt',
                    click: async (ev) => {
                        let h = await ev.helper.getHelper();
                        await ui.helperAssignment(h);
                        await ev._.reload();
                    }
                },
                {
                    name: getLang().confirmed,
                    icon: 'check',
                    click: async (ev) => {
                        ev.confirmed = !ev.confirmed;
                        await ev.save();
                    }
                },
                {
                    name: getLang().volunteerInfo,
                    icon: 'edit',
                    click: async (ev) => {
                        let h = await ev.helper.getHelper();
                        await h.displayEditDialog(ui);

                    }
                },
                {
                    textInMenu: x => x.duplicateToNextEvent ? getLang().unmarkAsFixed : getLang().markAsFixed,
                    icon: 'person',
                    click: async (ev) => {
                        ev.duplicateToNextEvent = !ev.duplicateToNextEvent;
                        await ev.save();
                    }
                },
                {
                    name: getLang().sendWhats,
                    click: h => h.helperPhone.sendWhatsapp(),
                    icon: 'textsms'
                },
                (() => {
                    let b = new SendBulkSms().sendSingleHelperButton(ui);
                    return {
                        ...b,
                        click: async v => {
                            b.click(await v.helper.getHelper());
                        }

                    } as RowButton<volunteersInEvent>

                })()
                ,
                {
                    name: getLang().remove,
                    click: async eh => {
                        eh.canceled = !eh.canceled;
                        await eh.save();

                    }
                }
            ]
        });
        await ui.gridDialog({
            title: event.name,
            stateName: 'helpers-per-event',

            buttons: [{
                text: getLang().addVolunteer,
                click: () => ui.selectHelper({
                    onSelect: async h => {

                        let eh = await remult.repo(volunteersInEvent).findFirst(
                            { helper: h, eventId: event.id },
                            { createIfNotFound: true });
                        eh.canceled = false;
                        await eh.save();
                        gridSettings.reloadData()
                    }
                })

            }],
            settings: gridSettings
        });
    }

}



export interface EventInList {
    id: string
    name: string,
    type: EventType,
    description: string,
    eventDateJson: string,
    startTime: string,
    endTime: string,
    city: string,
    theAddress: string,
    longLat: string,
    thePhone: string,
    thePhoneDisplay: string,
    thePhoneDescription: string,
    requiredVolunteers: number,
    registeredVolunteers: number,
    registeredToEvent: boolean,
    site?: string,
    eventLogo: string,
    location: Location,
    orgName: string


}

export const day = 86400000;

export function eventDisplayDate(e: EventInList, group = false, today: Date = undefined) {

    if (e.eventDateJson) {
        if (e.eventDateJson === VolunteerNeedType.holidays.jsonDate)
            return 'ארגונים המחלקים בחגים';
        if (e.eventDateJson === VolunteerNeedType.allYear.jsonDate)
            return 'ארגונים המחלקים כל השנה';
        let edd = ValueConverters.DateOnly.fromJson(e.eventDateJson);
        if (!today)
            today = new Date()
        today = ValueConverters.DateOnly.fromJson(ValueConverters.DateOnly.toJson(today));
        let todayJson = ValueConverters.DateOnly.toJson(today);
        let t = today.valueOf();
        let d = edd.valueOf();
        if (d > t - day) {
            if (d < t + day)
                return use.language.today + ' (' + moment(d).locale(use.language.languageCodeHe).format('DD/MM') + ')';
            if (d < t + day * 2)
                return use.language.tomorrow + ' (' + moment(d).locale(use.language.languageCodeHe).format('DD/MM') + ')';
            if (group) {
                let endOfWeek = t - today.getDay() * day + day * 7;
                if (d < endOfWeek)
                    return use.language.thisWeek;
                if (d < endOfWeek + day * 7)
                    return use.language.nextWeek;
                if (edd.getFullYear() == today.getFullYear())
                    return edd.toLocaleString('he', { month: 'long' })

                if (group)
                    return edd.toLocaleString('he', { month: 'long', year: '2-digit' })
            }

        }
        if (group)
            return use.language.past;


        return moment(d).locale(use.language.languageCodeHe).format('DD/MM (dddd)')
    }
    if (group)
        return use.language.past;
}


/*

select  (select name from helpers where id=helper) helperName,
  (select phone from helpers where id=helper) helperName,
times,
lastTime
from (
select 
 helper,count(*) times,max(createDate) lastTime
from volunteersInEvent 
where eventId in (select id from events where type='packaging' and eventStatus=9 )
    and canceled=false
group by helper) as x
where helper not in (select id from helpers where doNotSendSms=true)
 and helper not in (select helper from volunteersInEvent where eventId in (select id from events where eventStatus=0))
order by 3 desc

*/