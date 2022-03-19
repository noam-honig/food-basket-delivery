import { ChangeDateColumn, relativeDateName } from "../model-shared/types";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";

import { Remult, IdEntity, Filter, FieldRef, Allow, BackendMethod, isBackend, EntityFilter } from 'remult';
import { BasketType } from "./BasketType";
import { Families, iniFamilyDeliveriesInFamiliesCode } from "./families";
import { DeliveryStatus } from "./DeliveryStatus";
import { Helpers, HelpersBase } from "../helpers/helpers";

import { Roles } from "../auth/roles";
import { DistributionCenters } from "../manage/distribution-centers";
import { YesNo } from "./YesNo";

import { Location, toLongLat, isGpsAddress } from '../shared/googleApiHelpers';

import { use, FieldType, Field, ValueListFieldType, Entity, QuantityColumn, IntegerField } from "../translate";
import { includePhoneInApi, getSettings, ApplicationSettings, CustomColumn, questionForVolunteers } from "../manage/ApplicationSettings";
import { getLang } from "../sites/sites";
import { DataAreaFieldsSetting, DataControl, IDataAreaSettings } from "@remult/angular/interfaces";


import { Groups, GroupsValue } from "../manage/groups";

import { FamilySources } from "./FamilySources";
import { DeliveryImage, FamilyImage } from "./DeiveryImages";
import { ImageInfo } from "../images/images.component";
import { IdFieldRef } from "remult/src/remult3";
import { isDesktop } from "../shared/utils";
import { UITools } from "../helpers/init-context";


@ValueListFieldType({
    translation: l => l.messageStatus
})
export class MessageStatus {
    static noVolunteer = new MessageStatus(0, use.language.noAssignedVolunteer);
    static notSent = new MessageStatus(1, use.language.smsNotSent);
    static notOpened = new MessageStatus(2, use.language.smsNotOpened);
    static opened = new MessageStatus(3, use.language.smsOpened);
    constructor(public id: number, public caption: string) {

    }
}
@Entity<FamilyDeliveries>('FamilyDeliveries', {
    dbName: 'FamilyDeliveries',
    translation: l => l.deliveries,
    allowApiRead: Allow.authenticated,
    allowApiInsert: false,
    allowApiUpdate: Allow.authenticated,
    allowApiDelete: Roles.admin,
    apiPrefilter: FamilyDeliveries.isAllowedForUser(),
    saving: async (self) => {

        if (self.isNew()) {
            self.createDate = new Date();
            self.createUser = (await self.remult.getCurrentUser());
            self.deliveryStatusDate = new Date();
            self.deliveryStatusUser = (await self.remult.getCurrentUser());
        }
        if (self.quantity < 1)
            self.quantity = 1;
        if (self.distributionCenter == null)
            self.distributionCenter = await self.remult.repo(DistributionCenters).findFirst({ archive: false });
        if (self.$.courier.valueChanged() && !self.disableRouteReCalc && !self.isNew())
            self.routeOrder = 0;

        if (isBackend()) {
            if (!self.disableChangeLogging) {

                if (!self.isNew() || self.courier)
                    logChanged(self.remult, self.$.courier, self.$.courierAssingTime, self.$.courierAssignUser, async () => {
                        if (!self._disableMessageToUsers) {
                            self.distributionCenter.SendMessageToBrowser(
                                Families.GetUpdateMessage(self, 2, self.courier?.name, self.remult), self.remult);
                        }
                    }
                    );
                if (!self.isNew() && self.$.courierComments.valueChanged() && self.courierComments.length > 0)
                    self.courierCommentsDate = new Date();

                logChanged(self.remult, self.$.deliverStatus, self.$.deliveryStatusDate, self.$.deliveryStatusUser, async () => {
                    if (!self._disableMessageToUsers) {
                        self.distributionCenter.SendMessageToBrowser(Families.GetUpdateMessage(self, 1, self.courier ? await self.courier.name : '', self.remult), self.remult);
                    }
                });
                logChanged(self.remult, self.$.needsWork, self.$.needsWorkDate, self.$.needsWorkUser, async () => { });
                logChanged(self.remult, self.$.archive, self.$.archiveDate, self.$.archiveUser, async () => { });
            }
            if (!self.deliverStatus.IsAResultStatus()
                && self.$.deliverStatus.originalValue && self.$.deliverStatus.originalValue.IsAResultStatus()) {
                let f = await self.remult.repo(Families).findId(self.family);
                if (f)
                    f.updateDelivery(self);

            }
            if (self.isNew() && !self._disableMessageToUsers) {
                self.distributionCenter.SendMessageToBrowser(getLang(self.remult).newDelivery, self.remult)

            }
        }
    }
})
export class FamilyDeliveries extends IdEntity {
    getCss(): string {
        return this.deliverStatus.getCss(this.courier);
    }
    disableRouteReCalc = false;
    @BackendMethod<FamilyDeliveries>({
        allowed: Allow.authenticated
    })
    static async getFamilyImages(family: string, delivery: string, remult?: Remult): Promise<ImageInfo[]> {
        if (!Roles.distCenterAdmin) {
            let d = await remult.repo(FamilyDeliveries).findId(delivery);
            if (d.courier?.id != (await remult.getCurrentUser())?.id)
                return [];
        }
        let r = (await remult.repo(FamilyImage).find({ where: { familyId: family } })).map(({ image }) => ({ image } as ImageInfo));
        return r;
    }

