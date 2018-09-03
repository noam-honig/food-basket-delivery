import { RunOnServer } from "../auth/server-action";
import { FilterBase } from "radweb/utils/dataInterfaces1";

import { HelpersAndStats } from "./HelpersAndStats";
import { colors } from "../families/stats-action";
import { DateTimeColumn } from "radweb";
import { Context } from "../shared/context";


export interface InArgs {

}
export interface OutArgs {
    data: any;

}
export class DeliveryStats {
    onTheWay = new DeliveryStatistic('בדרך', f => f.deliveriesInProgress.IsGreaterOrEqualTo(1).and(f.firstDeliveryInProgressDate.IsGreaterThan(DateTimeColumn.dateToString(new Date(new Date().valueOf() - 3600000 * 1.5)))), colors.blue);
    late = new DeliveryStatistic('מתעכבים', f => f.deliveriesInProgress.IsGreaterOrEqualTo(1).and(f.firstDeliveryInProgressDate.IsLessOrEqualTo(DateTimeColumn.dateToString(new Date(new Date().valueOf() - 3600000 * 1.5)))), colors.yellow);
    delivered = new DeliveryStatistic('סיימו', f => f.deliveriesInProgress.isEqualTo(0).and(f.deliveriesWithProblems.isEqualTo(0)).and(f.allFamilies.IsGreaterOrEqualTo(1)), colors.green);
    problem = new DeliveryStatistic('בעיות', f => f.deliveriesWithProblems.IsGreaterOrEqualTo(1), colors.red);

    async getData() {
        let r = await DeliveryStats.getTheStats();
        for (let s in this) {
            let x: any = this[s];
            if (x instanceof DeliveryStatistic) {
                x.loadFrom(r.data);
            }
        }
    }
    @RunOnServer({ allowed: c => c.isAdmin() })
    static async getTheStats(context?: Context) {
        let result = { data: {} };
        let stats = new DeliveryStats();
        let pending = [];
        for (let s in stats) {
            let x = stats[s];
            if (x instanceof DeliveryStatistic) {
                pending.push(x.saveTo(result.data, context));
            }
        }
        await Promise.all(pending);
        return result;
    }
}

export class DeliveryStatistic {
    constructor(public name: string, public rule: (f: HelpersAndStats) => FilterBase, public color: string) {

    }

    value = 0;
    async saveTo(data: any, context: Context) {

        data[this.name] = await context.for(HelpersAndStats).count(f => this.rule(f)).then(c => this.value = c);
    }
    async loadFrom(data: any) {
        this.value = data[this.name];
    }
}

