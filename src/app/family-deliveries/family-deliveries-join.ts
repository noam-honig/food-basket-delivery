import { Context, EntityClass, IdEntity, StringColumn, BoolColumn, NumberColumn, Column, FilterBase } from '@remult/core';
import { Families, FamilyId, GroupsColumn } from '../families/families';
import { SqlBuilder, changeDate, PhoneColumn } from '../model-shared/types';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { Roles } from '../auth/roles';
import { BasketId } from '../families/BasketType';
import { DistributionCenterId } from '../manage/distribution-centers';
import { DeliveryStatusColumn, DeliveryStatus } from '../families/DeliveryStatus';
import { HelperId, HelperIdReadonly, Helpers } from '../helpers/helpers';
import { YesNoColumn } from '../families/YesNo';


@EntityClass
export class FamilyDeliveresJoin extends IdEntity {


    //family delivereies
    familyId = new FamilyId();
    basketType = new BasketId(this.context, 'סוג סל');
    distributionCenter = new DistributionCenterId(this.context);
    deliverStatus = new DeliveryStatusColumn();
    courier = new HelperId(this.context, () => this.distributionCenter.value, "משנע");
    courierComments = new StringColumn('הערות מסירה');
    deliveryStatusDate = new changeDate('מתי');
    courierAssignUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, 'מי שייכה למשנע');
    courierAssingTime = new changeDate('מועד שיוך למשנע');
    deliveryStatusUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, 'מי עדכן את סטטוס המשלוח');
    createDate = new changeDate({ includeInApi: Roles.admin, caption: 'מועד הקצאה' });
    createUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, { includeInApi: Roles.admin, caption: 'משתמש מקצה' });
    needsWork = new BoolColumn({ caption: 'צריך טיפול/מעקב' });
    needsWorkUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, 'צריך טיפול - מי עדכן');
    needsWorkDate = new changeDate('צריך טיפול - מתי עודכן');

    //families

    name = new StringColumn({
        caption: "שם",
        allowApiUpdate: false
    });
    groups = new GroupsColumn(this.context);
    special = new YesNoColumn({ includeInApi: Roles.admin, caption: 'שיוך מיוחד' });
    address = new StringColumn("כתובת");
    floor = new StringColumn('קומה');
    appartment = new StringColumn('דירה');
    entrance = new StringColumn('כניסה');
    city = new StringColumn({ caption: "עיר (מתעדכן אוטומטית)" });
    addressComment = new StringColumn('הנחיות נוספות לכתובת');

    deliveryComments = new StringColumn('הערה שתופיע למשנע');
    phone1 = new PhoneColumn({ caption: "טלפון 1", dbName: 'phone' });
    phone1Description = new StringColumn('הערות לטלפון 1');
    phone2 = new PhoneColumn({ caption: "טלפון 2" });
    phone2Description = new StringColumn('הערות לטלפון 2');
    phone3 = new PhoneColumn({ caption: "טלפון 3" });
    phone3Description = new StringColumn('הערות לטלפון 3');
    phone4 = new PhoneColumn({ caption: "טלפון 4" });
    phone4Description = new StringColumn('הערות לטלפון 4');
    courierAssignUserName = new StringColumn({
        caption: 'שם שיוך למשנע',
        serverExpression: async () => (await this.context.for(Helpers).lookupAsync(this.courierAssignUser)).name.value
    });
    courierAssignUserPhone = new PhoneColumn({
        caption: 'טלפון שיוך למשנע',
        serverExpression: async () => (await this.context.for(Helpers).lookupAsync(this.courierAssignUser)).phone.value
    });
    routeOrder = new NumberColumn();
    addressLongitude = new NumberColumn({ decimalDigits: 8 });//שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
    addressLatitude = new NumberColumn({ decimalDigits: 8 });
    addressOk = new BoolColumn({ caption: 'כתובת תקינה' });
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
    readyAndSelfPickup() {
        return this.deliverStatus.readyAndSelfPickup(this.courier);
    }
    onTheWayFilter() {
        return this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(this.courier.isDifferentFrom(''));
    }
    constructor(private context: Context) {
        super({
            name: 'FamilyDeliveresJoin',
            allowApiUpdate: Roles.admin,
            dbName: () => {
                let f = context.for(Families).create();
                let d = context.for(FamilyDeliveries).create();
                var sql = new SqlBuilder();

                return sql.build('(', sql.query({
                    select: () => [
                        d.id
                        , sql.columnWithAlias(f.id, this.familyId)
                        , d.basketType
                        , d.distributionCenter
                        , d.deliverStatus
                        , d.courier
                        , d.courierComments
                        , d.deliveryStatusDate
                        , d.courierAssignUser
                        , d.courierAssingTime
                        , d.deliveryStatusUser
                        , d.createDate
                        , d.createUser
                        , d.needsWork
                        , d.needsWorkUser
                        , d.needsWorkDate
                        , f.name
                        , f.groups
                        , f.special
                        , f.address
                        , f.floor
                        , f.appartment
                        , f.entrance
                        , f.city
                        , f.addressComment
                        , f.deliveryComments
                        , f.phone1
                        , f.phone1Description
                        , f.phone2
                        , f.phone2Description
                        , f.phone3
                        , f.phone3Description
                        , f.phone4
                        , f.phone4Description
                        , f.routeOrder
                        , f.addressLongitude
                        , f.addressLatitude
                        , f.addressOk

                    ],
                    from: d,
                    innerJoin: () => [{ to: f, on: () => [sql.eq(f.id, d.family)] }]
                }), ') as result');
            },
            savingRow: async doNotSaveToDb => {
                if (context.onServer) {
                    let f = await context.for(Families).findFirst(f => f.id.isEqualTo(this.familyId));
                    f.name.value = this.name.value;
                    await f.save();
                    doNotSaveToDb();
                }
            }
        });
        for (const key in this) {
            if (this.hasOwnProperty(key)) {
                const c = this[key];
                if (c instanceof Column) {
                    //@ts-ignore
                    c.defs.allowApiUpdate = c == this.courierComments || c == this.deliverStatus || c == this.correntAnErrorInStatus || c == this.needsWork;
                }

            }
        }
    }

}