    @BackendMethod<FamilyDeliveries>({
        allowed: Allow.authenticated
    })
    static async hasFamilyImages(family: string, delivery: string, remult?: Remult): Promise<boolean> {
        if (!Roles.distCenterAdmin) {
            let d = await remult.repo(FamilyDeliveries).findId(delivery);
            if (d.courier?.id != (await remult.getCurrentUser())?.id)
                return false;
        }
        let r = (await remult.repo(FamilyImage).count({ familyId: family })) > 0;
        return r;
    }
    async loadVolunteerImages(): Promise<import("../images/images.component").ImageInfo[]> {
        return (await this.remult.repo(DeliveryImage).find({ where: { deliveryId: this.id } })).map(i => ({
            image: i.image,
            entity: i
        } as ImageInfo));
    }
    addStatusExcelColumn(addColumn: (caption: string, v: string, t: import("xlsx/types").ExcelDataType) => void) {
        addColumn(getLang(this.remult).statusSummary, this.statusSammary(), "s");
    }
    statusSammary() {
        var status = this.deliverStatus.caption;
        switch (this.deliverStatus) {
            case DeliveryStatus.ReadyForDelivery:
                if (this.courier)
                    status = getLang(this.remult).onTheWay;
                else
                    status = getLang(this.remult).unAsigned;
                break;
            case DeliveryStatus.SelfPickup:
            case DeliveryStatus.Frozen:
                break;
            case DeliveryStatus.Success:
            case DeliveryStatus.SuccessPickedUp:
            case DeliveryStatus.SuccessLeftThere:
                status = getLang(this.remult).delivered;
                break;
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedDoNotWant:

            case DeliveryStatus.FailedNotReady:
            case DeliveryStatus.FailedTooFar:

            case DeliveryStatus.FailedOther:
                status = getLang(this.remult).problem;
                break;
        }
        return status;
    }

    changeRequireStatsRefresh() {
        return [this.$.deliverStatus, this.$.courier, this.$.basketType, this.$.quantity].filter(x => x.valueChanged()).length > 0;
    }
    copyFrom(originalDelivery: FamilyDeliveries) {
        this.distributionCenter = originalDelivery.distributionCenter;
        this.special = originalDelivery.special;
        this.basketType = originalDelivery.basketType;
        this.quantity = originalDelivery.quantity;
        this.deliveryComments = originalDelivery.deliveryComments;
    }
    async duplicateCount() {
        return await this.remult.repo(ActiveFamilyDeliveries).count(
            {
                family: this.family,
                deliverStatus: DeliveryStatus.isNotAResultStatus(),
                basketType: this.basketType,
                distributionCenter: this.distributionCenter
            }
        );
    }

