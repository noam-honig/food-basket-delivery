import { IdEntity, Context, Entity, FieldsMetadata, Allow, EntityRef, FieldMetadata, Validators } from "remult";
import { BusyService, DataControl, DataControlInfo, DataControlSettings, GridSettings, openDialog, RowButton } from '@remult/angular';
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
        if (self.context.backend) {
            await self.addressHelper.updateApiResultIfChanged();
            if (self.distributionCenter == null)
                self.distributionCenter = await self.context.defaultDistributionCenter();
        }
    },

    apiDataFilter: (self, context) => {
        if (context.isAllowed(Roles.admin))
            return undefined;
        return self.eventStatus.isEqualTo(eventStatus.active);
    }
})
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
        return !!(await this.context.for(volunteersInEvent).findFirst(v =>
            v.helper.isEqualTo(helper).and(
                v.eventId.isEqualTo(this.id)).and(
                    v.canceled.isEqualTo(false)
                )))
    }
    @Field<Event>({
        serverExpression: self => self.volunteeredIsRegisteredToEvent(self.context.currentUser)
    })
    registeredToEvent: boolean;
    async showVolunteers(dialog: DialogService, busy: BusyService) {
        if (this.wasChanged())
            await this.save();
        await openDialog(GridDialogComponent, x => x.args = {
            title: this.name,
            stateName: 'helpers-per-event',

            buttons: [{
                text: getLang(this.context).addVolunteer,
                click: () => openDialog(SelectHelperComponent, y => y.args = {
                    onSelect: async h => {

                        let eh = await this.context.for(volunteersInEvent).findFirst({
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
            settings: new GridSettings(this.context.for(volunteersInEvent), {

                rowsInPage: 50,
                where: ve => ve.eventId.isEqualTo(this.id),
                orderBy: ve => ve.registerStatusDate.descending(),
                knowTotalRows: true,
                numOfColumnsInGrid: 10,
                columnSettings: (ev: FieldsMetadata<volunteersInEvent>) => [
                    { width: '100', field: ev.helperName },
                    {
                        caption: getLang(this.context).volunteerStatus,
                        getValue: v => {
                            if (v.canceled)
                                return "ביטל השתתפות";
                            if (v.assignedDeliveries > 0)
                                if (v.lastAssignTime < v.lastSmsTime)
                                    return getLang(this.context).smsSent;
                                else
                                    return getLang(this.context).assigned;
                            else if (v.succesfulDeliveries == 0)
                                return getLang(this.context).newVolunteer
                            else getLang(this.context).unAsigned
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
                        name: getLang(this.context).exportToExcel,
                        click: async () => {
                            saveToExcel(getSettings(this.context), this.context.for(volunteersInEvent), x.args.settings, "מתנדבים שנרשמו ל" + this.name, busy)
                        }
                    }
                ],
                rowButtons: [
                    {
                        name: getLang(this.context).assignDeliveryMenu,
                        icon: 'list_alt',
                        click: async (ev) => {
                            let h = await ev.helper.getHelper();
                            await openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
                            ev.save();
                        }
                    },
                    {
                        name: getLang(this.context).volunteerInfo,
                        icon: 'edit',
                        click: async (ev) => {
                            let h = await ev.helper.getHelper();
                            await h.displayEditDialog(dialog, busy)
                        }
                    },
                    {
                        name: getLang(this.context).sendWhats,
                        click: h => h.helperPhone.sendWhatsapp(this.context),
                        icon: 'textsms'
                    },
                    {
                        name: getLang(this.context).remove,
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
        validate: (s, c) => Validators.required(s, c, s.context.lang.nameIsTooShort)
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
                c.error = s.context.lang.invalidDate;
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
    addressHelper = new AddressHelper(this.context, () => this.$.address, () => this.$.addressApiResult);
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
        sqlExpression: async (selfDefs, context) => {
            var vie = SqlFor(context.for(volunteersInEvent));
            let self = SqlFor(selfDefs);
            var sql = new SqlBuilder(context);
            return sql.columnCount(self, {
                from: vie,
                where: () => [sql.eq(vie.eventId, self.id), vie.canceled.isEqualTo(false)]
            })
        }
    })
    registeredVolunteers: number;

    get eventLogo() {
        return getSettings(this.context).logoUrl;
    }
    get location() {
        return this.getAddress()?.location();
    }
    get orgName() {
        return getSettings(this.context).organisationName;
    }
    get eventDateJson() {
        return DateOnlyValueConverter.toJson(this.eventDate);
    }

    constructor(private context: Context) {
        super();
    }
    openEditDialog(dialog: DialogService, busy: BusyService, cancel: () => void = () => { }) {
        openDialog(InputAreaComponent, x => x.args = {
            title: use.language.eventInfo,
            settings: {
                fields: () => Event.displayColumns(this._.repository.metadata.fields)
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

    static displayColumns(e: FieldsMetadata<Event>) {
        return [
            e.name,
            e.type,
            e.description,
            { width: '150', field: e.eventDate },
            e.startTime,
            e.endTime,
            { width: '100', field: e.requiredVolunteers },
            { width: '100', field: e.registeredVolunteers },
            { width: '150', field: e.eventStatus },
            e.distributionCenter,
            e.address,
            e.phone1,
            e.phone1Description
        ];
    }
    get thePhoneDescription() {
        if (this.phone1?.thePhone)
            return this.phone1Description;
        if (this.distributionCenter.phone1?.thePhone)
            return this.distributionCenter.phone1Description;
        return getSettings(this.context).helpText;
    }
    getPhone(): Phone {
        if (this.phone1?.thePhone)
            return this.phone1;
        if (this.distributionCenter.phone1?.thePhone)
            return this.distributionCenter.phone1;
        return getSettings(this.context).helpPhone;
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
        return getSettings(this.context).addressHelper;
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
    allowApiDelete: false,
    apiDataFilter: (self, context) => {
        if (context.isAllowed([Roles.admin, Roles.distCenterAdmin]))
            return undefined;
        return self.helper.isEqualTo(context.currentUser);
    }
    ,
    saving: (self) => {
        if (self.isNew() && self.context.backend) {
            self.createDate = new Date();
            self.createUser = self.context.currentUser;
        }
        if (self.canceled && self.$.canceled.wasChanged()) {
            self.cancelUser = self.context.currentUser;

        }
        if (self.isNew() || self.$.canceled.wasChanged())
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
        sqlExpression: async (selfDefs, context) => {
            let sql = new SqlBuilder(context);
            let self = SqlFor(selfDefs);
            let h = SqlFor(context.for(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.name],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    helperName: string;
    @Field({
        translation: l => l.volunteerPhoneNumber,
        sqlExpression: async (selfDefs, context) => {
            let sql = new SqlBuilder(context);
            let self = SqlFor(selfDefs);
            let h = SqlFor(context.for(Helpers));
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
        sqlExpression: async (selfDefs, context) => {
            let sql = new SqlBuilder(context);
            let self = SqlFor(selfDefs);
            let d = SqlFor(context.for(ActiveFamilyDeliveries));
            return sql.columnCount(self, { from: d, where: () => [sql.eq(self.helper, d.courier)] })
        }
    })
    assignedDeliveries: number;
    @Field({
        translation: l => l.delveriesSuccesfull,
        sqlExpression: async (selfDefs, context) => {
            let sql = new SqlBuilder(context);
            let self = SqlFor(selfDefs);
            let d = SqlFor(context.for(FamilyDeliveries));
            return sql.columnCountWithAs(self, { from: d, where: () => [sql.eq(self.helper, d.courier), DeliveryStatus.isSuccess(d.deliverStatus)] }, 'succesfulDeliveries')
        }
    })
    succesfulDeliveries: number;
    @Field({
        translation: l => l.email,
        sqlExpression: async (selfDefs, context) => {
            let sql = new SqlBuilder(context);
            let self = SqlFor(selfDefs);
            let h = SqlFor(context.for(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.email],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    helperEmail: string;
    @Field({
        sqlExpression: async (selfDefs, context) => {
            let sql = new SqlBuilder(context);
            let self = SqlFor(selfDefs);
            let h = SqlFor(context.for(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.smsDate],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    lastSmsTime: Date;
    @Field({

        sqlExpression: async (selfDefs, context) => {
            let sql = new SqlBuilder(context);
            let self = SqlFor(selfDefs);
            let d = SqlFor(context.for(FamilyDeliveries));
            return sql.columnMaxWithAs(self, d.courierAssingTime, { from: d, where: () => [sql.eq(self.helper, d.courier)] }, 'lastAssignTime')
        }
    })
    lastAssignTime: Date;
    @Field({ translation: l => l.duplicateForNextEvent })
    duplicateToNextEvent: boolean;
    @ChangeDateColumn({ translation: l => l.createDate })
    createDate: Date;
    @Field({ translation: l => l.createUser, allowApiUpdate: false })
    createUser: Helpers;

    @ChangeDateColumn()
    registerStatusDate: Date;
    @Field({ translation: l => l.createUser, allowApiUpdate: false })
    cancelUser: Helpers;



    @Field({ allowApiUpdate: Roles.distCenterAdmin })
    canceled: boolean;
    @Field({ allowApiUpdate: false })
    fromGeneralList: boolean;







    constructor(private context: Context) {
        super();
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
                if (d < new Date(2021, 7, 22).valueOf())
                    return "אוגוסט";
                if (d < new Date(2021, 8, 8).valueOf())
                    return "ראש השנה";
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
