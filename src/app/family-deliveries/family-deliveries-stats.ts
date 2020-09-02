
import { FilterBase, AndFilter, Context, ServerFunction, EntityClass, Entity, StringColumn, NumberColumn, SqlDatabase } from "@remult/core";
import { Roles } from "../auth/roles";
import { YesNo } from "../families/YesNo";
import { BasketType } from "../families/BasketType";
import { FamilyDeliveries, ActiveFamilyDeliveries, MessageStatus } from "../families/FamilyDeliveries";
import { Families } from "../families/families";
import { SqlBuilder } from "../model-shared/types";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { DistributionCenterId, allCentersToken } from "../manage/distribution-centers";
import { Groups } from "../manage/groups";
import { colors } from "../families/stats-action";
import { getLang } from '../sites/sites';

export class FamilyDeliveryStats {
    constructor(private context:Context)
    {}
    ready = new FamilyDeliveresStatistics(getLang(this.context).unAsigned,
        f => f.readyFilter().and(
            f.special.isDifferentFrom(YesNo.Yes))
        , colors.yellow);
    selfPickup = new FamilyDeliveresStatistics(getLang(this.context).selfPickup, f => f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup), colors.orange);
    special = new FamilyDeliveresStatistics(getLang(this.context).specialUnasigned,
        f => f.readyFilter().and(
            f.special.isEqualTo(YesNo.Yes))
        , colors.orange);

    onTheWay = new FamilyDeliveresStatistics(getLang(this.context).onTheWay, f => f.onTheWayFilter(), colors.blue);
    delivered = new FamilyDeliveresStatistics(getLang(this.context).delveriesSuccesfull, f => f.deliverStatus.isSuccess(), colors.green);
    problem = new FamilyDeliveresStatistics(getLang(this.context).problems, f => f.deliverStatus.isProblem(), colors.red);
    frozen = new FamilyDeliveresStatistics(getLang(this.context).frozens, f => f.deliverStatus.isEqualTo(DeliveryStatus.Frozen), colors.gray);
    needWork = new FamilyDeliveresStatistics(getLang(this.context).requireFollowUp, f => f.needsWork.isEqualTo(true), colors.yellow);


    async getData(distCenter: string) {
        let r = await FamilyDeliveryStats.getFamilyDeliveryStatsFromServer(distCenter);
        for (let s in this) {
            let x: any = this[s];
            if (x instanceof FamilyDeliveresStatistics) {
                x.loadFrom(r.data);
            }
        }
        return r;
    }
    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async getFamilyDeliveryStatsFromServer(distCenter: string, context?: Context, db?: SqlDatabase) {
        let result = {
            data: {}, baskets: [] as {
                id: string,
                name: string,
                boxes: number,
                boxes2: number,
                unassignedDeliveries: number,
                inEventDeliveries: number,
                successDeliveries: number,
                smsNotSent:number,
                
                selfPickup:number,
            }[], cities: []
        };
        let stats = new FamilyDeliveryStats(context);
        let pendingStats = [];
        for (let s in stats) {
            let x = stats[s];
            if (x instanceof FamilyDeliveresStatistics) {
                pendingStats.push(x.saveTo(distCenter, result.data, context));
            }
        }

        let f = context.for(ActiveFamilyDeliveries).create();
        let sql = new SqlBuilder();
        sql.addEntity(f,"FamilyDeliveries")
        let baskets = await db.execute(sql.build(sql.query({
            select: () => [f.basketType,
            sql.build('sum (', sql.case([{ when: [f.readyAndSelfPickup()], then: f.quantity }], 0), ') a'),
            sql.build('sum (', f.quantity, ') b'),
            sql.build('sum (', sql.case([{ when: [f.deliverStatus.isSuccess()], then: f.quantity }], 0), ') c'),
            sql.build('sum (', sql.case([{ when: [f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup)], then: f.quantity }], 0), ') d'),
            sql.build('sum (', sql.case([{ when: [f.onTheWayFilter().and(f.messageStatus.isEqualTo(MessageStatus.notSent))], then: f.quantity }], 0), ') e')
            
            ],
            from: f,
            where: () => [f.filterDistCenterAndAllowed(distCenter)]
        }), ' group by ', f.basketType));
        for (const r of baskets.rows) {
            let basketId = r[baskets.getColumnKeyInResultForIndexInSelect(0)];
            let b = await context.for(BasketType).lookupAsync(b=>b.id.isEqualTo(basketId));
            result.baskets.push({
                id: basketId,
                name: b.name.value,
                boxes: b.boxes.value,
                boxes2: b.boxes2.value,
                unassignedDeliveries: +r['a'],
                inEventDeliveries: +r['b'],
                successDeliveries: +r['c'],
                selfPickup:+r['d'],
                smsNotSent:+r['e']
                
            });
        }



        if (distCenter == allCentersToken)
            pendingStats.push(
                context.for(CitiesStats).find({
                    orderBy: f => [{ column: f.deliveries, descending: true }]
                }).then(cities => {
                    result.cities = cities.map(x => {
                        return {
                            name: x.city.value,
                            count: x.deliveries.value
                        }
                    });
                })
            );
        else
            pendingStats.push(
                context.for(CitiesStatsPerDistCenter).find({
                    orderBy: f => [{ column: f.families, descending: true }],
                    where: f => f.distributionCenter.filter(distCenter)

                }).then(cities => {
                    result.cities = cities.map(x => {
                        return {
                            name: x.city.value,
                            count: x.families.value
                        }
                    });
                })
            );
      


        await Promise.all(pendingStats);

        return result;
    }
}