    @Field({
        translation: l => l.familyIdInHagaiApp,
        allowApiUpdate: false
    })
    family: string;
    @Field({
        allowApiUpdate: false,
        translation: l => l.familyName
    },
        (options, remult) =>
            options.sqlExpression = async (entity) => {
                let r = remult.isAllowed(Roles.distCenterAdmin) || !(await remult.getSettings())?.showOnlyLastNamePartToVolunteer ? undefined : "regexp_replace(name, '^.* ', '')";
                return r;
            }
    )
    name: string;

    @Field({
        //translation: l => l.basketType,
        allowApiUpdate: Roles.admin
    })
    basketType: BasketType;
    @QuantityColumn({
        allowApiUpdate: Roles.admin
    })
    @DataControl({ width: '100' })
    quantity: number;
    isLargeQuantity() {
        return getSettings(this.remult).isSytemForMlt && (this.quantity > 10);
    }

    @Field({
        allowApiUpdate: Roles.admin
    })
    distributionCenter: DistributionCenters;

    isDistCenterInactive() {
        return this.distributionCenter && this.distributionCenter.isFrozen
    }
    @Field()
    deliverStatus: DeliveryStatus = DeliveryStatus.ReadyForDelivery;
    @Field({
        translation: l => l.volunteer,
        allowApiUpdate: Roles.distCenterAdmin,
        clickWithTools: async (self, _, ui) => ui.selectHelper({
            onSelect: helper => self.courier = helper,
            location: self.getDrivingLocation(),
            familyId: self.family
        })
    })

    courier: HelpersBase;
    @Field({ translation: l => l.commentsWritteByVolunteer })
    courierComments: string;
    @ChangeDateColumn()
    courierCommentsDate: Date;
    @Field({ includeInApi: Roles.admin })
    internalDeliveryComment: string;
    @IntegerField({
        allowApiUpdate: true
    })
    routeOrder: number;
    @Field({ includeInApi: Roles.admin, translation: l => l.specialAsignment })
    special: YesNo;
    @ChangeDateColumn()
    deliveryStatusDate: Date;
    relativeDeliveryStatusDate() {
        return relativeDateName(this.remult, { d: this.deliveryStatusDate });
    }
    @Field({ allowApiUpdate: false, translation: l => l.courierAsignUser, includeInApi: Roles.distCenterAdmin })
    courierAssignUser: HelpersBase;
    @ChangeDateColumn({ translation: l => l.courierAsignDate })
    courierAssingTime: Date;
    @Field({ translation: l => l.statusChangeUser, allowApiUpdate: false, includeInApi: Roles.admin })
    deliveryStatusUser: HelpersBase;
    @ChangeDateColumn({ includeInApi: Roles.admin, translation: l => l.deliveryCreateDate })
    createDate: Date;
    @Field({ includeInApi: Roles.admin, translation: l => l.deliveryCreateUser, allowApiUpdate: false })
    createUser: HelpersBase;
    @Field({
        translation: l => l.requireFollowUp
    })
    needsWork: boolean;

    @Field({ translation: l => l.requireFollowUpUpdateUser, includeInApi: Roles.distCenterAdmin })
    needsWorkUser: HelpersBase;
    @ChangeDateColumn({ translation: l => l.requireFollowUpUpdateDate })
    needsWorkDate: Date;
    @Field({
        translation: l => l.commentForVolunteer,
        allowApiUpdate: Roles.admin
    })
    deliveryComments: string;
    @Field({
        translation: l => l.commentForReception,
        allowApiUpdate: Roles.lab
    })
    receptionComments: string;
    @Field({
        includeInApi: Roles.admin,
        allowApiUpdate: false,
        translation: l => l.familySource
    })
    familySource: FamilySources;
    @Field({
        includeInApi: Roles.distCenterAdmin,
        allowApiUpdate: false
    })
    groups: GroupsValue;


