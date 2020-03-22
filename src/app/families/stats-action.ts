import { ServerFunction, StringColumn, NumberColumn, Entity } from '@remult/core';
import { FilterBase } from '@remult/core';
import { Families } from "./families";
import { DeliveryStatus } from "./DeliveryStatus";

import { YesNo } from "./YesNo";
import { BasketType } from "./BasketType";
import { Context, EntityClass } from '@remult/core';
import { BasketInfo } from "../asign-family/asign-family.component";

import { SqlBuilder } from "../model-shared/types";
import { Roles } from "../auth/roles";
import { Groups } from "../manage/manage.component";


export interface OutArgs {
    data: any;
    baskets: BasketInfo[];

}
export const colors = {
    yellow: '#FDE098'//yello
    , orange: '#FAC090'//orange
    , blue: '#84C5F1'//blue
    , green: '#91D7D7'//green
    , red: '#FD9FB3'//red
    , gray: 'gray'
};
export class Stats {
    ready = new FaimilyStatistics('טרם שוייכו',
        f => f.readyFilter().and(
            f.special.isDifferentFrom(YesNo.Yes))
        , colors.yellow);
    selfPickup = new FaimilyStatistics('באים לקחת', f => f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup), colors.orange);
    special = new FaimilyStatistics('מיוחדים שטרם שוייכו',
        f => f.readyFilter().and(
            f.special.isEqualTo(YesNo.Yes))
        , colors.orange);

    onTheWay = new FaimilyStatistics('בדרך', f => f.onTheWayFilter(), colors.blue);
    delivered = new FaimilyStatistics('הגיעו', f => f.deliverStatus.isSuccess(), colors.green);
    problem = new FaimilyStatistics('בעיות', f => f.deliverStatus.isProblem(), colors.red);
    currentEvent = new FaimilyStatistics('באירוע', f => f.deliverStatus.isDifferentFrom(DeliveryStatus.NotInEvent).and(f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList)), colors.green);
    outOfList = new FaimilyStatistics('הוצאו מהרשימות', f => f.deliverStatus.isEqualTo(DeliveryStatus.RemovedFromList), colors.green);
    notInEvent = new FaimilyStatistics('לא באירוע', f => f.deliverStatus.isEqualTo(DeliveryStatus.NotInEvent), colors.blue);
    frozen = new FaimilyStatistics('קפואים', f => f.deliverStatus.isEqualTo(DeliveryStatus.Frozen), colors.gray);
    blocked = new FaimilyStatistics('סל חסום', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(f.courier.isEqualTo('').and(f.blockedBasket.isEqualTo(true))), colors.gray);
    needWork = new FaimilyStatistics('מצריך טיפול', f => f.deliverStatus.isInEvent().and( f.needsWork.isEqualTo(true)), colors.yellow);


    async getData() {
        let r = await Stats.getDataFromServer();
        for (let s in this) {
            let x: any = this[s];
            if (x instanceof FaimilyStatistics) {
                x.loadFrom(r.data);
            }
        }
        return r;
    }
    @ServerFunction({ allowed: Roles.admin })
    static async getDataFromServer(context?: Context) {
        let result = { data: {}, baskets: [], cities: [], groups: [] as groupStats[] };
        let stats = new Stats();
        let pendingStats = [];
        for (let s in stats) {
            let x = stats[s];
            if (x instanceof FaimilyStatistics) {
                pendingStats.push(x.saveTo(result.data, context));
            }
        }




        pendingStats.push(context.for(BasketType).foreach(undefined, async  b => {
            result.baskets.push({
                id: b.id.value,
                name: b.name.value,
                boxes: b.boxes.value,
                boxes2:b.boxes2.value,
                blocked: b.blocked.value,
                unassignedFamilies: await context.for(Families).count(f => f.readyAndSelfPickup().and(f.basketType.isEqualTo(b.id))),
                inEventFamilies: await context.for(Families).count(f => f.deliverStatus.isInEvent().and(f.basketType.isEqualTo(b.id))),
                successFamilies: await context.for(Families).count(f => f.deliverStatus.isSuccess().and(f.basketType.isEqualTo(b.id)))
            });
        }));
        pendingStats.push(
            context.for(CitiesStats).find({
                orderBy: f => [{ column: f.families, descending: true }]
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
            limit:1000,
            orderBy: f => [{ column: f.name }]
        }).then(groups => {
            for (const g of groups) {
                let x: groupStats = {
                    name: g.name.value,
                    total: 0,
                    totalReady: 0
                };
                result.groups.push(x);
                pendingStats.push(context.for(Families).count(f => f.readyAndSelfPickup().and(f.groups.isContains(x.name))).then(r => x.totalReady = r));
                pendingStats.push(context.for(Families).count(f => f.groups.isContains(x.name).and(f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList))).then(r => x.total = r));
            }
        });


        await Promise.all(pendingStats);
        
        return result;
    }
}
@EntityClass
export class CitiesStats extends Entity<string> {
    city = new StringColumn();
    families = new NumberColumn();
    constructor(context: Context) {
        super({
            allowApiRead: false,
            name: 'citiesStats',
            dbName: () => {
                let f = context.for( Families).create();
                let sql = new SqlBuilder();
                sql.addEntity(f, 'Families');
                return sql.build('(', sql.query({
                    select: () => [f.city, sql.columnWithAlias("count(*)", this.families)],
                    from: f,
                    where: () => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery),
                    sql.eq(f.courier, '\'\''),
                    f.blockedBasket.defs.dbName + ' = false']
                }), ' group by ', f.city, ') as result')
            }
        });
    }
}

export class FaimilyStatistics {
    constructor(public name: string, public rule: (f: Families) => FilterBase, public color?: string, value?: number) {
        this.value = value;
    }

    value = 0;
    async saveTo(data: any, context: Context) {

        data[this.name] = await context.for(Families).count(f => this.rule(f)).then(c => this.value = c);
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
