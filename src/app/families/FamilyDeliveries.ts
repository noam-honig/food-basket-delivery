import { PhoneColumn, changeDate, SqlBuilder, DateTimeColumn } from "../model-shared/types";
import { EntityClass, Context, IdColumn, IdEntity, StringColumn, NumberColumn, BoolColumn, FilterBase, AndFilter, Column } from '@remult/core';
import { BasketId, QuantityColumn } from "./BasketType";
import { FamilyId, Families, GroupsColumn } from "./families";
import { DeliveryStatusColumn, DeliveryStatus } from "./DeliveryStatus";
import { HelperId, HelperIdReadonly, Helpers, HelperUserInfo } from "../helpers/helpers";
import { Entity, CompoundIdColumn } from '@remult/core';
import { FamilySourceId } from "./FamilySources";
import { Roles } from "../auth/roles";
import { DistributionCenters, DistributionCenterId as DistributionCenterId } from "../manage/distribution-centers";
import { YesNoColumn } from "./YesNo";

import { Location, toLongLat, isGpsAddress } from '../shared/googleApiHelpers';

@EntityClass
export class FamilyDeliveries extends IdEntity {
    copyFrom(originalDelivery: FamilyDeliveries) {
        this.distributionCenter.value = originalDelivery.distributionCenter.value;
        this.special.value = originalDelivery.special.value;
        this.basketType.value = originalDelivery.basketType.value;
        this.quantity.value = originalDelivery.quantity.value;
        this.deliveryComments.value = originalDelivery.deliveryComments.value;
    }
    async duplicateCount() {
        return await this.context.for(ActiveFamilyDeliveries).count(
            fd => fd.family.isEqualTo(this.family).and(
                fd.deliverStatus.isNotAResultStatus()).and(
                    fd.basketType.isEqualTo(this.basketType).and(
                        fd.distributionCenter.isEqualTo(this.distributionCenter)
                    )
                ));
    }
    family = new FamilyId({
        allowApiUpdate: false
    });

    name = new StringColumn({
        allowApiUpdate: false,
        caption: "שם"
    });
    basketType = new BasketId(this.context, {
        caption: 'סוג סל',
        allowApiUpdate: Roles.distCenterAdmin
    });
    quantity = new QuantityColumn({ caption: 'מספר סלים', allowApiUpdate: Roles.distCenterAdmin, dataControlSettings: () => ({ width: '100', inputType: 'number' }) });

    distributionCenter = new DistributionCenterId(this.context, {
        allowApiUpdate: Roles.distCenterAdmin
    });
    deliverStatus = new DeliveryStatusColumn();
    courier = new HelperId(this.context, {
        caption: "מתנדב",
        allowApiUpdate: Roles.distCenterAdmin
    });
    courierComments = new StringColumn('הערות שכתב המתנדב כשמסר');
    routeOrder = new NumberColumn({
        allowApiUpdate: Roles.distCenterAdmin
    });
    special = new YesNoColumn({ includeInApi: Roles.distCenterAdmin, caption: 'שיוך מיוחד' });
    deliveryStatusDate = new changeDate('מתי');
    courierAssignUser = new HelperIdReadonly(this.context, 'מי שייכה למתנדב');
    courierAssingTime = new changeDate('מועד שיוך למתנדב');
    deliveryStatusUser = new HelperIdReadonly(this.context, 'מי עדכן את סטטוס המשלוח');

    createDate = new changeDate({ includeInApi: Roles.distCenterAdmin, caption: 'מועד הקצאה' });
    createUser = new HelperIdReadonly(this.context, { includeInApi: Roles.admin, caption: 'משתמש מקצה' });
    needsWork = new BoolColumn({
        caption: 'צריך טיפול/מעקב',
        allowApiUpdate: Roles.distCenterAdmin
    });
    needsWorkUser = new HelperIdReadonly(this.context, 'צריך טיפול - מי עדכן');
    needsWorkDate = new changeDate('צריך טיפול - מתי עודכן');
    deliveryComments = new StringColumn({
        caption: 'הערה למשלוח',
        allowApiUpdate: Roles.distCenterAdmin
    });