    @Field({
        allowApiUpdate: false
    })
    address: string;
    @Field({
        allowApiUpdate: false
    })
    floor: string;
    @Field({
        allowApiUpdate: false
    })
    appartment: string;
    @Field({
        allowApiUpdate: false
    })
    entrance: string;
    @Field({
        allowApiUpdate: false
    })
    buildingCode: string;
    @Field({
        translation: l => l.cityAutomaticallyUpdatedByGoogle
        , allowApiUpdate: false
    })
    city: string;
    @Field({ translation: l => l.region, allowApiUpdate: false })
    area: string;
    @Field({
        allowApiUpdate: false
    })
    addressComment: string;
    @Field({
        allowApiUpdate: false
    })
    //שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
    addressLongitude: number;
    @Field({
        allowApiUpdate: false
    })
    addressLatitude: number;
    @Field({
        allowApiUpdate: false
    })
    //זו התוצאה שחזרה מהGEOCODING כך שהיא מכוונת לכביש הקרוב
    drivingLongitude: number;
    @Field({
        allowApiUpdate: false
    })
    drivingLatitude: number;
    @Field({ allowApiUpdate: false })
    addressByGoogle: string;
    @Field({
        allowApiUpdate: false
    })
    addressOk: boolean;
    @Field({ translation: l => l.defaultVolunteer, allowApiUpdate: false, includeInApi: Roles.distCenterAdmin })
    fixedCourier: HelpersBase;
    @IntegerField({ allowApiUpdate: false })
    familyMembers: number;
    @Field({
        dbName: 'phone',
        includeInApi: remult => includePhoneInApi(remult),
        allowApiUpdate: false
    })
    phone1: Phone;
    @Field({
        includeInApi: remult => includePhoneInApi(remult),
        allowApiUpdate: false
    })
    phone1Description: string;
    @Field({
        includeInApi: remult => includePhoneInApi(remult),
        allowApiUpdate: false
    })
    phone2: Phone;
    @Field({
        includeInApi: remult => includePhoneInApi(remult),
        allowApiUpdate: false
    })
    phone2Description: string;
    @Field({
        includeInApi: remult => includePhoneInApi(remult),
        allowApiUpdate: false
    })
    phone3: Phone;
    @Field({
        includeInApi: remult => includePhoneInApi(remult),
        allowApiUpdate: false
    })
    phone3Description: string;
    @Field({
        includeInApi: remult => includePhoneInApi(remult),
        allowApiUpdate: false
    })
    phone4: Phone;
    @Field({
        includeInApi: remult => includePhoneInApi(remult),
        allowApiUpdate: false
    })
    phone4Description: string;

