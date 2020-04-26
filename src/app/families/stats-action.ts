import { ServerFunction, StringColumn, NumberColumn, Entity, AndFilter } from '@remult/core';
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
import { DistributionCenterId } from '../manage/distribution-centers';
import { FamilyStatusColumn, FamilyStatus } from './FamilyStatus';


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
    outOfList = new FaimilyStatistics('הוצאו מהרשימות', f => f.status.isEqualTo(FamilyStatus.RemovedFromList), colors.green);
    active = new FaimilyStatistics('פעילות', f => f.status.isDifferentFrom(FamilyStatus.RemovedFromList), colors.blue);
    problem = new FaimilyStatistics('כתובות בעיתיות', f => f.status.isDifferentFrom(FamilyStatus.RemovedFromList).and(f.addressOk.isEqualTo(false)), colors.blue);

    async getData(distCenter: string) {
        let r = await Stats.getFamilyStats(distCenter);
        for (let s in this) {
            let x: any = this[s];
            if (x instanceof FaimilyStatistics) {
                x.loadFrom(r.data);
            }
        }
        return r;
    }
    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async getFamilyStats(distCenter: string, context?: Context) {
        let result = { data: {}, groups: [] as groupStats[] };
        let stats = new Stats();
        let pendingStats = [];
        for (let s in stats) {
            let x = stats[s];
            if (x instanceof FaimilyStatistics) {
                pendingStats.push(x.saveTo(distCenter, result.data, context));
            }
        }
        
        await context.for(Groups).find({
            limit: 1000,
            orderBy: f => [{ column: f.name }]
        }).then(groups => {
            for (const g of groups) {
                let x: groupStats = {
                    name: g.name.value,
                    total: 0
                };
                result.groups.push(x);
                pendingStats.push(context.for(Families).count(f => f.groups.isContains(x.name).and(
                    f.status.isDifferentFrom(FamilyStatus.RemovedFromList))).then(r => x.total = r));
            }
        });


        await Promise.all(pendingStats);

        return result;
    }
}



export class FaimilyStatistics {
    constructor(public name: string, public rule: (f: Families) => FilterBase, public color?: string, value?: number) {
        this.value = value;
    }

    value = 0;
    async saveTo(distCenter: string, data: any, context: Context) {

        data[this.name] = await context.for(Families).count(f => this.rule(f)).then(c => this.value = c);
    }
    async loadFrom(data: any) {
        this.value = data[this.name];
    }
}
interface groupStats {
    name: string,
    total: number
}
