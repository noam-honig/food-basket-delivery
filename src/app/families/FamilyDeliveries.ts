import { IdEntity, Id, StringColumn, PhoneColumn, changeDate, NumberColumn, SqlBuilder } from "../model-shared/types";
import { EntityClass, Context, ContextEntity } from "../shared/context";
import { BasketId } from "./BasketType";
import { FamilyId, Families } from "./families";
import { DeliveryStatusColumn, DeliveryStatus } from "./DeliveryStatus";
import { HelperId, HelperIdReadonly } from "../helpers/helpers";
import { Entity, CompoundIdColumn } from "radweb";
import { FamilySourceId } from "./FamilySources";

@EntityClass
export class FamilyDeliveries extends IdEntity<Id>  {
    family = new FamilyId();
    basketType = new BasketId(this.context, 'סוג סל');


    deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
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
    archive_postalCode = new NumberColumn('מיקוד');
    archive_city = new StringColumn({ caption: "עיר (מתעדכן אוטומטית)" });
    archive_addressComment = new StringColumn('הערת כתובת');
    archive_deliveryComments = new StringColumn('הערות למשנע');
    archive_phone1 = new PhoneColumn({ caption: "טלפון 1", inputType: 'tel', dbName: 'phone' });
    archive_phone1Description = new StringColumn('תאור טלפון 1');
    archive_phone2 = new PhoneColumn({ caption: "טלפון 2", inputType: 'tel' });
    archive_phone2Description = new StringColumn('תאור טלפון 2');
    archive_addressLongitude = new NumberColumn({ decimalDigits: 8 });
    archive_addressLatitude = new NumberColumn({ decimalDigits: 8 });

    constructor(private context: Context) {
        super(new Id(), {
            name: 'FamilyDeliveries',
            allowApiRead: context.isAdmin(),
            allowApiDelete: context.isAdmin()
        });
    }
    getShortDescription() {
        let r = this.deliverStatus.displayValue + " " + this.deliveryStatusDate.relativeDateName();
        if (this.courierComments.value) {
            r += ": " + this.courierComments.value;
        }
        if (this.courier.value)
            r += ' ע"י ' + this.courier.getValue();
        return r;
    }


}

