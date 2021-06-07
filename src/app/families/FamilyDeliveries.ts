import { ChangeDateColumn, relativeDateName, SqlBuilder, SqlFor } from "../model-shared/types";
import { Phone } from "../model-shared/Phone";

import { Context, IdEntity, Filter, AndFilter,  DecimalValueConverter, filterOf, EntityField, DateOnlyField, DecimalField } from '@remult/core';
import { BasketType, QuantityColumn } from "./BasketType";
import { Families, iniFamilyDeliveriesInFamiliesCode, GroupsValue } from "./families";
import { DeliveryStatus } from "./DeliveryStatus";
import { currentUser, HelperId, Helpers, HelpersBase, HelperUserInfo } from "../helpers/helpers";

import { Roles } from "../auth/roles";
import { DistributionCenters, filterCenterAllowedForUser } from "../manage/distribution-centers";
import { YesNo } from "./YesNo";

import { Location, toLongLat, isGpsAddress } from '../shared/googleApiHelpers';

import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { DialogService } from "../select-popup/dialog";
import { use, FieldType, Field, ValueListFieldType,Entity } from "../translate";
import { includePhoneInApi, getSettings, ApplicationSettings, CustomColumn, questionForVolunteers } from "../manage/ApplicationSettings";
import { getLang } from "../sites/sites";
import { DataControl, IDataAreaSettings, openDialog } from "../../../../radweb/projects/angular";

