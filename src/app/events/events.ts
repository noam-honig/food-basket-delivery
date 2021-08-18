import { IdEntity, Remult, Entity, FieldsMetadata, Allow, EntityRef, FieldMetadata, Validators, isBackend } from "remult";
import { BusyService, DataControl, DataControlInfo, DataControlSettings, GridSettings, InputField, openDialog, RowButton } from '@remult/angular';
import { use, ValueListFieldType, Field, DateOnlyField, IntegerField } from "../translate";
import { getLang } from '../sites/sites';
import { Roles } from "../auth/roles";
import { Helpers, HelpersBase } from "../helpers/helpers";
import { DateTimeColumn, ChangeDateColumn } from "../model-shared/types";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { HelperAssignmentComponent } from "../helper-assignment/helper-assignment.component";
import { settings } from "cluster";
import { SelectHelperComponent } from "../select-helper/select-helper.component";
import { DialogService } from "../select-popup/dialog";
import { saveToExcel } from '../shared/saveToExcel';
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";

import { DistributionCenters } from "../manage/distribution-centers";
import { AddressHelper, Location } from "../shared/googleApiHelpers";

import { DeliveryStatus } from "../families/DeliveryStatus";
import { InputTypes } from "remult/inputTypes";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import * as moment from "moment";
import { DateOnlyValueConverter } from "remult/valueConverters";



@ValueListFieldType(EventType, {
    caption: 'סוג התנדבות'
})
export class EventType {
    static foodDelivery = new EventType("חלוקת מזון", "");
    static packaging = new EventType("אריזת חבילות");
    static other = new EventType("אחר");
    constructor(public caption: string, public id: string = undefined) {

    }
}