    @Field({}, (options, remult) =>
        options.sqlExpression = async (self) => {
            var sql = new SqlBuilder(remult);

            var fd = SqlFor(remult.repo(FamilyDeliveries));
            let f = SqlFor(self);
            sql.addEntity(f, "FamilyDeliveries");
            sql.addEntity(fd, 'fd');
            return sql.columnWithAlias(sql.case([{
                when: [sql.ne(f.courier, "''")],
                then: sql.build('exists (select 1 from ', fd, ' as ', 'fd',
                    ' where ', sql.and(sql.not(sql.eq(fd.id, f.id)), sql.eq(fd.family, f.family), sql.eq(fd.courier, f.courier), fd.where({ deliverStatus: DeliveryStatus.isAResultStatus() })), ")")
            }], false), 'courierBeenHereBefore');
        }
    )
    courierBeenHereBefore: boolean;
    @Field({ allowApiUpdate: c => c.authenticated() && (getSettings(c).isSytemForMlt || c.isAllowed(Roles.admin)) })
    archive: boolean;
    @ChangeDateColumn({ includeInApi: Roles.admin, translation: l => l.archiveDate })
    archiveDate: Date;
    @Field({ includeInApi: Roles.admin, translation: l => l.archiveUser })
    archiveUser: HelpersBase;
    @Field({}, (options, remult) => options.
        sqlExpression = async (selfDefs) => {
            var sql = new SqlBuilder(remult);
            let self = SqlFor(selfDefs);
            return sql.case([{ when: [sql.or(sql.gtAny(self.deliveryStatusDate, 'current_date -1'), self.where({ deliverStatus: DeliveryStatus.ReadyForDelivery }))], then: true }], false);

        }
    )
    visibleToCourier: boolean;
    @Field({}, (options, remult) => options.
        sqlExpression = async (self) => {
            var sql = new SqlBuilder(remult);

            var helper = SqlFor(remult.repo(Helpers));
            let f = SqlFor(self);
            sql.addEntity(f, "FamilyDeliveries");
            sql.addEntity(helper, 'h');
            return sql.case([{
                when: [sql.ne(f.courier, "''")],
                then: sql.build("COALESCE ((select ",
                    sql.case([{
                        when: [sql.gt(helper.lastSignInDate, f.courierAssingTime)],
                        then: MessageStatus.opened.id
                    }, {
                        when: [sql.gt(helper.smsDate, f.courierAssingTime)],
                        then: MessageStatus.notOpened.id
                    }
                    ], MessageStatus.notSent.id)
                    , " from ", await helper.metadata.getDbName(), " as h where ", sql.eq(helper.id, f.courier), "), " + MessageStatus.noVolunteer.id + ")")
            }], MessageStatus.noVolunteer.id);
        }
    )
    messageStatus: MessageStatus;
    @CustomColumn(() => questionForVolunteers[1])
    a1: string;
    @CustomColumn(() => questionForVolunteers[2])
    a2: string;
    @CustomColumn(() => questionForVolunteers[3])
    a3: string;
    @CustomColumn(() => questionForVolunteers[4])
    a4: string;

    @Field({
        includeInApi: Roles.admin
    },
        (options, remult) => options.sqlExpression = async (selfDefs) => {
            let self = SqlFor(selfDefs);
            let images = SqlFor(remult.repo(DeliveryImage));
            let sql = new SqlBuilder(remult);
            return sql.columnCount(self, {
                from: images,
                where: () => [sql.eq(images.deliveryId, self.id)]
            });

        }
    )
    numOfPhotos: number;
    static customFilter = Filter.createCustom<FamilyDeliveries, {
        city: string,
        group: string,
        area: string,
        basketId: string
    }>(async (remult, { city, group, area, basketId }) => {
        let basket = await remult.repo(BasketType).findId(basketId);
        return {
            deliverStatus: DeliveryStatus.ReadyForDelivery,
            courier: null,
            distributionCenter: remult.filterCenterAllowedForUser(),
            groups: group ? { $contains: group } : undefined,
            city: city ? city : undefined,
            area: area !== undefined && area != remult.lang.allRegions ? area : undefined,
            basketType: basket != null ? basket : undefined
        }
    });
    static isAllowedForUser = Filter.createCustom<FamilyDeliveries>(async (remult) => {

        if (!remult.authenticated())
            return { id: [] };
        let result: EntityFilter<FamilyDeliveries>[] = [];
        let user = (await remult.getCurrentUser());
        if (!remult.isAllowed([Roles.admin, Roles.lab])) {
            result.push(FamilyDeliveries.active);
            if (remult.isAllowed(Roles.distCenterAdmin))
                result.push({ distributionCenter: remult.filterCenterAllowedForUser() });
            else {
                if (user.theHelperIAmEscorting)
                    result.push({ courier: user.theHelperIAmEscorting, visibleToCourier: true });
                else
                    result.push({ courier: user, visibleToCourier: true });
            }
        }
        return { $and: result };
    });
    static readyFilter(city?: string, group?: string, area?: string, basket?: BasketType) {
        return this.customFilter({ city, group, area, basketId: basket?.id })
    }
    static onTheWayFilter = Filter.createCustom<FamilyDeliveries>(() => ({
        deliverStatus: DeliveryStatus.ReadyForDelivery,
        courier: { "!=": null }
    }));



