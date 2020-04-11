import { PhoneColumn, changeDate, SqlBuilder } from "../model-shared/types";
import { EntityClass, Context, IdColumn, IdEntity, StringColumn, NumberColumn } from '@remult/core';
import { BasketId } from "./BasketType";
import { FamilyId, Families } from "./families";
import { DeliveryStatusColumn, DeliveryStatus } from "./DeliveryStatus";
import { HelperId, HelperIdReadonly } from "../helpers/helpers";
import { Entity, CompoundIdColumn } from '@remult/core';
import { FamilySourceId } from "./FamilySources";
import { Roles } from "../auth/roles";

@EntityClass
export class FamilyDeliveries extends IdEntity {
    family = new FamilyId();

    familyName = new StringColumn({
        caption: "שם"
    });
    basketType = new BasketId(this.context, 'סוג סל');


    deliverStatus = new DeliveryStatusColumn();
    courier = new HelperId(this.context, "משנע");
    courierComments = new StringColumn('הערות מסירה');
    deliveryStatusDate = new changeDate('מתי');
    courierAssignUser = new HelperIdReadonly(this.context, 'מי שייכה למשנע');
    courierAssingTime = new changeDate('מועד שיוך למשנע');
    deliveryStatusUser = new HelperIdReadonly(this.context, 'מי עדכן את סטטוס המשלוח');

    archiveFamilySource = new FamilySourceId(this.context, { caption: 'גורם מפנה' });
    archiveGroups = new StringColumn('קבוצות');
    archive_address = new StringColumn("כתובת");
    archive_floor = new StringColumn('קומה');
    archive_appartment = new StringColumn('דירה');
    archive_entrance = new StringColumn('כניסה');
    archive_postalCode = new NumberColumn('מיקוד');
    archive_city = new StringColumn({ caption: "עיר (מתעדכן אוטומטית)" });
    archive_addressComment = new StringColumn('הערת כתובת');
    archive_deliveryComments = new StringColumn('הערות למשנע');
    archive_phone1 = new PhoneColumn({ caption: "טלפון 1", dbName: 'phone' });
    archive_phone1Description = new StringColumn('תאור טלפון 1');
    archive_phone2 = new PhoneColumn("טלפון 2");
    archive_phone2Description = new StringColumn('תאור טלפון 2');
    archive_phone3 = new PhoneColumn("טלפון 3");
    archive_phone3Description = new StringColumn('תאור טלפון 3');
    archive_phone4 = new PhoneColumn("טלפון 4");
    archive_phone4Description = new StringColumn('תאור טלפון 4');
    archive_addressLongitude = new NumberColumn({ decimalDigits: 8 });
    archive_addressLatitude = new NumberColumn({ decimalDigits: 8 });

    constructor(private context: Context) {
        super({
            name: 'FamilyDeliveries',
            allowApiRead: Roles.admin,
            allowApiDelete: Roles.admin
        });
    }
    getShortDescription() {
        return Families.staticGetShortDescription(this.deliverStatus, this.deliveryStatusDate, this.courier, this.courierComments);
    }



}