@ValueListFieldType(eventStatus, {
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
@Entity<Event>({
    key: 'events',
    allowApiCrud: Roles.admin,
    allowApiRead: Allow.authenticated,
    saving: async (self) => {
        if (isBackend()) {
            await self.addressHelper.updateApiResultIfChanged();
            if (self.distributionCenter == null)
                self.distributionCenter = await self.remult.defaultDistributionCenter();
        }
    }
},
    (options, remult) =>
        options.apiDataFilter = (self) => {
            if (remult.isAllowed(Roles.admin))
                return undefined;
            return self.eventStatus.isEqualTo(eventStatus.active);
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
        return !!(await this. remult.repo(volunteersInEvent).findFirst(v =>
            v.helper.isEqualTo(helper).and(
                v.eventId.isEqualTo(this.id)).and(
                    v.canceled.isEqualTo(false)
                )))
    }
    @Field<Event>({
        serverExpression: self => self.volunteeredIsRegisteredToEvent(self.remult.currentUser)
    })
    registeredToEvent: boolean;
    async showVolunteers(dialog: DialogService, busy: BusyService) {
        if (this.wasChanged())
            await this.save();
        await openDialog(GridDialogComponent, x => x.args = {
            title: this.name,
            stateName: 'helpers-per-event',

            buttons: [{
                text: getLang(this.remult).addVolunteer,
                click: () => openDialog(SelectHelperComponent, y => y.args = {
                    onSelect: async h => {

                        let eh = await this. remult.repo(volunteersInEvent).findFirst({
                            where: v => v.helper.isEqualTo(h).and(v.eventId.isEqualTo(this.id)),
                            useCache: false,
                            createIfNotFound: true
                        });
                        eh.canceled = false;
                        await eh.save();
                        x.args.settings.reloadData()
                    }
                })

            }],
            settings: new GridSettings(this. remult.repo(volunteersInEvent), {

                rowsInPage: 50,
                where: ve => ve.eventId.isEqualTo(this.id),
                orderBy: ve => ve.registerStatusDate.descending(),
                knowTotalRows: true,
                numOfColumnsInGrid: 10,
                showFilter: true,
                columnSettings: (ev: FieldsMetadata<volunteersInEvent>) => [
                    { width: '100', field: ev.helperName },
                    {
                        caption: getLang(this.remult).volunteerStatus,
                        getValue: v => {
                            if (v.canceled)
                                return "ביטל השתתפות";
                            if (v.assignedDeliveries > 0)
                                if (v.lastAssignTime < v.lastSmsTime)
                                    return getLang(this.remult).smsSent;
                                else
                                    return getLang(this.remult).assigned;
                            else if (v.succesfulDeliveries == 0)
                                return getLang(this.remult).newVolunteer
                            else getLang(this.remult).unAsigned
                        },
                        width: '100'
                    },
                    { width: '100', field: ev.assignedDeliveries },
                    { width: '100', field: ev.succesfulDeliveries },
                    { width: '150', field: ev.helperPhone },
                    ev.helperEmail,
                    { width: '100', field: ev.duplicateToNextEvent },
                    ev.registerStatusDate,
                    ev.fromGeneralList,
                    ev.createDate,
                    ev.createUser,
                    ev.canceled,
                    ev.cancelUser

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
                        name: getLang(this.remult).exportToExcel,
                        click: async () => {
                            saveToExcel(getSettings(this.remult), this. remult.repo(volunteersInEvent), x.args.settings, "מתנדבים שנרשמו ל" + this.name, busy)
                        }
                    }
                ],
                rowButtons: [
                    {
                        name: getLang(this.remult).assignDeliveryMenu,
                        icon: 'list_alt',
                        click: async (ev) => {
                            let h = await ev.helper.getHelper();
                            await openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
                            ev.save();
                        }
                    },
                    {
                        name: getLang(this.remult).volunteerInfo,
                        icon: 'edit',
                        click: async (ev) => {
                            let h = await ev.helper.getHelper();
                            await h.displayEditDialog(dialog, busy)
                        }
                    },
                    {
                        name: getLang(this.remult).sendWhats,
                        click: h => h.helperPhone.sendWhatsapp(this.remult),
                        icon: 'textsms'
                    },
                    {
                        name: getLang(this.remult).remove,
                        click: async eh => {
                            eh.canceled = !eh.canceled;
                            await eh.save();

                        }
                    }
                ]
            })
        });
        await this._.reload();
    }
    @Field<Event>({
        translation: l => l.eventName,
        validate: (s, c) => Validators.required(s, c, s.remult.lang.nameIsTooShort)
    })
    name: string;
    @Field()
    type: EventType = EventType.foodDelivery;
    @Field()
    eventStatus: eventStatus = eventStatus.active;
    @Field({ translation: l => l.eventDescription })
    description: string;
    @DateOnlyField<Event>({
        translation: l => l.eventDate,
        validate: (s, c) => {
            if (!c.value || c.value.getFullYear() < 2018)
                c.error = s.remult.lang.invalidDate;
        }
    })
    eventDate: Date = new Date();
    @Field({ inputType: InputTypes.time, translation: l => l.eventTime })
    @DataControl({ width: '110' })
    startTime: string;
    @Field({ inputType: InputTypes.time, translation: l => l.eventEndTime })
    @DataControl({ width: '110' })
    endTime: string;
    @IntegerField({ translation: l => l.requiredVolunteers })
    requiredVolunteers: number;
    @Field()
    addressApiResult: string;
    @Field({ translation: l => l.address })
    address: string;
    addressHelper = new AddressHelper(this.remult, () => this.$.address, () => this.$.addressApiResult);
    @Field<Event>({
        allowApiUpdate: Roles.admin
    })
    distributionCenter: DistributionCenters;

    @Field({ translation: l => l.phone1 })
    phone1: Phone;
    @Field({ translation: l => l.phone1Description })
    phone1Description: string;
    @Field({
        translation: l => l.attendingVolunteers
    },
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                var vie = SqlFor( remult.repo(volunteersInEvent));
                let self = SqlFor(selfDefs);
                var sql = new SqlBuilder(remult);
                return sql.columnCount(self, {
                    from: vie,
                    where: () => [sql.eq(vie.eventId, self.id), vie.canceled.isEqualTo(false)]
                })
            }
    )
    registeredVolunteers: number;

    get eventLogo() {
        return getSettings(this.remult).logoUrl;
    }
    get location() {
        return this.getAddress()?.location();
    }
    get orgName() {
        return getSettings(this.remult).organisationName;
    }
    get eventDateJson() {
        return DateOnlyValueConverter.toJson(this.eventDate);
    }

    constructor(private remult: Remult) {
        super();
    }
    openEditDialog(dialog: DialogService, busy: BusyService, cancel: () => void = () => { }) {
        openDialog(InputAreaComponent, x => x.args = {
            title: use.language.eventInfo,
            settings: {
                fields: () => Event.displayColumns(this._.repository.metadata.fields, dialog)
                    .map(x => mapFieldMetadataToFieldRef(this._, x))
            },
            ok: () => this.save(),
            cancel: () => {
                this._.undoChanges();
                cancel();
            },
            buttons: [
                {
                    text: use.language.volunteers,
                    click: () => this.showVolunteers(dialog, busy)
                }
            ]
        });
    }
    static rowButtons(settings: ApplicationSettings, dialog: DialogService, busy: BusyService): RowButton<Event>[] {
        return [
            {
                name: settings.lang.eventInfo,
                click: async (e) => {
                    e.openEditDialog(dialog, busy)
                }
            },
            {
                name: settings.lang.volunteers,
                click: async (e) => {
                    e.showVolunteers(dialog, busy);
                }
            }
        ];
    }
    static async duplicateEvent(remult: Remult, busy: BusyService, events: Event[], done: (createdEvents: Event[]) => void) {
        let settings = getSettings(remult);
        let archiveCurrentEvent = new InputField<boolean>({ valueType: Boolean, caption: settings.lang.archiveCurrentEvent });
        archiveCurrentEvent.value = true;
        let date = new InputField<Date>({ caption: settings.lang.eventDate, valueConverter: DateOnlyValueConverter });
        date.value = new Date();
        await openDialog(InputAreaComponent, x => x.args = {
            title: settings.lang.duplicateEvents,
            settings: {
                fields: () => [archiveCurrentEvent, date]
            },
            cancel: () => { },
            ok: async () => {
                await busy.doWhileShowingBusy(async () => {
                    let r: Event[] = [];
                    for (const current of events) {
                        let e =  remult.repo(Event).create({
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
                            distributionCenter: current.distributionCenter
                        });
                        r.push(e);


                        await e.save();
                        for (const c of await  remult.repo(volunteersInEvent).find({
                            where: x => x.duplicateToNextEvent.isEqualTo(true).and(x.eventId.isEqualTo(current.id))
                        })) {
                            let v =  remult.repo(volunteersInEvent).create();
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

    static displayColumns(e: FieldsMetadata<Event>, dialog: DialogService) {
        let r = [
            e.name,
            e.type,
            e.description,
            { width: '150', field: e.eventDate },
            e.startTime,
            e.endTime,
            { width: '100', field: e.requiredVolunteers },
            { width: '100', field: e.registeredVolunteers },
            { width: '150', field: e.eventStatus },
            { field: e.distributionCenter, visible: () => dialog.hasManyCenters },
            e.address,
            e.phone1,
            e.phone1Description
        ];
        return r;
    }
    get thePhoneDescription() {
        if (this.phone1?.thePhone)
            return this.phone1Description;
        if (this.distributionCenter.phone1?.thePhone)
            return this.distributionCenter.phone1Description;
        return getSettings(this.remult).helpText;
    }
    getPhone(): Phone {
        if (this.phone1?.thePhone)
            return this.phone1;
        if (this.distributionCenter.phone1?.thePhone)
            return this.distributionCenter.phone1;
        return getSettings(this.remult).helpPhone;
    }
    get thePhone() {
        return this.getPhone()?.thePhone;
    }
    get thePhoneDisplay() {
        if (this.getPhone()?.thePhone)
            return this.getPhone().displayValue;
    }
    get theAddress() {
        if (this.getAddress().ok())
            return this.getAddress().getAddress();
    }
    getAddress(): AddressHelper {
        if (this.addressHelper.ok())
            return this.addressHelper;
        if (this.distributionCenter?.addressHelper.ok())
            return this.distributionCenter.addressHelper;
        return getSettings(this.remult).addressHelper;
    }
    get city() {
        if (this.getAddress().ok())
            return this.getAddress().getGeocodeInformation().getCity();
    }
    get longLat() {
        if (this.getAddress().ok())
            return this.getAddress().getGeocodeInformation().getlonglat();
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
@Entity<volunteersInEvent>({
    key: 'volunteersInEvent',
    allowApiCrud: Allow.authenticated,
    allowApiDelete: false
},
    (options, remult) => {
        options.apiDataFilter = (self) => {
            if (remult.isAllowed([Roles.admin, Roles.distCenterAdmin]))
                return undefined;
            return self.helper.isEqualTo(remult.currentUser);
        };
        options.saving = (self) => {
            if (self.isNew() && isBackend()) {
                self.createDate = new Date();
                self.createUser = remult.currentUser;
            }
            if (self.canceled && self.$.canceled.valueChanged()) {
                self.cancelUser = remult.currentUser;

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
        translation: l => l.volunteerName
    },
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                let sql = new SqlBuilder(remult);
                let self = SqlFor(selfDefs);
                let h = SqlFor( remult.repo(Helpers));
                return sql.columnInnerSelect(self, {
                    from: h,
                    select: () => [h.name],
                    where: () => [sql.eq(h.id, self.helper)]
                });
            }
    )
    helperName: string;
    @Field({
        translation: l => l.volunteerPhoneNumber
    },
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                let sql = new SqlBuilder(remult);
                let self = SqlFor(selfDefs);
                let h = SqlFor( remult.repo(Helpers));
                return sql.columnInnerSelect(self, {
                    from: h,
                    select: () => [h.phone],
                    where: () => [sql.eq(h.id, self.helper)]
                });
            }
    )
    helperPhone: Phone;
    @Field({
        translation: l => l.deliveriesAssigned
    },
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                let sql = new SqlBuilder(remult);
                let self = SqlFor(selfDefs);
                let d = SqlFor( remult.repo(ActiveFamilyDeliveries));
                return sql.columnCount(self, { from: d, where: () => [sql.eq(self.helper, d.courier)] })
            }
    )
    assignedDeliveries: number;
    @Field({
        translation: l => l.delveriesSuccessfulEver
    },
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                let sql = new SqlBuilder(remult);
                let self = SqlFor(selfDefs);
                let d = SqlFor( remult.repo(FamilyDeliveries));
                return sql.columnCountWithAs(self, { from: d, where: () => [sql.eq(self.helper, d.courier), DeliveryStatus.isSuccess(d.deliverStatus)] }, 'succesfulDeliveries')
            }
    )
    succesfulDeliveries: number;
    @Field({
        translation: l => l.email
    },
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                let sql = new SqlBuilder(remult);
                let self = SqlFor(selfDefs);
                let h = SqlFor( remult.repo(Helpers));
                return sql.columnInnerSelect(self, {
                    from: h,
                    select: () => [h.email],
                    where: () => [sql.eq(h.id, self.helper)]
                });
            }
    )
    helperEmail: string;
    @Field({},
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                let sql = new SqlBuilder(remult);
                let self = SqlFor(selfDefs);
                let h = SqlFor( remult.repo(Helpers));
                return sql.columnInnerSelect(self, {
                    from: h,
                    select: () => [h.smsDate],
                    where: () => [sql.eq(h.id, self.helper)]
                });
            }
    )
    lastSmsTime: Date;
    @Field({},
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                let sql = new SqlBuilder(remult);
                let self = SqlFor(selfDefs);
                let d = SqlFor( remult.repo(FamilyDeliveries));
                return sql.columnMaxWithAs(self, d.courierAssingTime, { from: d, where: () => [sql.eq(self.helper, d.courier)] }, 'lastAssignTime')
            }
    )
    lastAssignTime: Date;
    @Field({ translation: l => l.duplicateForNextEvent })
    duplicateToNextEvent: boolean;
    @ChangeDateColumn({ translation: l => l.createDate })
    createDate: Date;
    @Field({ translation: l => l.createUser, allowApiUpdate: false })
    createUser: Helpers;

    @ChangeDateColumn()
    registerStatusDate: Date;
    @Field({ translation: l => l.cancelUser, allowApiUpdate: false })
    cancelUser: Helpers;



    @Field({ allowApiUpdate: Roles.distCenterAdmin })
    canceled: boolean;
    @Field({ allowApiUpdate: false })
    fromGeneralList: boolean;

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
const month = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר"

]
export const day = 86400000;
export function eventDisplayDate(e: EventInList, group = false, today: Date = undefined) {

    if (e.eventDateJson) {
        let edd = DateOnlyValueConverter.fromJson(e.eventDateJson);
        if (!today)
            today = new Date()
        today = DateOnlyValueConverter.fromJson(DateOnlyValueConverter.toJson(today));
        let todayJson = DateOnlyValueConverter.toJson(today);
        let t = today.valueOf();
        let d = edd.valueOf();
        if (d > t - day) {
            if (d < t + day)
                return use.language.today;
            if (d < t + day * 2)
                return use.language.tomorrow;
            if (group) {
                let endOfWeek = t - today.getDay() * day + day * 7;
                if (d < endOfWeek)
                    return use.language.thisWeek;
                if (d < endOfWeek + day * 7)
                    return use.language.nextWeek;
                if (d < new Date(2021, 8, 8).valueOf())
                    return "ראש השנה";
                if (d < new Date(2021, 7, 22).valueOf())
                    return "אוגוסט";
                if (edd.getFullYear() == today.getFullYear())
                    return month[edd.getMonth()]

                if (group)
                    return month[edd.getMonth()] + " " + today.getFullYear().toString();
            }

        }
        if (group)
            return use.language.past;


        return moment(d).locale(use.language.languageCodeHe).format('DD/MM (dddd)')
    }
    if (group)
        return use.language.past;
}
