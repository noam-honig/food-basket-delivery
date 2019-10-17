import { DeliveryStatus } from "../families/DeliveryStatus";
import { NumberColumn,  BoolColumn } from 'radweb';
import { HelperId, Helpers, HelpersBase } from '../helpers/helpers';
import { changeDate, DateTimeColumn, SqlBuilder } from '../model-shared/types';
import { Families } from "../families/families";

import { Context, EntityClass } from "radweb";
import { Roles } from "../auth/roles";




function log(s: string) {
    console.log(s);
    return s;
}
@EntityClass
export class HelpersAndStats extends HelpersBase {

    deliveriesInProgress = new NumberColumn({
        dbReadOnly: true,
        caption: 'משפחות מחכות'
    });
    allFamilies = new NumberColumn({
        dbReadOnly: true,
        caption: 'משפחות'
    });
    deliveriesWithProblems = new NumberColumn({
        dbReadOnly: true,
        caption: 'משפחות עם בעיות'
    });
    lastAsignTime = new DateTimeColumn({
        dbReadOnly: true
    });
    gotSms = new BoolColumn({
        dbReadOnly: true
    });
    constructor(context: Context) {
        super( {
            name: "helpersAndStats",
            allowApiRead: Roles.admin,
            dbName: () => {
                let f = new Families(context);
                let h = new Helpers(context);
                var sql = new SqlBuilder();

                let helperFamilies = (where: () => any[]) => {
                    return {
                        from: f,
                        where: () => [sql.eq(f.courier, h.id), ...where()]
                    }
                }
                return sql.entityDbName({
                    select: () => [
                        h.id,
                        h.name,
                        h.phone,
                        h.smsDate,
                        h.reminderSmsDate,
                        h.company,
                        h.totalKm,
                        h.totalTime,
                        h.shortUrlKey,
                        sql.countInnerSelect(helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), this.deliveriesInProgress),
                        sql.countInnerSelect(helperFamilies(() => [f.deliverStatus.isActiveDelivery()]), this.allFamilies),
                        sql.countInnerSelect(helperFamilies(() => [sql.in(f.deliverStatus,
                            DeliveryStatus.FailedBadAddress.id,
                            DeliveryStatus.FailedNotHome.id,
                            DeliveryStatus.FailedOther.id)]),
                            this.deliveriesWithProblems),
                        sql.max(f.courierAssingTime,
                            helperFamilies(() =>
                                [sql.not(sql.in(f.deliverStatus, DeliveryStatus.Frozen.id, DeliveryStatus.NotInEvent.id))]), this.lastAsignTime),
                        sql.build('coalesce(  ',h.smsDate, '> (', sql.query({
                            select: () => [sql.build('max(', f.courierAssingTime, ')')],
                            from: f,
                            where: helperFamilies(() => [sql.not(sql.in(f.deliverStatus, DeliveryStatus.Frozen.id, DeliveryStatus.NotInEvent.id))]).where
                        }), ") + interval '-1' day,false) as ", this.gotSms)

                    ],
                    from: h
                });
            }
        });
    }
}