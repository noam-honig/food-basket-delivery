import { DeliveryStatus } from "../families/DeliveryStatus";
import { NumberColumn,  BoolColumn } from '@remult/core';
import { HelperId, Helpers, HelpersBase } from '../helpers/helpers';
import {  SqlBuilder } from '../model-shared/types';


import { Context, EntityClass } from '@remult/core';
import { Roles } from "../auth/roles";
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { getLang } from '../sites/sites';




function log(s: string) {
    console.log(s);
    return s;
}
@EntityClass
export class HelpersAndStats extends HelpersBase {

    deliveriesInProgress = new NumberColumn({
        dbReadOnly: true,
        caption: getLang(this.context).delveriesInProgress
    });
    allDeliveires = new NumberColumn({
        dbReadOnly: true,
        caption: getLang(this.context).families
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
                        h.archive,
                        h.frozenTill,
                        h.internalComment,
                        h.leadHelper,
                        h.myGiftsURL,
                        
                        sql.countDistinctInnerSelect(f.family, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), this.deliveriesInProgress), 
                        sql.countInnerSelect(helperFamilies(() => [f.deliverStatus.isActiveDelivery()]), this.allDeliveires),

                    ],
                    from: h
                });
            }
        });
    }
} 