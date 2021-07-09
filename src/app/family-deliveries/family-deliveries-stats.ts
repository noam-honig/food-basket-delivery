
import { Filter, AndFilter, Context, BackendMethod, Entity, SqlDatabase, EntityBase, FilterFactories } from "@remult/core";
import { Roles } from "../auth/roles";
import { YesNo } from "../families/YesNo";
import { BasketType } from "../families/BasketType";
import { FamilyDeliveries, ActiveFamilyDeliveries, MessageStatus } from "../families/FamilyDeliveries";
import { Families } from "../families/families";
import { SqlBuilder, SqlFor } from "../model-shared/types";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { DistributionCenters } from "../manage/distribution-centers";
import { Groups } from "../manage/groups";
import { colors } from "../families/stats-action";
import { getLang } from '../sites/sites';
import { Field } from '../translate';
import { u } from "../model-shared/UberContext";

export class FamilyDeliveryStats {
    constructor(private context: Context) { }
    cContext = u(this.context);
    ready = new FamilyDeliveresStatistics(getLang(this.context).unAsigned,
        f => this.cContext.readyFilter(f).and(
            f.special.isDifferentFrom(YesNo.Yes))
        , colors.yellow);
    selfPickup = new FamilyDeliveresStatistics(getLang(this.context).selfPickup, f => f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup), colors.orange);
    special = new FamilyDeliveresStatistics(getLang(this.context).specialUnasigned,
        f => this.cContext.readyFilter(f).and(
            f.special.isEqualTo(YesNo.Yes))
        , colors.orange);

    onTheWay = new FamilyDeliveresStatistics(getLang(this.context).onTheWay, f => FamilyDeliveries.onTheWayFilter(f), colors.blue);
    delivered = new FamilyDeliveresStatistics(getLang(this.context).delveriesSuccesfull, f => DeliveryStatus.isSuccess(f.deliverStatus), colors.green);
    problem = new FamilyDeliveresStatistics(getLang(this.context).problems, f => DeliveryStatus.isProblem(f.deliverStatus), colors.red);
    frozen = new FamilyDeliveresStatistics(getLang(this.context).frozens, f => f.deliverStatus.isEqualTo(DeliveryStatus.Frozen), colors.gray);
    needWork = new FamilyDeliveresStatistics(getLang(this.context).requireFollowUp, f => f.needsWork.isEqualTo(true), colors.yellow);


    async getData(distCenter: DistributionCenters) {
        let r = await FamilyDeliveryStats.getFamilyDeliveryStatsFromServer(distCenter);
        for (let s in this) {
            let x: any = this[s];
            if (x instanceof FamilyDeliveresStatistics) {
                x.loadFrom(r.data);
            }
        }
        await Promise.all(r.baskets.map(async b => {
            b.basket = await BasketType.fromId(b.id, this.context);
        }))
        return r;
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getFamilyDeliveryStatsFromServer(distCenter: DistributionCenters, context?: Context, db?: SqlDatabase) {
        let cContext = u(context);
        let result = {
            data: {}, baskets: [] as {
                id: string,
                basket: BasketType,
                name: string,
                boxes: number,
                boxes2: number,
                unassignedDeliveries: number,
                inEventDeliveries: number,
                successDeliveries: number,
                smsNotSent: number,

                selfPickup: number,
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

        let f = SqlFor(context.for(ActiveFamilyDeliveries));

        let sql = new SqlBuilder();
        sql.addEntity(f, "FamilyDeliveries")
        let baskets = await db.execute(sql.build(sql.query({
            select: () => [f.basketType,
            sql.build('sum (', sql.case([{ when: [FamilyDeliveries.readyAndSelfPickup(f)], then: f.quantity }], 0), ') a'),
            sql.build('sum (', f.quantity, ') b'),
            sql.build('sum (', sql.case([{ when: [DeliveryStatus.isSuccess(f.deliverStatus)], then: f.quantity }], 0), ') c'),
            sql.build('sum (', sql.case([{ when: [f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup)], then: f.quantity }], 0), ') d'),
            sql.build('sum (', sql.case([{ when: [FamilyDeliveries.onTheWayFilter(f).and(f.messageStatus.isEqualTo(MessageStatus.notSent))], then: f.quantity }], 0), ') e')

            ],
            from: f,
            where: () => [cContext.filterDistCenter(f.distributionCenter, distCenter)]
        }), ' group by ', f.basketType));
        for (const r of baskets.rows) {
            let basketId = r[baskets.getColumnKeyInResultForIndexInSelect(0)];
            let b = await context.for(BasketType).findId(basketId, { createIfNotFound: true });
            result.baskets.push({
                id: basketId,
                name: b.name,
                boxes: b.boxes,
                boxes2: b.boxes2,
                unassignedDeliveries: +r['a'],
                inEventDeliveries: +r['b'],
                successDeliveries: +r['c'],
                selfPickup: +r['d'],
                smsNotSent: +r['e'],
                basket: undefined

            });
        }



        if (distCenter == null)
            pendingStats.push(
                context.for(CitiesStats).find({
                    orderBy: f => f.deliveries.descending()
                }).then(cities => {
                    result.cities = cities.map(x => {
                        return {
                            name: x.city,
                            count: x.deliveries
                        }
                    });
                })
            );
        else
            pendingStats.push(
                context.for(CitiesStatsPerDistCenter).find({
                    orderBy: f => f.families.descending(),
                    where: f => cContext.filterDistCenter(f.distributionCenter, distCenter)

                }).then(cities => {
                    result.cities = cities.map(x => {
                        return {
                            name: x.city,
                            count: x.families
                        }
                    });
                })
            );



        await Promise.all(pendingStats);

        return result;
    }
}

export class FamilyDeliveresStatistics {
    constructor(public name: string, public rule: (f: FilterFactories<ActiveFamilyDeliveries>) => Filter, public color?: string, value?: number) {
        this.value = value;
    }

    value = 0;
    async saveTo(distCenter: DistributionCenters, data: any, context: Context) {
        try {

            data[this.name] = await context.for(ActiveFamilyDeliveries).count(f => new AndFilter(this.rule(f), u(context).filterDistCenter(f.distributionCenter, distCenter))).then(c => this.value = c);
        }
        catch (err) {
            console.error(this.name, err);
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
@Entity<CitiesStats>({
    includeInApi: false,
    key: 'citiesStats',
    dbName: (self, context) => {
        let f = SqlFor(context.for(ActiveFamilyDeliveries));
        let sql = new SqlBuilder();

        return sql.build('(', sql.query({
            select: () => [f.city, sql.columnWithAlias("count(*)", self.deliveries)],
            from: f,
            where: () => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery),
            u(context).filterCenterAllowedForUser(f.distributionCenter),
            sql.eq(f.courier, '\'\'')]
        }).replace('as result', 'as '), ' group by ', f.city, ') as result')
    }
})
export class CitiesStats {
    @Field()
    city: string;
    @Field()
    deliveries: number;
}
@Entity<CitiesStatsPerDistCenter>({
    allowApiRead: false,
    key: 'citiesStatsPerDistCenter',
    dbName: (self, context) => {
        let f = SqlFor(context.for(ActiveFamilyDeliveries));
        let sql = new SqlBuilder();

        return sql.build('(', sql.query({
            select: () => [f.city, f.distributionCenter, sql.columnWithAlias("count(*)", self.families)],
            from: f,
            where: () => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery),
            u(context).filterCenterAllowedForUser(f.distributionCenter),
            sql.eq(f.courier, '\'\'')]
        }).replace('as result', 'as '), ' group by ', [f.city, f.distributionCenter], ') as result')
    }
})

export class CitiesStatsPerDistCenter extends EntityBase {
    @Field()
    city: string;
    @Field()
    distributionCenter: DistributionCenters;
    @Field()
    families: number;

}