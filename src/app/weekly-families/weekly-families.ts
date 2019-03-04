import { IdEntity, Id, StringColumn, BoolColumn, SqlBuilder, NumberColumn, DateTimeColumn } from "../model-shared/types";
import { EntityClass, Context, ContextEntityOptions } from "../shared/context";
import { HelperId } from "../helpers/helpers";
import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatusColumn, WeeklyFamilyDeliveryStatus } from "../weekly-families-deliveries/weekly-families-deliveries.component";



@EntityClass
export class WeeklyFamilies extends IdEntity<WeeklyFamilyId>{

    constructor(protected context: Context, options?: ContextEntityOptions) {
        super(new WeeklyFamilyId(), options ? options : {
            name: 'weeklyFamilies',
            allowApiCRUD: false,
            allowApiRead: !!context.info.weeklyFamilyAdmin || !!context.info.weeklyFamilyPacker || !!context.info.weeklyFamilyVolunteer,
            apiDataFilter: () => {
                if (context.info.weeklyFamilyAdmin)
                    return undefined;
                return this.okToSeeIt.isEqualTo(1);
            }

        });
    }

    codeName = new StringColumn({ caption: 'שם קוד' });
    packingComment = new StringColumn('הערה לאריזה');
    assignedHelper = new HelperId(this.context, { caption: 'אחראית' });
    lastDelivery = new DateTimeColumn(
        {
            caption: 'משלוח אחרון',
            readonly: true,
            dbName: () => {
                let wfd = new WeeklyFamilyDeliveries(this.context);
                let sql = new SqlBuilder();
                return sql.columnInnerSelect(this, {
                    select: () => [wfd.deliveredOn],
                    from: wfd,
                    where: () => [sql.eq(wfd.familyId, this.id), sql.eq(wfd.status, WeeklyFamilyDeliveryStatus.Delivered.id)],
                    orderBy: [{ column: wfd.ordnial, descending: true }]
                });

            }
        });
        lastDeliveryStatus = new WeeklyFamilyDeliveryStatusColumn(
            {
                caption: 'סטטוס אחרון',
                readonly: true,
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
            if (this.context.info.weeklyFamilyVolunteer)
                conditions.push({
                    when: [sql.eq(this.assignedHelper, sql.str(this.context.info.helperId))], then: '1'
                });
            if (this.context.info.weeklyFamilyPacker) {
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
            allowApiRead: !!context.info.weeklyFamilyVolunteer,
            allowApiUpdate: context.info.weeklyFamilyAdmin,
            allowApiDelete: false,
            allowApiInsert: context.info.weeklyFamilyAdmin,
            apiDataFilter: () => {
                if (context.info.weeklyFamilyAdmin)
                    return undefined;
                return this.assignedHelper.isEqualTo(context.info.helperId)
            }
        });


    }


}


export class WeeklyFamilyId extends Id {

}