import { Groups } from "../manage/groups";
import { ValueListValueConverter } from "../../../../radweb/projects/core/src/column";
import { FamilySources } from "./FamilySources";


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
    allowApiRead: context => context.isSignedIn(),
    allowApiInsert: false,
    allowApiUpdate: context => context.isSignedIn(),
    allowApiDelete: Roles.admin,
    apiDataFilter: (self, context) => {

        return FamilyDeliveries.isAllowedForUser(self, context);

    },

    saving: async (self) => {

        if (self.isNew()) {
            self.createDate = new Date();
            self.createUser = self.context.get(currentUser);
            self.deliveryStatusDate = new Date();
            self.deliveryStatusUser = self.context.get(currentUser);
        }
        if (self.quantity < 1)
            self.quantity = 1;
        if (self.distributionCenter == null)
            self.distributionCenter = await self.context.for(DistributionCenters).findFirst(x => x.archive.isEqualTo(false));
        if (self.$.courier.wasChanged())
            self.routeOrder = 0;


        if (!self.disableChangeLogging) {
            if (!self.isNew() || self.courier)
                logChanged(self.context, self.$.courier, self.$.courierAssingTime, self.$.courierAssignUser, async () => {
                    if (!self._disableMessageToUsers) {
                        self.distributionCenter.SendMessageToBrowser(
                            Families.GetUpdateMessage(self, 2, await self.courier.name, self.context), self.context);
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
        if (self.context.onServer &&
            !self.deliverStatus.IsAResultStatus()
            && self.$.deliverStatus.originalValue && self.$.deliverStatus.originalValue.IsAResultStatus()) {
            let f = await self.context.for(Families).findId(self.family);
            if (f)
                f.updateDelivery(self);

        }
        if (self.context.onServer && self.isNew() && !self._disableMessageToUsers) {
            self.distributionCenter.SendMessageToBrowser(getLang(self.context).newDelivery, self.context)

        }
    }
})
export class FamilyDeliveries extends IdEntity {
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
        translation: l => l.familyName,
        sqlExpression: (entity, context) => {
            let r = context.isAllowed(Roles.admin) || !getSettings(context).showOnlyLastNamePartToVolunteer ? undefined : "regexp_replace(name, '^.* ', '')";
            return r;
        }
    })
    name: string;

    @Field({
        translation: l => l.basketType,
        allowApiUpdate: Roles.admin
    })
    basketType: BasketType;
    @Field({
        translation: l => l.quantity,
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
    @DataControl<FamilyDeliveries, HelperId>({
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
    @Field({ translation: l => l.internalDeliveryComment, includeInApi: Roles.admin })
    internalDeliveryComment: string;
    @Field({
        allowApiUpdate: Roles.distCenterAdmin
    })
    routeOrder: number;
    @Field({ includeInApi: Roles.admin, translation: l => l.specialAsignment })
    special: YesNo;
    @ChangeDateColumn({ translation: l => l.deliveryStatusDate })
    deliveryStatusDate: Date;
    relativeDeliveryStatusDate() {
        return relativeDateName(this.context, { d: this.deliveryStatusDate });
    }
    @Field({ translation: l => l.courierAsignUser, allowApiUpdate: false })
    courierAssignUser: Helpers;
    @ChangeDateColumn({ translation: l => l.courierAsignDate })
    courierAssingTime: Date;
    @ChangeDateColumn({ translation: l => l.statusChangeUser })
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
        translation: l => l.address,
        allowApiUpdate: false
    })
    address: string;
    @Field({
        translation: l => l.floor,
        allowApiUpdate: false
    })
    floor: string;
    @Field({
        translation: l => l.appartment,
        allowApiUpdate: false
    })
    appartment: string;
    @Field({
        translation: l => l.entrance,
        allowApiUpdate: false
    })
    entrance: string;
    @Field({
        translation: l => l.buildingCode,
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
        translation: l => l.addressComment,
        allowApiUpdate: false
    })
    addressComment: string;
    @DecimalField({
        allowApiUpdate: false
    })
    //שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
    addressLongitude: number;
    @DecimalField({
        allowApiUpdate: false
    })
    addressLatitude: number;
    @DecimalField({
        allowApiUpdate: false
    })
    //זו התוצאה שחזרה מהGEOCODING כך שהיא מכוונת לכביש הקרוב
    drivingLongitude: number;
    @DecimalField({
        allowApiUpdate: false
    })
    drivingLatitude: number;
    @Field({ translation: l => l.addressByGoogle, allowApiUpdate: false })
    addressByGoogle: string;
    @Field({
        translation: l => l.addressOk,
        allowApiUpdate: false
    })
    addressOk: boolean;
    @Field({ translation: l => l.defaultVolunteer, allowApiUpdate: false })
    fixedCourier: HelperId;
    @Field({ translation: l => l.familyMembers, allowApiUpdate: false })
    familyMembers: number;
    @Field({
        translation: l => l.phone1, dbName: 'phone',
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone1: Phone;
    @Field({
        translation: l => l.phone1Description,
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone1Description: string;
    @Field({
        translation: l => l.phone2,
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone2: Phone;
    @Field({
        translation: l => l.phone2Description,
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone2Description: string;
    @Field({
        translation: l => l.phone3,
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone3: Phone;
    @Field({
        translation: l => l.phone3Description,
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone3Description: string;
    @Field({
        translation: l => l.phone4,
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone4: Phone;
    @Field({
        translation: l => l.phone4Description,
        includeInApi: context => includePhoneInApi(context),
        allowApiUpdate: false
    })
    phone4Description: string;

    @Field({
        sqlExpression: (self, context) => {
            var sql = new SqlBuilder();

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
    })
    courierBeenHereBefore: boolean;
    @Field({ allowApiUpdate: c => c.isAllowed([Roles.admin, Roles.lab]) || c.isSignedIn() && getSettings(c).isSytemForMlt() })
    archive: boolean;
    @ChangeDateColumn({ includeInApi: Roles.admin, translation: l => l.archiveDate })
    archiveDate: Date;
    @Field({ includeInApi: Roles.admin, translation: l => l.archiveUser })
    archiveUser: HelpersBase;
    @Field({
        sqlExpression: (selfDefs, context) => {
            var sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            return sql.case([{ when: [sql.or(sql.gtAny(self.deliveryStatusDate, 'current_date -1'), self.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery))], then: true }], false);

        }
    })
    visibleToCourier: boolean;
    @Field({
        sqlExpression: (self, context) => {
            var sql = new SqlBuilder();

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
                    , " from ", helper.defs.dbName, " as h where ", sql.eq(helper.id, f.courier), "), " + MessageStatus.noVolunteer.id + ")")
            }], MessageStatus.noVolunteer.id);
        }
    })
    messageStatus: MessageStatus;
    @CustomColumn(() => questionForVolunteers[1])
    a1: string;
    @CustomColumn(() => questionForVolunteers[2])
    a2: string;
    @CustomColumn(() => questionForVolunteers[3])
    a3: string;
    @CustomColumn(() => questionForVolunteers[4])
    a4: string;


    static active(self: filterOf<FamilyDeliveries>) {
        return self.archive.isEqualTo(false);
    }
    static notActive(self: filterOf<FamilyDeliveries>) {
        return self.archive.isEqualTo(true);
    }
    disableChangeLogging = false;
    _disableMessageToUsers = false;
    constructor(protected context: Context, private onlyActive = false, apiEndPoing = 'FamilyDeliveries') {
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
            addColumn(use.language.email, f.email, 's');
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
            addColumn("X" + f.$.tz.defs.caption, f.tz, 's');
            addColumn("X" + f.$.tz2.defs.caption, f.tz2, 's');

        }
    }
    static isAllowedForUser(self: filterOf<FamilyDeliveries>, context: Context) {
        if (!context.isSignedIn())
            return self.id.isEqualTo('no rows');
        let user = context.get(currentUser);
        user.theHelperIAmEscorting;
        let result: Filter;
        let add = (f: Filter) => result = new AndFilter(f, result);

        if (!context.isAllowed([Roles.admin, Roles.lab])) {
            add(FamilyDeliveries.active(self));
            if (context.isAllowed(Roles.distCenterAdmin))
                add(filterCenterAllowedForUser(self.distributionCenter, context));
            else {
                if (user.theHelperIAmEscorting)
                    add(self.courier.isEqualTo(user.theHelperIAmEscorting).and(self.visibleToCourier.isEqualTo(true)));
                else
                    add(self.courier.isEqualTo(user).and(self.visibleToCourier.isEqualTo(true)));
            }
        }
        return result;
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
    static readyAndSelfPickup(self: filterOf<FamilyDeliveries>) {
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
                return this.deliverStatus.caption + (this.courierComments ? ", " + this.courierComments + " - " : '') + (this.courier ? ' ' + getLang(this.context).by + ' ' + this.courier : '') + ' ' + relativeDateName(this.context, { d: this.deliveryStatusDate }) + duration;

        }
        return this.deliverStatus.caption;
    }
    describe() {
        return Families.GetUpdateMessage(this, 1, this.courier && this.courier.name, this.context);
    }


    static readyFilter(self: filterOf<FamilyDeliveries>, context: Context, city?: string, group?: string, area?: string, basket?: BasketType) {
        let where = self.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
            self.courier.isEqualTo(null)).and(filterCenterAllowedForUser(self.distributionCenter, context));
        if (group)
            where = where.and(self.groups.contains(group));
        if (city) {
            where = where.and(self.city.isEqualTo(city));
        }
        if (area !== undefined && area != getLang(context).allRegions)
            where = where.and(self.area.isEqualTo(area));
        if (basket != null)
            where = where.and(self.basketType.isEqualTo(basket))

        return where;
    }
    static onTheWayFilter(self: filterOf<FamilyDeliveries>, context: Context) {
        return self.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(self.courier.isDifferentFrom(null));
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
                    [this.$.basketType, this.$.quantity],
                    [this.$.deliverStatus, this.$.deliveryStatusDate],
                    this.$.deliveryComments,
                    this.$.courier,
                    { column: this.$.distributionCenter, visible: () => dialog.hasManyCenters },
                    this.$.needsWork,
                    this.$.courierComments,
                    this.$.a1, this.$.a2, this.$.a3, this.$.a4,
                    this.$.internalDeliveryComment,
                    this.$.special,
                ]
        };
    }


}

@Entity<FamilyDeliveries>({
    key: 'ActiveFamilyDeliveries',
    fixedFilter: self => FamilyDeliveries.active(self)

})
export class ActiveFamilyDeliveries extends FamilyDeliveries {

}

iniFamilyDeliveriesInFamiliesCode(FamilyDeliveries, ActiveFamilyDeliveries);

function logChanged(context: Context, col: EntityField<any>, dateCol: EntityField<Date>, user: EntityField<HelpersBase>, wasChanged: (() => void)) {
    if (col.value != col.originalValue) {
        dateCol.value = new Date();
        user.value = context.get(currentUser);
        wasChanged();
    }
}