    static active: EntityFilter<FamilyDeliveries> = {
        archive: false
    }
    static notActive: EntityFilter<FamilyDeliveries> = {
        archive: true
    }

    disableChangeLogging = false;
    _disableMessageToUsers = false;
    constructor(protected remult: Remult) {
        super();
    }
    static async loadFamilyInfoForExcepExport(remult: Remult, deliveries: ActiveFamilyDeliveries[]) {
        let families = await remult.repo(Families).find({ limit: deliveries.length, where: { id: deliveries.map(d => d.family) } });
        for (const d of deliveries) {
            d.familyForExcelExport = families.find(f => f.id == d.family);
        }
    }
    private familyForExcelExport: Families;
    async addFamilyInfoToExcelFile(addColumn) {
        var f = this.familyForExcelExport;
        let settings = await ApplicationSettings.getAsync(this.remult);
        if (f) {
            let x = f.addressHelper.getGeocodeInformation;
            let street = f.address;
            let house = '';
            let lastName = '';
            let firstName = '';
            if (f.name != undefined)
                lastName = f.name.trim();
            let i = lastName.lastIndexOf(' ');
            if (i >= 0) {
                firstName = lastName.substring(i, lastName.length).trim();
                lastName = lastName.substring(0, i).trim();
            }
            {
                try {
                    for (const addressComponent of x.info.results[0].address_components) {
                        switch (addressComponent.types[0]) {
                            case "route":
                                street = addressComponent.short_name;
                                break;
                            case "street_number":
                                house = addressComponent.short_name;
                                break;
                        }
                    }
                }
                catch { }
            }
            addColumn(use.language.email, f.$.email.displayValue, 's');
            for (const x of [[settings.familyCustom1Caption, f.custom1],
            [settings.familyCustom2Caption, f.custom2],
            [settings.familyCustom3Caption, f.custom3],
            [settings.familyCustom4Caption, f.custom4]
            ]) {
                if (x[0]) {
                    addColumn(x[0], x[1], 's');
                }
            }

            addColumn(f.$.socialWorker.metadata.caption, f.socialWorker, 's');
            addColumn("X" + use.language.lastName, lastName, 's');
            addColumn("X" + use.language.firstName, firstName, 's');
            addColumn("X" + use.language.streetName, street, 's');
            addColumn("X" + use.language.houseNumber, house, 's');
            addColumn("X" + f.$.tz.metadata.caption, f.tz, 's');
            addColumn("X" + f.$.tz2.metadata.caption, f.tz2, 's');
            addColumn("X" + f.$.iDinExcel.metadata.caption, f.iDinExcel, 's');

        }
    }


    getShortDeliveryDescription() {
        return this.staticGetShortDescription(this.deliverStatus, this.deliveryStatusDate, this.courier, this.courierComments);
    }
    staticGetShortDescription(deliverStatus: DeliveryStatus, deliveryStatusDate: Date, courier: HelpersBase, courierComments: string) {
        let r = deliverStatus.caption + " ";
        if (deliverStatus.IsAResultStatus() && deliveryStatusDate) {
            if (deliveryStatusDate.valueOf() < new Date().valueOf() - 7 * 86400 * 1000)
                r += getLang(this.remult).on + " " + deliveryStatusDate.toLocaleDateString("he-il");
            else
                r += relativeDateName(this.remult, { d: deliveryStatusDate });
            if (courierComments) {
                r += ": " + courierComments;
            }
            if (courier && deliverStatus != DeliveryStatus.SelfPickup && deliverStatus != DeliveryStatus.SuccessPickedUp)
                r += ' ' + getLang(this.remult).by + ' ' + courier.name;
        }
        return r;
    }
    static readyAndSelfPickup(): EntityFilter<FamilyDeliveries> {
        return {
            deliverStatus: [DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup],
            courier: null
        }
    }



