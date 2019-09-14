import { DeliveryStatus } from "../families/DeliveryStatus";
import { NumberColumn, StringColumn, IdEntity } from 'radweb';
import { HelperId, Helpers } from '../helpers/helpers';
import {  changeDate, DateTimeColumn,  SqlBuilder } from '../model-shared/types';
import { Families } from "../families/families";

import { Context,  EntityClass } from "radweb";
import { Roles } from "../auth/roles";




function log(s: string) {
    console.log(s);
    return s;
}
@EntityClass
export class HelpersAndStats extends Helpers {
  
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
    constructor(context: Context) {
        super(context, {
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
                        sql.countInnerSelect(helperFamilies(() => [f.deliverStatus.isEqualTo( DeliveryStatus.ReadyForDelivery)]), this.deliveriesInProgress),
                        sql.countInnerSelect(helperFamilies(() => [f.deliverStatus.isActiveDelivery()]), this.allFamilies),
                        sql.countInnerSelect(helperFamilies(() => [sql.in(f.deliverStatus,
                            DeliveryStatus.FailedBadAddress.id,
                            DeliveryStatus.FailedNotHome.id,
                            DeliveryStatus.FailedOther.id)]),
                            this.deliveriesWithProblems),
                        sql.max(f.courierAssingTime,
                            helperFamilies(() =>
                                [sql.not(sql.in(f.deliverStatus, DeliveryStatus.Frozen.id,DeliveryStatus.NotInEvent.id))]), this.lastAsignTime)

                    ],
                    from: h
                });
            }
        });
    }
}