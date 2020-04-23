import { DeliveryStatus } from "../families/DeliveryStatus";
import { NumberColumn,  BoolColumn } from '@remult/core';
import { HelperId, Helpers, HelpersBase } from '../helpers/helpers';
import { changeDate, DateTimeColumn, SqlBuilder } from '../model-shared/types';


import { Context, EntityClass } from '@remult/core';
import { Roles } from "../auth/roles";
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';




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
        super(context, {
            name: "helpersAndStats",
            allowApiRead: Roles.distCenterAdmin,
            dbName: () => {
                let f = context.for(ActiveFamilyDeliveries).create();
                let h = context.for( Helpers).create();
                var sql = new SqlBuilder();

                let helperFamilies = (where: () => any[]) => {
                    return {
                        from: f,
                        where: () => [f.distributionCenter.isAllowedForUser(),sql.eq(f.courier, h.id), ...where()]
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
                        h.eventComment,
                        h.needEscort,
                        h.theHelperIAmEscorting,
                        h.escort,
                        h.distributionCenter ,
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
                        }), ") ,false) as ", this.gotSms)

                    ],
                    from: h
                });
            }
        });
    }
}