    getDeliveryDescription() {
        switch (this.deliverStatus) {
            case DeliveryStatus.ReadyForDelivery:
                if (this.courier) {
                    let c = this.courier;

                    let r = ((this.messageStatus == MessageStatus.opened ? use.language.onTheWay : use.language.assigned) + ': ' + c.name + (c.eventComment ? ' (' + c.eventComment + ')' : '') + ', ' + use.language.assigned + ' ' + relativeDateName(this.remult, { d: this.courierAssingTime })) + " ";
                    switch (this.messageStatus) {
                        case MessageStatus.notSent:
                            r += use.language.smsNotSent;
                            break;
                        case MessageStatus.notOpened:
                            r += use.language.smsNotOpened;
                            break;

                    }
                    return r;
                }
                break;
            case DeliveryStatus.Success:
            case DeliveryStatus.SuccessLeftThere:
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedDoNotWant:
            case DeliveryStatus.FailedNotReady:
            case DeliveryStatus.FailedTooFar:
            case DeliveryStatus.FailedOther:
                let duration = '';
                if (this.courierAssingTime && this.deliveryStatusDate)
                    duration = ' ' + getLang(this.remult).within + ' ' + Math.round((this.deliveryStatusDate.valueOf() - this.courierAssingTime.valueOf()) / 60000) + " " + getLang(this.remult).minutes;
                return this.deliverStatus.caption + (this.courierComments ? ", " + this.courierComments + " - " : '') + (this.courier ? ' ' + getLang(this.remult).by + ' ' + this.courier.name : '') + ' ' + relativeDateName(this.remult, { d: this.deliveryStatusDate }) + duration;

        }
        return this.deliverStatus.caption;
    }
    describe() {
        return Families.GetUpdateMessage(this, 1, this.courier && this.courier.name, this.remult);
    }






    getDrivingLocation(): Location {
        if (this.drivingLatitude != 0)
            return {
                lat: this.drivingLatitude,
                lng: this.drivingLongitude
            }
        else
            return {
                lat: this.addressLatitude,
                lng: this.addressLongitude
            }
    }
    openWaze() {
        if (isDesktop())
            window.open('https://waze.com/ul?ll=' + this.getDrivingLocation() + "&q=" + encodeURI(this.address) + 'export &navigate=yes', '_blank');
        else
            try {
                location.href = 'waze://?ll=' + toLongLat(this.getDrivingLocation()) + "&q=" + encodeURI(this.address) + '&navigate=yes';
            } catch (err) {
                console.log(err);
            }
    }
    openGoogleMaps() {
        window.open('https://www.google.com/maps/search/?api=1&hl=' + getLang(this.remult).languageCode + '&query=' + this.addressByGoogle, '_blank');
    }
    showOnGoogleMaps() {
        window.open('https://maps.google.com/maps?q=' + toLongLat(this.getDrivingLocation()) + '&hl=' + getLang(this.remult).languageCode, '_blank');
    }
    showOnGovMap() {
        window.open('https://www.govmap.gov.il/?q=' + this.address + '&z=10', '_blank');
    }
    isGpsAddress() {
        return isGpsAddress(this.address);
    }
    getAddressDescription() {
        if (this.isGpsAddress()) {
            return getLang(this.remult).gpsLocationNear + ' ' + this.addressByGoogle;
        }
        return this.address;
    }

