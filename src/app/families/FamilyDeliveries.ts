import { ChangeDateColumn, relativeDateName } from "../model-shared/types";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";

import { Context, IdEntity, Filter, AndFilter, FilterFactories, FieldRef, Allow, BackendMethod, CustomFilterBuilder, isBackend } from 'remult';
import { BasketType } from "./BasketType";
import { Families, iniFamilyDeliveriesInFamiliesCode } from "./families";
import { DeliveryStatus } from "./DeliveryStatus";
import { Helpers, HelpersBase } from "../helpers/helpers";

import { Roles } from "../auth/roles";
import { DistributionCenters } from "../manage/distribution-centers";
import { YesNo } from "./YesNo";

import { Location, toLongLat, isGpsAddress } from '../shared/googleApiHelpers';

import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { DialogService } from "../select-popup/dialog";
import { use, FieldType, Field, ValueListFieldType, Entity, QuantityColumn, IntegerField } from "../translate";
import { includePhoneInApi, getSettings, ApplicationSettings, CustomColumn, questionForVolunteers } from "../manage/ApplicationSettings";
import { getLang } from "../sites/sites";
import { DataControl, IDataAreaSettings, openDialog } from "@remult/angular";

import { Groups, GroupsValue } from "../manage/groups";

import { FamilySources } from "./FamilySources";
import { DeliveryImage, FamilyImage } from "./DeiveryImages";
import { ImageInfo } from "../images/images.component";


