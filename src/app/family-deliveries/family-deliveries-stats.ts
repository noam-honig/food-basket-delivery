import { AllFamilyDeliveresIncludingHistory } from "./family-deliveries-join";
import { FilterBase, AndFilter, Context, ServerFunction, EntityClass, Entity, StringColumn, NumberColumn } from "@remult/core";
import { Roles } from "../auth/roles";
import { YesNo } from "../families/YesNo";
import { BasketType } from "../families/BasketType";
import { FamilyDeliveries } from "../families/FamilyDeliveries";
import { Families } from "../families/families";
import { SqlBuilder } from "../model-shared/types";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { DistributionCenterId } from "../manage/distribution-centers";
import { Groups } from "../manage/manage.component";
import { colors } from "../families/stats-action";

export class FamilyDeliveryStats {
    ready = new FamilyDeliveresStatistics('טרם שוייכו',
        f => f.readyFilter().and(
            f.special.isDifferentFrom(YesNo.Yes))
        , colors.yellow);
    selfPickup = new FamilyDeliveresStatistics('באים לקחת', f => f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup), colors.orange);
    special = new FamilyDeliveresStatistics('מיוחדים שטרם שוייכו',
        f => f.readyFilter().and(
            f.special.isEqualTo(YesNo.Yes))
        , colors.orange);

    onTheWay = new FamilyDeliveresStatistics('בדרך', f => f.onTheWayFilter(), colors.blue);
    delivered = new FamilyDeliveresStatistics('הגיעו', f => f.deliverStatus.isSuccess(), colors.green);
    problem = new FamilyDeliveresStatistics('בעיות', f => f.deliverStatus.isProblem(), colors.red);
    currentEvent = new FamilyDeliveresStatistics('באירוע', f => f.deliverStatus.isDifferentFrom(DeliveryStatus.NotInEvent).and(f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList)), colors.green);
    outOfList = new FamilyDeliveresStatistics('הוצאו מהרשימות', f => f.deliverStatus.isEqualTo(DeliveryStatus.RemovedFromList), colors.green);
    notInEvent = new FamilyDeliveresStatistics('לא באירוע', f => f.deliverStatus.isEqualTo(DeliveryStatus.NotInEvent), colors.blue);
    frozen = new FamilyDeliveresStatistics('קפואים', f => f.deliverStatus.isEqualTo(DeliveryStatus.Frozen), colors.gray);
    needWork = new FamilyDeliveresStatistics('מצריך טיפול', f => f.deliverStatus.isInEvent().and(f.needsWork.isEqualTo(true)), colors.yellow);


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
    static async getFamilyDeliveryStatsFromServer(distCenter: string, context?: Context) {
        let result = { data: {}, baskets: [], cities: [], groups: [] as groupStats[] };
        let stats = new FamilyDeliveryStats();
        let pendingStats = [];
        for (let s in stats) {
            let x = stats[s];
            if (x instanceof FamilyDeliveresStatistics) {
                pendingStats.push(x.saveTo(distCenter, result.data, context));
            }
        }




        pendingStats.push(context.for(BasketType).foreach(undefined, async  b => {
            result.baskets.push({
                id: b.id.value,
                name: b.name.value,
                boxes: b.boxes.value,
                boxes2: b.boxes2.value,
                unassignedDeliveries: await context.for(FamilyDeliveries).count(f => f.readyAndSelfPickup().and(f.basketType.isEqualTo(b.id).and(f.filterDistCenter(distCenter)))),
                inEventDeliveries: await context.for(FamilyDeliveries).count(f => f.deliverStatus.isInEvent().and(f.basketType.isEqualTo(b.id).and(f.filterDistCenter(distCenter)))),
                successDeliveries: await context.for(FamilyDeliveries).count(f => f.deliverStatus.isSuccess().and(f.basketType.isEqualTo(b.id).and(f.filterDistCenter(distCenter))))
            });
        }));
        if (distCenter == Families.allCentersToken)
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
        await context.for(Groups).find({
            limit: 1000,
            orderBy: f => [{ column: f.name }]
        }).then(groups => {
            for (const g of groups) {
                let x: groupStats = {
                    name: g.name.value,
                    total: 0,
                    totalReady: 0
                };
                result.groups.push(x);
                pendingStats.push(context.for(Families).count(f => f.readyAndSelfPickup().and(
                    f.groups.isContains(x.name).and(
                        f.filterDistCenter(distCenter)))).then(r => x.totalReady = r));
                pendingStats.push(context.for(Families).count(f => f.groups.isContains(x.name).and(
                    f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList)).and(f.filterDistCenter(distCenter))).then(r => x.total = r));
            }
        });


        await Promise.all(pendingStats);

        return result;
    }
}

export class FamilyDeliveresStatistics {
    constructor(public name: string, public rule: (f: AllFamilyDeliveresIncludingHistory) => FilterBase, public color?: string, value?: number) {
        this.value = value;
    }

    value = 0;
    async saveTo(distCenter: string, data: any, context: Context) {

        data[this.name] = await context.for(AllFamilyDeliveresIncludingHistory).count(f => new AndFilter(this.rule(f), f.filterDistCenter(distCenter))).then(c => this.value = c);
    }
    async loadFrom(data: any) {
        this.value = data[this.name];
    }
}
interface groupStats {
    name: string,
    totalReady: number,
    total: number
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
                let f = context.for(AllFamilyDeliveresIncludingHistory).create();
                let sql = new SqlBuilder();
                
                return sql.build('(', sql.query({
                    select: () => [f.city, sql.columnWithAlias("count(*)", this.deliveries)],
                    from: f,
                    where: () => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery),
                    f.distributionCenter.isAllowedForUser(),
                    sql.eq(f.courier, '\'\'')]
                }).replace('as result','as '), ' group by ', f.city, ') as result')
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
            name: 'citiesStats',
            dbName: () => {
                let f = context.for(AllFamilyDeliveresIncludingHistory).create();
                let sql = new SqlBuilder();
                
                return sql.build('(', sql.query({
                    select: () => [f.city, f.distributionCenter, sql.columnWithAlias("count(*)", this.families)],
                    from: f,
                    where: () => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery),
                    f.distributionCenter.isAllowedForUser(),
                    sql.eq(f.courier, '\'\'')]
                }).replace('as result','as '), ' group by ', [f.city, f.distributionCenter], ') as result')
            }
        });
    }
}