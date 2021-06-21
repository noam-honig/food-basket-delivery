import { DeliveryStatus } from "../families/DeliveryStatus";
import { Entity } from '@remult/core';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { SqlBuilder, SqlFor } from '../model-shared/types';


import { Context } from '@remult/core';
import { Roles } from "../auth/roles";
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { getLang } from '../sites/sites';
import { use, Field } from "../translate";
import { u } from "../model-shared/UberContext";





function log(s: string) {
    console.log(s);
    return s;
}
@Entity<HelpersAndStats>({

    key: "helpersAndStats",
    allowApiRead: Roles.distCenterAdmin,

    dbName: (self, context) => {

        let f = SqlFor(context.for(ActiveFamilyDeliveries).metadata);

        let h = SqlFor(context.for(Helpers).metadata);
        var sql = new SqlBuilder();

        let helperFamilies = (where: () => any[]) => {
            return {
                from: f,
                where: () => [u(context).filterCenterAllowedForUser(f.distributionCenter), sql.eq(f.courier, h.id), ...where()]
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
                h.distributionCenter,
                h.archive,
                h.frozenTill,
                h.internalComment,
                h.leadHelper,
                h.myGiftsURL,

                sql.countDistinctInnerSelect(f.family, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), self.deliveriesInProgress),
                sql.countInnerSelect(helperFamilies(() => []), self.allDeliveires),

            ],
            from: h
        });
    }
})
export class HelpersAndStats extends HelpersBase {


    @Field({
        dbReadOnly: true,
        translation: l => l.delveriesInProgress
    })
    deliveriesInProgress: number;
    @Field({
        dbReadOnly: true,
        translation: l => l.families
    })
    allDeliveires: number;



    constructor(context: Context) {
        super(context);
    }
}