@ValueListFieldType(MessageStatus, {
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
@Entity<FamilyDeliveries>({
    key: 'FamilyDeliveries',
    dbName: 'FamilyDeliveries',
    translation: l => l.deliveries,
    allowApiRead: Allow.authenticated,
    allowApiInsert: false,
    allowApiUpdate: Allow.authenticated,
    allowApiDelete: Roles.admin,
    customFilterBuilder: () => FamilyDeliveries.customFilter,
    apiDataFilter: (self) => {

        return FamilyDeliveries.isAllowedForUser();

    },

    saving: async (self) => {

        if (self.isNew()) {
            self.createDate = new Date();
            self.createUser = self.context.currentUser;
            self.deliveryStatusDate = new Date();
            self.deliveryStatusUser = self.context.currentUser;
        }
        if (self.quantity < 1)
            self.quantity = 1;
        if (self.distributionCenter == null)
            self.distributionCenter = await self.context.for(DistributionCenters).findFirst(x => x.archive.isEqualTo(false));
        if (self.$.courier.wasChanged())
            self.routeOrder = 0;

        if (isBackend()) {
            if (!self.disableChangeLogging) {

                if (!self.isNew() || self.courier)
                    logChanged(self.context, self.$.courier, self.$.courierAssingTime, self.$.courierAssignUser, async () => {
                        if (!self._disableMessageToUsers) {
                            self.distributionCenter.SendMessageToBrowser(
                                Families.GetUpdateMessage(self, 2, self.courier?.name, self.context), self.context);
                        }
                    }
                    );
                if (!self.isNew() && self.$.courierComments.wasChanged() && self.courierComments.length > 0)
                    self.courierCommentsDate = new Date();

                logChanged(self.context, self.$.deliverStatus, self.$.deliveryStatusDate, self.$.deliveryStatusUser, async () => {
                    if (!self._disableMessageToUsers) {
                        self.distributionCenter.SendMessageToBrowser(Families.GetUpdateMessage(self, 1, self.courier ? await self.courier.name : '', self.context), self.context);
                    }
                });
                logChanged(self.context, self.$.needsWork, self.$.needsWorkDate, self.$.needsWorkUser, async () => { });
                logChanged(self.context, self.$.archive, self.$.archiveDate, self.$.archiveUser, async () => { });
            }
            if (!self.deliverStatus.IsAResultStatus()
                && self.$.deliverStatus.originalValue && self.$.deliverStatus.originalValue.IsAResultStatus()) {
                let f = await self.context.for(Families).findId(self.family);
                if (f)
                    f.updateDelivery(self);

            }
            if (self.isNew() && !self._disableMessageToUsers) {
                self.distributionCenter.SendMessageToBrowser(getLang(self.context).newDelivery, self.context)

            }
        }
    }
})
export class FamilyDeliveries extends IdEntity {
    @BackendMethod<FamilyDeliveries>({
        allowed: Allow.authenticated
    })
    static async getFamilyImages(family: string, delivery: string, context?: Context): Promise<ImageInfo[]> {
        if (!Roles.admin) {
            let d = await context.for(FamilyDeliveries).findId(delivery);
            if (d.courier != context.currentUser)
                return [];
        }
        let r = (await context.for(FamilyImage).find({ where: f => f.familyId.isEqualTo(family) })).map(({ image }) => ({ image } as ImageInfo));
        return r;
    }
    async loadVolunteerImages(): Promise<import("../images/images.component").ImageInfo[]> {
        return (await this.context.for(DeliveryImage).find({ where: i => i.deliveryId.isEqualTo(this.id) })).map(i => ({
            image: i.image,
            entity: i
        } as ImageInfo));
    }
    addStatusExcelColumn(addColumn: (caption: string, v: string, t: import("xlsx/types").ExcelDataType) => void) {
        addColumn(getLang(this.context).statusSummary, this.statusSammary(), "s");
    }
    statusSammary() {
        var status = this.deliverStatus.caption;
        switch (this.deliverStatus) {
            case DeliveryStatus.ReadyForDelivery:
                if (this.courier)
                    status = getLang(this.context).onTheWay;
                else
                    status = getLang(this.context).unAsigned;
                break;
            case DeliveryStatus.SelfPickup:
            case DeliveryStatus.Frozen:
                break;
            case DeliveryStatus.Success:
            case DeliveryStatus.SuccessPickedUp:
            case DeliveryStatus.SuccessLeftThere:
                status = getLang(this.context).delivered;
                break;
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedDoNotWant:

            case DeliveryStatus.FailedNotReady:
            case DeliveryStatus.FailedTooFar:

            case DeliveryStatus.FailedOther:
                status = getLang(this.context).problem;
                break;
        }
        return status;
    }

    changeRequireStatsRefresh() {
        return [this.$.deliverStatus, this.$.courier, this.$.basketType, this.$.quantity].filter(x => x.wasChanged()).length > 0;
    }
    copyFrom(originalDelivery: FamilyDeliveries) {
        this.distributionCenter = originalDelivery.distributionCenter;
        this.special = originalDelivery.special;
        this.basketType = originalDelivery.basketType;
        this.quantity = originalDelivery.quantity;
        this.deliveryComments = originalDelivery.deliveryComments;
    }
    async duplicateCount() {
        return await this.context.for(ActiveFamilyDeliveries).count(
            fd => fd.family.isEqualTo(this.family).and(
                DeliveryStatus.isNotAResultStatus(fd.deliverStatus)).and(
                    fd.basketType.isEqualTo(this.basketType).and(
                        fd.distributionCenter.isEqualTo(this.distributionCenter)
                    )
                ));
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
        (options, context) =>
            options.sqlExpression = (entity) => {
                let r = context.isAllowed(Roles.distCenterAdmin) || !getSettings(context).showOnlyLastNamePartToVolunteer ? undefined : "regexp_replace(name, '^.* ', '')";
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
        return getSettings(this.context).isSytemForMlt && (this.quantity > 10);
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
        allowApiUpdate: Roles.distCenterAdmin
    })
    @DataControl<FamilyDeliveries, HelpersBase>({
        click: async (self) => openDialog((await import("../select-helper/select-helper.component")).SelectHelperComponent, x => x.args = {
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
        allowApiUpdate: Roles.distCenterAdmin
    })
    routeOrder: number;
    @Field({ includeInApi: Roles.admin, translation: l => l.specialAsignment })
    special: YesNo;
    @ChangeDateColumn()
    deliveryStatusDate: Date;
    relativeDeliveryStatusDate() {
        return relativeDateName(this.context, { d: this.deliveryStatusDate });
    }
    @Field({ allowApiUpdate: false, translation: l => l.courierAsignUser })
    courierAssignUser: HelpersBase;
    @ChangeDateColumn({ translation: l => l.courierAsignDate })
    courierAssingTime: Date;
    @Field({ translation: l => l.statusChangeUser })
    deliveryStatusUser: HelpersBase;
    @ChangeDateColumn({ includeInApi: Roles.admin, translation: l => l.deliveryCreateDate })
    createDate: Date;
    @Field({ includeInApi: Roles.admin, translation: l => l.deliveryCreateUser, allowApiUpdate: false })
    createUser: HelpersBase;
    @Field({
        translation: l => l.requireFollowUp
    })
    needsWork: boolean;

    @Field({ translation: l => l.requireFollowUpUpdateUser })
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
    @Field({ translation: l => l.defaultVolunteer, allowApiUpdate: false })
    fixedCourier: HelpersBase;
    @IntegerField({ allowApiUpdate: false })
    familyMembers: number;
    @Field({
        dbName: 'phone',
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone1: Phone;
    @Field({
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone1Description: string;
    @Field({
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone2: Phone;
    @Field({
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone2Description: string;
    @Field({
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone3: Phone;
    @Field({
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone3Description: string;
    @Field({
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone4: Phone;
    @Field({
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone4Description: string;

    @Field({}, (options, context) =>
        options.sqlExpression = async (self) => {
            var sql = new SqlBuilder(context);

            var fd = SqlFor(context.for(FamilyDeliveries));
            let f = SqlFor(self);
            sql.addEntity(f, "FamilyDeliveries");
            sql.addEntity(fd, 'fd');
            return sql.columnWithAlias(sql.case([{
                when: [sql.ne(f.courier, "''")],
                then: sql.build('exists (select 1 from ', fd, ' as ', 'fd',
                    ' where ', sql.and(sql.not(sql.eq(fd.id, f.id)), sql.eq(fd.family, f.family), sql.eq(fd.courier, f.courier), DeliveryStatus.isAResultStatus(fd.deliverStatus)), ")")
            }], false), 'courierBeenHereBefore');
        }
    )
    courierBeenHereBefore: boolean;
    @Field({ allowApiUpdate: c => c.authenticated() && getSettings(c).isSytemForMlt() })
    archive: boolean;
    @ChangeDateColumn({ includeInApi: Roles.admin, translation: l => l.archiveDate })
    archiveDate: Date;
    @Field({ includeInApi: Roles.admin, translation: l => l.archiveUser })
    archiveUser: HelpersBase;
    @Field({}, (options, context) => options.
        sqlExpression = async (selfDefs) => {
            var sql = new SqlBuilder(context);
            let self = SqlFor(selfDefs);
            return sql.case([{ when: [sql.or(sql.gtAny(self.deliveryStatusDate, 'current_date -1'), self.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery))], then: true }], false);

        }
    )
    visibleToCourier: boolean;
    @Field({}, (options, context) => options.
        sqlExpression = async (self) => {
            var sql = new SqlBuilder(context);

            var helper = SqlFor(context.for(Helpers));
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
        (options, context) => options.sqlExpression = async (selfDefs) => {
            let self = SqlFor(selfDefs);
            let images = SqlFor(context.for(DeliveryImage));
            let sql = new SqlBuilder(context);
            return sql.columnCount(self, {
                from: images,
                where: () => [sql.eq(images.deliveryId, self.id)]
            });

        }
    )
    numOfPhotos: number;
    static customFilter = new CustomFilterBuilder<FamilyDeliveries, {
        allowedForUser?: boolean,
        ready?: {
            city: string,
            group: string,
            area: string,
            basketId: string
        },
        onTheWayFilter?: boolean
    }>(async (self, c, context) => {
        let result: Filter[] = [];
        if (c.allowedForUser) {
            if (!context.authenticated())
                return self.id.isEqualTo('no rows');
            let user = context.currentUser;
            user.theHelperIAmEscorting;
            if (!context.isAllowed([Roles.admin, Roles.lab])) {
                result.push(FamilyDeliveries.active(self));
                if (context.isAllowed(Roles.distCenterAdmin))
                    result.push(context.filterCenterAllowedForUser(self.distributionCenter));
                else {
                    if (user.theHelperIAmEscorting)
                        result.push(self.courier.isEqualTo(user.theHelperIAmEscorting).and(self.visibleToCourier.isEqualTo(true)));
                    else
                        result.push(self.courier.isEqualTo(user).and(self.visibleToCourier.isEqualTo(true)));
                }
            }
        }
        if (c.ready) {
            let { city, group, area } = c.ready;
            let basket = await context.for(BasketType).findId(c.ready.basketId);
            let where = self.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
                self.courier.isEqualTo(null)).and(context.filterCenterAllowedForUser(self.distributionCenter));
            if (group)
                where = where.and(self.groups.contains(group));
            if (city) {
                where = where.and(self.city.isEqualTo(city));
            }
            if (area !== undefined && area != context.lang.allRegions)
                where = where.and(self.area.isEqualTo(area));
            if (basket != null)
                where = where.and(self.basketType.isEqualTo(basket))

            result.push(where);
        }
        if (c.onTheWayFilter)
            result.push(self.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(self.courier.isDifferentFrom(null)));
        return new AndFilter(...result);
    });
    static isAllowedForUser() {
        return this.customFilter.build({ allowedForUser: true });
    }
    static readyFilter(city?: string, group?: string, area?: string, basket?: BasketType) {
        return this.customFilter.build({ ready: { city, group, area, basketId: basket?.id } })
    }
    static onTheWayFilter() {
        return this.customFilter.build({ onTheWayFilter: true });
    }



    static active(self: FilterFactories<FamilyDeliveries>) {
        return self.archive.isEqualTo(false);
    }
    static notActive(self: FilterFactories<FamilyDeliveries>) {
        return self.archive.isEqualTo(true);
    }
    disableChangeLogging = false;
    _disableMessageToUsers = false;
    constructor(protected context: Context) {
        super();
    }

    async addFamilyInfoToExcelFile(addColumn) {
        var f = await this.context.for(Families).findId(this.family);
        let settings = await ApplicationSettings.getAsync(this.context);
        if (f) {
            let x = f.addressHelper.getGeocodeInformation();
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

            addColumn("X" + use.language.lastName, lastName, 's');
            addColumn("X" + use.language.firstName, firstName, 's');
            addColumn("X" + use.language.streetName, street, 's');
            addColumn("X" + use.language.houseNumber, house, 's');
            addColumn("X" + f.$.tz.metadata.caption, f.tz, 's');
            addColumn("X" + f.$.tz2.metadata.caption, f.tz2, 's');

        }
    }


    getShortDeliveryDescription() {
        return this.staticGetShortDescription(this.deliverStatus, this.deliveryStatusDate, this.courier, this.courierComments);
    }
    staticGetShortDescription(deliverStatus: DeliveryStatus, deliveryStatusDate: Date, courier: HelpersBase, courierComments: string) {
        let r = deliverStatus.caption + " ";
        if (deliverStatus.IsAResultStatus() && deliveryStatusDate) {
            if (deliveryStatusDate.valueOf() < new Date().valueOf() - 7 * 86400 * 1000)
                r += getLang(this.context).on + " " + deliveryStatusDate.toLocaleDateString("he-il");
            else
                r += relativeDateName(this.context, { d: deliveryStatusDate });
            if (courierComments) {
                r += ": " + courierComments;
            }
            if (courier && deliverStatus != DeliveryStatus.SelfPickup && deliverStatus != DeliveryStatus.SuccessPickedUp)
                r += ' ' + getLang(this.context).by + ' ' + courier.name;
        }
        return r;
    }
    static readyAndSelfPickup(self: FilterFactories<FamilyDeliveries>) {
        let where = self.deliverStatus.isIn([DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup]).and(
            self.courier.isEqualTo(null));
        return where;

    }



    getDeliveryDescription() {
        switch (this.deliverStatus) {
            case DeliveryStatus.ReadyForDelivery:
                if (this.courier) {
                    let c = this.courier;

                    let r = ((this.messageStatus == MessageStatus.opened ? use.language.onTheWay : use.language.assigned) + ': ' + c.name + (c.eventComment ? ' (' + c.eventComment + ')' : '') + ', ' + use.language.assigned + ' ' + relativeDateName(this.context, { d: this.courierAssingTime })) + " ";
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
                    duration = ' ' + getLang(this.context).within + ' ' + Math.round((this.deliveryStatusDate.valueOf() - this.courierAssingTime.valueOf()) / 60000) + " " + getLang(this.context).minutes;
                return this.deliverStatus.caption + (this.courierComments ? ", " + this.courierComments + " - " : '') + (this.courier ? ' ' + getLang(this.context).by + ' ' + this.courier.name : '') + ' ' + relativeDateName(this.context, { d: this.deliveryStatusDate }) + duration;

        }
        return this.deliverStatus.caption;
    }
    describe() {
        return Families.GetUpdateMessage(this, 1, this.courier && this.courier.name, this.context);
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
        //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address) + 'export &navigate=yes', '_blank');
        location.href = 'waze://?ll=' + toLongLat(this.getDrivingLocation()) + "&q=" + encodeURI(this.address) + '&navigate=yes';
    }
    openGoogleMaps() {
        window.open('https://www.google.com/maps/search/?api=1&hl=' + getLang(this.context).languageCode + '&query=' + this.addressByGoogle, '_blank');
    }
    showOnGoogleMaps() {
        window.open('https://maps.google.com/maps?q=' + toLongLat(this.getDrivingLocation()) + '&hl=' + getLang(this.context).languageCode, '_blank');
    }
    showOnGovMap() {
        window.open('https://www.govmap.gov.il/?q=' + this.address + '&z=10', '_blank');
    }
    isGpsAddress() {
        return isGpsAddress(this.address);
    }
    getAddressDescription() {
        if (this.isGpsAddress()) {
            return getLang(this.context).gpsLocationNear + ' ' + this.addressByGoogle;
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
        dialog: DialogService
    }) {


        let showFamilyDetails = this.context.isAllowed(Roles.admin);
        if (showFamilyDetails) {
            let f = await this.context.for(Families).findId(this.family);
            if (f) {

                openDialog((await import("../update-family-dialog/update-family-dialog.component")).UpdateFamilyDialogComponent, x => x.args = {
                    familyDelivery: this,
                    focusOnAddress: callerHelper.focusOnAddress,
                    onSave: async () => {
                        if (callerHelper && callerHelper.onSave)
                            await callerHelper.onSave();
                    }
                }, y => {
                    if (y.refreshDeliveryStatistics)
                        if (callerHelper && callerHelper.refreshDeliveryStats)
                            callerHelper.refreshDeliveryStats();
                    if (y.reloadDeliveries)
                        if (callerHelper && callerHelper.reloadDeliveries)
                            callerHelper.reloadDeliveries();

                });
            }
            else {
                await callerHelper.dialog.Error(getLang(this.context).familyWasNotFound);
                showFamilyDetails = false;
            }
        }
        if (!showFamilyDetails) {
            await this.showDeliveryOnlyDetail(callerHelper);
        }



    }
    async showDeliveryOnlyDetail(callerHelper: { refreshDeliveryStats?: () => void; onSave?: () => Promise<void>; focusOnDelivery?: boolean; dialog: DialogService; }) {
        openDialog(InputAreaComponent, x => {
            x.args = {
                title: getLang(this.context).deliveryDetailsFor + ' ' + this.name,
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
                settings: this.deilveryDetailsAreaSettings(callerHelper.dialog)
            };
        });
    }

    deilveryDetailsAreaSettings(dialog: DialogService): IDataAreaSettings {
        return {
            fields: () =>
                [
                    [{ width: '', field: this.$.basketType }, { width: '', field: this.$.quantity }],
                    [{ width: '', field: this.$.deliverStatus }, this.$.deliveryStatusDate],
                    this.$.deliveryComments,
                    this.$.courier,
                    { field: this.$.distributionCenter, visible: () => dialog.hasManyCenters },
                    this.$.needsWork,
                    this.$.courierComments,
                    this.$.a1, this.$.a2, this.$.a3, this.$.a4,
                    this.$.internalDeliveryComment,
                    this.$.special,
                ]
        };
    }


}
SqlBuilder.filterTranslators.push({
    translate: async (context, f) => {
        return Filter.translateCustomWhere<FamilyDeliveries>(context.for(FamilyDeliveries).metadata, Filter.createFilterFactories(context.for(FamilyDeliveries).metadata), f, context);
    }
});

@Entity<FamilyDeliveries>({
    key: 'ActiveFamilyDeliveries',
    fixedFilter: self => FamilyDeliveries.active(self)

})
export class ActiveFamilyDeliveries extends FamilyDeliveries {



}

iniFamilyDeliveriesInFamiliesCode(FamilyDeliveries, ActiveFamilyDeliveries);

function logChanged(context: Context, col: FieldRef<any>, dateCol: FieldRef<any, Date>, user: FieldRef<any, HelpersBase>, wasChanged: (() => void)) {
    if (col.value != col.originalValue) {
        dateCol.value = new Date();
        user.value = context.currentUser;
        wasChanged();
    }
}