export class FamilyDeliveresStatistics {
    constructor(public name: string, public rule: (f: ActiveFamilyDeliveries) => FilterBase, public color?: string, value?: number) {
        this.value = value;
    }

    value = 0;
    async saveTo(distCenter: string, data: any, context: Context) {
        try{

        data[this.name] = await context.for(ActiveFamilyDeliveries).count(f => new AndFilter(this.rule(f), f.filterDistCenterAndAllowed(distCenter))).then(c => this.value = c);
        }
        catch(err){
            console.error(this.name,err);
        }
    }
    async loadFrom(data: any) {
        this.value = data[this.name];
    }
}
export interface groupStats {
    name: string,
    totalReady: number

}
@EntityClass
export class CitiesStats extends Entity<string> {
    city = new StringColumn();
    deliveries = new NumberColumn();
    constructor(context: Context) {
        super({
            allowApiRead: false,
            name: 'citiesStats',
            dbName: () => {
                let f = context.for(ActiveFamilyDeliveries).create();
                let sql = new SqlBuilder();

                return sql.build('(', sql.query({
                    select: () => [f.city, sql.columnWithAlias("count(*)", this.deliveries)],
                    from: f,
                    where: () => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery),
                    f.distributionCenter.isAllowedForUser(),
                    sql.eq(f.courier, '\'\'')]
                }).replace('as result', 'as '), ' group by ', f.city, ') as result')
            }
        });
    }
}
@EntityClass
export class CitiesStatsPerDistCenter extends Entity<string> {
    city = new StringColumn();
    distributionCenter = new DistributionCenterId(this.context);
    families = new NumberColumn();
    constructor(private context: Context) {
        super({
            allowApiRead: false,
            name: 'citiesStatsPerDistCenter',
            dbName: () => {
                let f = context.for(ActiveFamilyDeliveries).create();
                let sql = new SqlBuilder();

                return sql.build('(', sql.query({
                    select: () => [f.city, f.distributionCenter, sql.columnWithAlias("count(*)", this.families)],
                    from: f,
                    where: () => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery),
                    f.distributionCenter.isAllowedForUser(),
                    sql.eq(f.courier, '\'\'')]
                }).replace('as result', 'as '), ' group by ', [f.city, f.distributionCenter], ') as result')
            }
        });
    }
}