    familySource = new FamilySourceId(this.context, {
        includeInApi: Roles.distCenterAdmin,
        caption: 'גורם מפנה'
    });
    groups = new GroupsColumn(this.context, {
        includeInApi: Roles.distCenterAdmin
    });


    address = new StringColumn({
        caption: "כתובת",
        allowApiUpdate: false
    });
    floor = new StringColumn({
        caption: 'קומה',
        allowApiUpdate: false
    });
    appartment = new StringColumn({
        caption: 'דירה',
        allowApiUpdate: false
    });
    entrance = new StringColumn({
        caption: 'כניסה',
        allowApiUpdate: false
    });
    city = new StringColumn({
        caption: "עיר (מתעדכן אוטומטית)"
        , allowApiUpdate: false
    });
    area = new StringColumn({ caption: 'אזור', allowApiUpdate: false });
    addressComment = new StringColumn({
        caption: 'הנחיות נוספות לכתובת',
        allowApiUpdate: false
    });
    //שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
    addressLongitude = new NumberColumn({
        decimalDigits: 8,
        allowApiUpdate: false
    });
    addressLatitude = new NumberColumn({
        decimalDigits: 8,
        allowApiUpdate: false
    });
    //זו התוצאה שחזרה מהGEOCODING כך שהיא מכוונת לכביש הקרוב
    drivingLongitude = new NumberColumn({
        decimalDigits: 8,
        allowApiUpdate: false
    });
    drivingLatitude = new NumberColumn({
        decimalDigits: 8,
        allowApiUpdate: false
    });
    addressByGoogle = new StringColumn({ caption: "כתובת כפי שגוגל הבין", allowApiUpdate: false });
    addressOk = new BoolColumn({
        caption: 'כתובת תקינה',
        allowApiUpdate: false
    });


    phone1 = new PhoneColumn({
        caption: "טלפון 1", dbName: 'phone',
        allowApiUpdate: false
    });
    phone1Description = new StringColumn({
        caption: 'הערות לטלפון 1',
        allowApiUpdate: false
    });
    phone2 = new PhoneColumn({
        caption: "טלפון 2",
        allowApiUpdate: false
    });
    phone2Description = new StringColumn({
        caption: 'הערות לטלפון 2',
        allowApiUpdate: false
    });
    phone3 = new PhoneColumn({
        caption: "טלפון 3",
        allowApiUpdate: false
    });
    phone3Description = new StringColumn({
        caption: 'הערות לטלפון 3',
        allowApiUpdate: false
    });
    phone4 = new PhoneColumn({
        caption: "טלפון 4",
        allowApiUpdate: false
    });
    phone4Description = new StringColumn({
        caption: 'הערות לטלפון 4',
        allowApiUpdate: false
    });
    courierBeenHereBefore = new BoolColumn({
        sqlExpression: () => {
            var sql = new SqlBuilder();

            var fd = this.context.for(FamilyDeliveries).create();
            let f = this;
            sql.addEntity(f, "FamilyDeliveries");
            return sql.columnWithAlias(sql.case([{ when: [sql.ne(f.courier, "''")], then: sql.build('exists (select 1 from ', fd, ' where ', sql.and(sql.eq(fd.family, f.id), sql.eq(fd.courier, f.courier)), ")") }], false), 'courierBeenHereBefore');
        }
    });

    archive = new BoolColumn();