    checkAllowedForUser(): boolean {
        return this.distributionCenter.checkAllowedForUser();
    }
    checkNeedsWork() {
        if (this.courierComments && this.deliverStatus != DeliveryStatus.ReadyForDelivery)
            this.needsWork = true;
        switch (this.deliverStatus) {
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedDoNotWant:
            case DeliveryStatus.FailedNotReady:
            case DeliveryStatus.FailedTooFar:
            case DeliveryStatus.FailedOther:
                this.needsWork = true;
                break;
        }
    }
    async showDetailsDialog(callerHelper: {
        refreshDeliveryStats?: () => void,
        reloadDeliveries?: () => void,
        onSave?: () => Promise<void>,
        focusOnAddress?: boolean,
        ui: UITools
    }) {


        let showFamilyDetails = this.remult.isAllowed(Roles.admin);
        if (showFamilyDetails) {
            let f = await this.remult.repo(Families).findId(this.family);
            if (f) {

                await callerHelper.ui.updateFamilyDialog({
                    familyDelivery: this,
                    focusOnAddress: callerHelper.focusOnAddress,
                    onSave: async () => {
                        if (callerHelper && callerHelper.onSave)
                            await callerHelper.onSave();
                    }, afterSave: y => {
                        if (y.refreshDeliveryStatistics)
                            if (callerHelper && callerHelper.refreshDeliveryStats)
                                callerHelper.refreshDeliveryStats();
                        if (y.reloadDeliveries)
                            if (callerHelper && callerHelper.reloadDeliveries)
                                callerHelper.reloadDeliveries();

                    }
                });
            }
            else {
                await callerHelper.ui.Error(getLang(this.remult).familyWasNotFound);
                showFamilyDetails = false;
            }
        }
        if (!showFamilyDetails) {
            await this.showDeliveryOnlyDetail(callerHelper);
        }



    }
    async showDeliveryOnlyDetail(callerHelper: { refreshDeliveryStats?: () => void; onSave?: () => Promise<void>; focusOnDelivery?: boolean; ui: UITools; }) {
        callerHelper.ui.inputAreaDialog({
            title: getLang(this.remult).deliveryDetailsFor + ' ' + this.name,
            ok:
                async () => {

                    this.save();

                    if (callerHelper) {
                        if (this.changeRequireStatsRefresh() && callerHelper.refreshDeliveryStats)
                            callerHelper.refreshDeliveryStats();
                        if (callerHelper.onSave)
                            callerHelper.onSave();
                    }
                },
            cancel: () => {
                this._.undoChanges();
            },
            fields: this.deilveryDetailsAreaSettings(callerHelper.ui)
        }
        );
    }

    deilveryDetailsAreaSettings(ui: UITools): DataAreaFieldsSetting[] {
        return [
            [{ width: '', field: this.$.basketType }, { width: '', field: this.$.quantity }],
            [{ width: '', field: this.$.deliverStatus }, this.$.deliveryStatusDate],
            this.$.deliveryComments,
            this.$.courier,
            { field: this.$.distributionCenter, visible: () => ui.hasManyCenters },
            this.$.needsWork,
            this.$.courierComments,
            this.$.a1, this.$.a2, this.$.a3, this.$.a4,
            this.$.internalDeliveryComment,
            this.$.special,
        ]
    };

}
SqlBuilder.filterTranslators.push({
    translate: async (remult, f) => {
        return Filter.translateCustomWhere<FamilyDeliveries>(f, remult.repo(FamilyDeliveries).metadata, remult);
    }
});

@Entity<FamilyDeliveries>('ActiveFamilyDeliveries', {
    backendPrefilter: { ...FamilyDeliveries.active },
    apiPrefilter: FamilyDeliveries.isAllowedForUser()

})
export class ActiveFamilyDeliveries extends FamilyDeliveries {



}

iniFamilyDeliveriesInFamiliesCode(FamilyDeliveries, ActiveFamilyDeliveries);

function logChanged(remult: Remult, col: FieldRef<any>, dateCol: FieldRef<any, Date>, user: IdFieldRef<any, HelpersBase>, wasChanged: (() => void)) {
    if (col.value != col.originalValue) {
        dateCol.value = new Date();
        user.setId(remult.user.id);
        wasChanged();
    }
}




