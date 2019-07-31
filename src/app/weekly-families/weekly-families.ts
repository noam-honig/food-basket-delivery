import { SqlBuilder, DateTimeColumn } from "../model-shared/types";
import { EntityClass, Context, EntityOptions, IdEntity, StringColumn, NumberColumn } from "radweb";
import { HelperId } from "../helpers/helpers";
import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatusColumn, WeeklyFamilyDeliveryStatus } from "../weekly-families-deliveries/weekly-families-deliveries";
import { IdColumn } from "radweb";
import { Roles } from "../auth/roles";



@EntityClass
export class WeeklyFamilies extends IdEntity<WeeklyFamilyId>{

    constructor(protected context: Context, options?: EntityOptions) {
        super(new WeeklyFamilyId(), options ? options : {
            name: 'weeklyFamilies',
            allowApiCRUD: false,
            allowApiRead: Roles.anyWeekly,

            apiDataFilter: () => {
                if (context.isAllowed(Roles.weeklyFamilyAdmin))
                    return undefined;
                return this.okToSeeIt.isEqualTo(1);
            }


        });
        this.lastDelivery.dontShowTimeForOlderDates = true;
    }

    codeName = new StringColumn({ caption: 'שם קוד' });
    packingComment = new StringColumn('הערה לאריזה');
    assignedHelper = new HelperId(this.context, { caption: 'אחראית' });
    lastDelivery = new DateTimeColumn(
        {
            caption: 'משלוח אחרון',
            dbReadOnly: true,
            dbName: () => {
                let wfd = new WeeklyFamilyDeliveries(this.context);
                let sql = new SqlBuilder();
                return sql.columnInnerSelect(this, {
                    select: () => [wfd.deliveredOn],
                    from: wfd,
                    where: () => [sql.eq(wfd.familyId, this.id), wfd.status.isEqualTo(WeeklyFamilyDeliveryStatus.Delivered)],
                    orderBy: [{ column: wfd.ordnial, descending: true }]
                });

            }
        });
    lastDeliveryStatus = new WeeklyFamilyDeliveryStatusColumn(
        {
            caption: 'סטטוס אחרון',
            dbReadOnly: true,
            dbName: () => {
                let wfd = new WeeklyFamilyDeliveries(this.context);
                let sql = new SqlBuilder();
                return sql.columnInnerSelect(this, {
                    select: () => [wfd.status],
                    from: wfd,
                    where: () => [sql.eq(wfd.familyId, this.id)],
                    orderBy: [{ column: wfd.ordnial, descending: true }]
                });

            }
        });
    deliveriesInPacking = new NumberColumn({
        caption: 'משלוחים באריזה',
        dbReadOnly: true,
        dbName: () => {
            let d = new WeeklyFamilyDeliveries(this.context);
            let sql = new SqlBuilder();
            return sql.columnCount(this, {
                from: d,
                where: () => [sql.eq(d.familyId, this.id), sql.in(d.status, WeeklyFamilyDeliveryStatus.Pack.id, WeeklyFamilyDeliveryStatus.Ready.id)]
            });
        }

    });

    okToSeeIt = new NumberColumn({
        caption: 'ok to see',
        dbReadOnly: true,
        dbName: () => {
            let sql = new SqlBuilder();
            let conditions = [];
            if (this.context.isAllowed(Roles.weeklyFamilyVolunteer))
                conditions.push({
                    when: [sql.eq(this.assignedHelper, sql.str(this.context.user.id))], then: '1'
                });
            if (this.context.isAllowed(Roles.weeklyFamilyPacker)) {
                conditions.push({
                    when: [sql.gt(this.deliveriesInPacking, 0)], then: '1'
                })
            }
            let r = sql.case(
                conditions
                , '0');

            return r;
        }
    });
}


@EntityClass
export class WeeklyFullFamilyInfo extends WeeklyFamilies {
    name = new StringColumn({ caption: 'שם' });
    constructor(context: Context) {
        super(context, {
            name: 'weeklyFullFamilies',
            dbName: () => 'weeklyFamilies',
            allowApiRead:  Roles.weeklyFamilyVolunteer,
            allowApiUpdate: Roles.weeklyFamilyAdmin,
            allowApiDelete: Roles.weeklyFamilyAdmin,
            allowApiInsert: Roles.weeklyFamilyAdmin,
            apiDataFilter: () => {
                if (context.isAllowed(Roles.weeklyFamilyAdmin))
                    return undefined;
                return this.assignedHelper.isEqualTo(context.user.id)
            }
        });


    }


}


export class WeeklyFamilyId extends IdColumn {

}