    visibleToCourier = new BoolColumn({
        sqlExpression: () => {
            var sql = new SqlBuilder();
            return sql.case([{ when: [sql.or(sql.gtAny(this.deliveryStatusDate, 'current_date -1'), this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery))], then: true }], false);

        }
    });

    active() {
        return this.archive.isEqualTo(false);
    }
    disableChangeLogging = false;
    _disableMessageToUsers = false;
    constructor(protected context: Context, private onlyActive = false, apiEndPoing = 'FamilyDeliveries') {
        super({
            name: apiEndPoing,
            dbName: 'FamilyDeliveries',
            allowApiRead: context.isSignedIn(),
            allowApiInsert: false,
            allowApiUpdate: context.isSignedIn(),
            allowApiDelete: Roles.distCenterAdmin,
            apiDataFilter: () => {
                return this.isAllowedForUser();

            },
            fixedWhereFilter: () => {
                if (onlyActive)
                    return this.active();

            },

            savingRow: () => {
                if (this.isNew()) {
                    this.createDate.value = new Date();
                    this.createUser.value = context.user.id;
                    this.deliveryStatusDate.value = new Date();
                    this.deliveryStatusUser.value = context.user.id;
                }
                if (this.quantity.value < 1)
                    this.quantity.value = 1;


                if (!this.disableChangeLogging) {
                    if (!this.isNew() || this.courier.value)
                        logChanged(context, this.courier, this.courierAssingTime, this.courierAssignUser, async () => {
                            if (!this._disableMessageToUsers) {
                                Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 2, await this.courier.getTheName()), this.context, this.distributionCenter.value)
                            }
                        }
                        );//should be after succesfull save
                    //logChanged(this.callStatus, this.callTime, this.callHelper, () => { });
                    logChanged(context, this.deliverStatus, this.deliveryStatusDate, this.deliveryStatusUser, async () => {
                        if (!this._disableMessageToUsers) {
                            Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 1, await this.courier.getTheName()), this.context, this.distributionCenter.value);
                        }
                    }); //should be after succesfull save
                    logChanged(context, this.needsWork, this.needsWorkDate, this.needsWorkUser, async () => { }); //should be after succesfull save
                }
            }
        });
    }

    isAllowedForUser() {
        if (!this.context.isSignedIn())
            this.id.isEqualTo('no rows');
        let user = <HelperUserInfo>this.context.user;
        let result: FilterBase;
        let add = (f: FilterBase) => result = new AndFilter(f, result);
        if (this.onlyActive)
            add(this.active());
        if (!this.context.isAllowed(Roles.admin)) {
            if (this.context.isAllowed(Roles.distCenterAdmin))
                add(this.distributionCenter.isAllowedForUser());
            else
                add(this.active());
            if (user.theHelperIAmEscortingId)
                add(this.courier.isEqualTo(user.theHelperIAmEscortingId).and(this.visibleToCourier.isEqualTo(true)));
            else
                add(this.courier.isEqualTo(user.id).and(this.visibleToCourier.isEqualTo(true)));
        }
        return result;
    }

    getShortDeliveryDescription() {
        return this.staticGetShortDescription(this.deliverStatus, this.deliveryStatusDate, this.courier, this.courierComments);
    }
    staticGetShortDescription(deliverStatus: DeliveryStatusColumn, deliveryStatusDate: changeDate, courier: HelperId, courierComments: StringColumn) {
        let r = deliverStatus.displayValue + " ";
        if (DeliveryStatus.IsAResultStatus(deliverStatus.value)) {
            if (deliveryStatusDate.value.valueOf() < new Date().valueOf() - 7 * 86400 * 1000)
                r += "ב " + deliveryStatusDate.value.toLocaleDateString("he-il");
            else
                r += deliveryStatusDate.relativeDateName();
            if (courierComments.value) {
                r += ": " + courierComments.value;
            }
            if (courier.value && deliverStatus.value != DeliveryStatus.SelfPickup && deliverStatus.value != DeliveryStatus.SuccessPickedUp)
                r += ' ע"י ' + courier.getValue();
        }
        return r;
    }
    readyAndSelfPickup() {
        return this.deliverStatus.readyAndSelfPickup(this.courier);
    }
    filterDistCenterAndAllowed(distCenter: string): FilterBase {
        return this.distributionCenter.filter(distCenter);
    }
    getDeliveryDescription() {
        switch (this.deliverStatus.value) {
            case DeliveryStatus.ReadyForDelivery:
                if (this.courier.value) {
                    let c = this.context.for(Helpers).lookup(this.courier);
                    return 'בדרך: ' + c.name.value + (c.eventComment.value ? ' (' + c.eventComment.value + ')' : '') + ', שוייך ' + this.courierAssingTime.relativeDateName();
                }
                break;
            case DeliveryStatus.Success:
            case DeliveryStatus.SuccessLeftThere:
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedOther:
                let duration = '';
                if (this.courierAssingTime.value && this.deliveryStatusDate.value)
                    duration = ' תוך ' + Math.round((this.deliveryStatusDate.value.valueOf() - this.courierAssingTime.value.valueOf()) / 60000) + " דק'";
                return this.deliverStatus.displayValue + (this.courierComments.value ? ", " + this.courierComments.value + " - " : '') + (this.courier.value ? ' על ידי ' + this.courier.getValue() : '') + ' ' + this.deliveryStatusDate.relativeDateName() + duration;

        }
        return this.deliverStatus.displayValue;
    }


    readyFilter(city?: string, group?: string, area?: string) {
        let where = this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
            this.courier.isEqualTo('')).and(this.distributionCenter.isAllowedForUser());
        if (group)
            where = where.and(this.groups.isContains(group));
        if (city) {
            where = where.and(this.city.isEqualTo(city));
        }
        if (area)
            where = where.and(this.area.isEqualTo(area));

        return where;
    }
    onTheWayFilter() {
        return this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(this.courier.isDifferentFrom(''));
    }


    getDrivingLocation(): Location {
        if (this.drivingLatitude.value != 0)
            return {
                lat: this.drivingLatitude.value,
                lng: this.drivingLongitude.value
            }
        else
            return {
                lat: this.addressLatitude.value,
                lng: this.addressLongitude.value
            }
    }
    openWaze() {
        //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + 'export &navigate=yes', '_blank');
        window.open('waze://?ll=' + toLongLat(this.getDrivingLocation()) + "&q=" + encodeURI(this.address.value) + '&navigate=yes');
    }
    openGoogleMaps() {
        window.open('https://www.google.com/maps/search/?api=1&hl=iw&query=' + this.address.value, '_blank');
    }
    showOnGoogleMaps() {
        window.open('https://maps.google.com/maps?q=' + toLongLat(this.getDrivingLocation()) + '&hl=iw', '_blank');
    }
    showOnGovMap() {
        window.open('https://www.govmap.gov.il/?q=' + this.address.value + '&z=10', '_blank');
    }
    isGpsAddress() {
        return isGpsAddress(this.address.value);
    }
    getAddressDescription() {
        if (this.isGpsAddress()) {
            let r = 'נקודת GPS ';
            r += 'ליד ' + this.addressByGoogle.value;

            return r;
        }
        return this.address.value;
    }

    checkAllowedForUser(): boolean {
        return this.distributionCenter.checkAllowedForUser();
    }
    checkNeedsWork() {
        if (this.courierComments.value)
            this.needsWork.value = true;
        switch (this.deliverStatus.value) {
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedOther:
                this.needsWork.value = true;
                break;
        }
    }


}

@EntityClass
export class ActiveFamilyDeliveries extends FamilyDeliveries {



    constructor(context: Context) {
        super(context, true, 'ActiveFamilyDeliveries');
    }

}

function logChanged(context: Context, col: Column<any>, dateCol: DateTimeColumn, user: HelperId, wasChanged: (() => void)) {
    if (col.value != col.originalValue) {
        dateCol.value = new Date();
        user.value = context.user.id;
        wasChanged();
    }
}