import { PhoneColumn, changeDate, SqlBuilder, DateTimeColumn } from "../model-shared/types";
import { EntityClass, Context, IdColumn, IdEntity, StringColumn, NumberColumn, BoolColumn, FilterBase, AndFilter, Column } from '@remult/core';
import { BasketId } from "./BasketType";
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
    family = new FamilyId();

    name = new StringColumn({
        caption: "שם",
        dbName: 'familyName'
    });
    basketType = new BasketId(this.context, 'סוג סל');

    distributionCenter = new DistributionCenterId(this.context);
    deliverStatus = new DeliveryStatusColumn();
    courier = new HelperId(this.context, () => this.distributionCenter.value, "משנע");
    courierComments = new StringColumn('הערות שכתב המשנע כשמסר');
    routeOrder = new NumberColumn();
    special = new YesNoColumn({ includeInApi: Roles.admin, caption: 'שיוך מיוחד' });
    deliveryStatusDate = new changeDate('מתי');
    courierAssignUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, 'מי שייכה למשנע');
    courierAssingTime = new changeDate('מועד שיוך למשנע');
    deliveryStatusUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, 'מי עדכן את סטטוס המשלוח');

    createDate = new changeDate({ includeInApi: Roles.admin, caption: 'מועד הקצאה' });
    createUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, { includeInApi: Roles.admin, caption: 'משתמש מקצה' });
    needsWork = new BoolColumn({ caption: 'צריך טיפול/מעקב' });
    needsWorkUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, 'צריך טיפול - מי עדכן');
    needsWorkDate = new changeDate('צריך טיפול - מתי עודכן');
    deliveryComments = new StringColumn('הערה למשלוח');

    familySource = new FamilySourceId(this.context, { includeInApi: true, caption: 'גורם מפנה' });
    groups = new GroupsColumn(this.context);


    address = new StringColumn("כתובת");
    floor = new StringColumn('קומה');
    appartment = new StringColumn('דירה');
    entrance = new StringColumn('כניסה');
    city = new StringColumn({ caption: "עיר (מתעדכן אוטומטית)" });
    addressComment = new StringColumn('הנחיות נוספות לכתובת');
    //שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
    addressLongitude = new NumberColumn({ decimalDigits: 8 });
    addressLatitude = new NumberColumn({ decimalDigits: 8 });
    //זו התוצאה שחזרה מהGEOCODING כך שהיא מכוונת לכביש הקרוב
    drivingLongitude = new NumberColumn({ decimalDigits: 8 });
    drivingLatitude = new NumberColumn({ decimalDigits: 8 });
    addressByGoogle = new StringColumn({ caption: "כתובת כפי שגוגל הבין", allowApiUpdate: false });
    addressOk = new BoolColumn({ caption: 'כתובת תקינה' });


    phone1 = new PhoneColumn({ caption: "טלפון 1", dbName: 'phone' });
    phone1Description = new StringColumn('הערות לטלפון 1');
    phone2 = new PhoneColumn({ caption: "טלפון 2" });
    phone2Description = new StringColumn('הערות לטלפון 2');
    phone3 = new PhoneColumn({ caption: "טלפון 3" });
    phone3Description = new StringColumn('הערות לטלפון 3');
    phone4 = new PhoneColumn({ caption: "טלפון 4" });
    phone4Description = new StringColumn('הערות לטלפון 4');

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
    constructor(protected context: Context, onlyActive = false, apiEndPoing = 'FamilyDeliveries') {
        super({
            name: apiEndPoing,
            dbName: 'FamilyDeliveries',
            allowApiRead: Roles.distCenterAdmin,
            allowApiInsert: Roles.distCenterAdmin,
            allowApiUpdate: Roles.distCenterAdmin,
            allowApiDelete: Roles.admin,
            apiDataFilter: () => {
                if (!context.isSignedIn())
                    this.id.isEqualTo('no rows');
                let user = <HelperUserInfo>context.user;
                let result: FilterBase;
                let add = (f: FilterBase) => result = new AndFilter(f, result);
                if (onlyActive)
                    add(this.active());

                if (!context.isAllowed(Roles.admin)) {
                    if (context.isAllowed(Roles.distCenterAdmin))
                        add(this.distributionCenter.isAllowedForUser());
                    else
                        add(this.active())
                    if (user.theHelperIAmEscortingId)
                        add(this.courier.isEqualTo(user.theHelperIAmEscortingId).and(this.visibleToCourier.isEqualTo(true)));
                    else
                        add(this.courier.isEqualTo(user.id).and(this.visibleToCourier.isEqualTo(true)));
                }
                return result;

            },
            savingRow: () => {
                if (this.isNew()) {
                    this.createDate.value = new Date();
                    this.createUser.value = context.user.id;
                }


                if (!this.disableChangeLogging) {
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
    filterDistCenter(distCenter: string): FilterBase {
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


    readyFilter(city?: string, group?: string) {
        let where = this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
            this.courier.isEqualTo('')).and(this.distributionCenter.isAllowedForUser());
        if (group)
            where = where.and(this.groups.isContains(group));
        if (city) {
            where = where.and(this.city.isEqualTo(city));
        }

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
        window.open('waze://?ll=' + toLongLat(this.getDrivingLocation())+ "&q=" + encodeURI(this.address.value) + '&navigate=yes');
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
    courierBeenHereBefore = new BoolColumn({
        sqlExpression: () => {
          var sql = new SqlBuilder();
    
          var fd = this.context.for(FamilyDeliveries).create();
          let f = this;
          sql.addEntity(f, "families");
          return sql.columnWithAlias(sql.case([{ when: [sql.ne(f.courier, "''")], then: sql.build('exists (select 1 from ', fd, ' where ', sql.and(sql.eq(fd.family, f.id), sql.eq(fd.courier, f.courier)), ")") }], false), 'courierBeenHereBefore');
        }
      });
}

 function logChanged(context: Context, col: Column<any>, dateCol: DateTimeColumn, user: HelperId, wasChanged: (() => void)) {
    if (col.value != col.originalValue) {
      dateCol.value = new Date();
      user.value = context.user.id;
      wasChanged();
    }
  }