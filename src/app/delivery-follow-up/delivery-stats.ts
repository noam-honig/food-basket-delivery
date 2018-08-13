import { ServerAction } from "../auth/server-action";
import { DataApiRequest, FilterBase } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import {  HelpersAndStats } from "../models";
import { colors } from "../families/stats-action";
import { DateTimeColumn } from "radweb";


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
    statistics: DeliveryStatistic[] = [
        this.onTheWay,
        this.late,
        this.delivered,
        this.problem,

    ];
    async getData() {
        let r = await new DeliveryStatsAction().run({});
        this.statistics.forEach(x => x.loadFrom(r.data));
    }
}

export class DeliveryStatsAction extends ServerAction<InArgs, OutArgs>{
    constructor() {
        super('DeliveryStatsAction');//required because of minification
    }
    protected async execute(info: InArgs, req: DataApiRequest<myAuthInfo>): Promise<OutArgs> {

        let result = { data: {} };
        let stats = new DeliveryStats();
        await Promise.all(stats.statistics.map(x => x.saveTo(result.data)));
        return result;


    }

}

export class DeliveryStatistic {
    constructor(public name: string, public rule: (f: HelpersAndStats) => FilterBase, public color: string) {

    }

    value = 0;
    async saveTo(data: any) {
        let f = new HelpersAndStats();
        data[this.name] = await f.source.count(this.rule(f)).then(c => this.value = c);
    }
    async loadFrom(data: any) {
        this.value = data[this.name];
    }
}

