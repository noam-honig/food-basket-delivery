import { ServerAction } from "../auth/server-action";
import { DataApiRequest, FilterBase } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { Families, DeliveryStatus, Helpers, DeliveryEvents, FamilyDeliveryEvents, CallStatus } from "../models";
import * as fetch from 'node-fetch';
import { foreachSync } from "../shared/utils";
import { evilStatics } from "../auth/evil-statics";
import { PostgresDataProvider } from "../../../node_modules/radweb/server";
import { Column } from "../../../node_modules/radweb";


export interface InArgs {

}
export interface OutArgs {
    data: any;

}

export class Stats {
    ready = new FaimilyStatistics('טרם שוייכו', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('')));
    onTheWay = new FaimilyStatistics('שוייכו וטרם נמסרו', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.IsDifferentFrom('')));
    delivered = new FaimilyStatistics('נמסרו', f => f.deliverStatus.isEqualTo(DeliveryStatus.Success.id));
    problem = new FaimilyStatistics('בעיות מסירה', f => f.deliverStatus.IsGreaterOrEqualTo(DeliveryStatus.FailedBadAddress.id).and(f.deliverStatus.IsLessOrEqualTo(DeliveryStatus.FailedOther.id)));
    statistics: FaimilyStatistics[] = [
        new FaimilyStatistics('כל המשפחות', f => undefined),
        new FaimilyStatistics('באירוע הנוכחי', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id)),
        new FaimilyStatistics('לא באירוע הנוכחי', f => f.deliverStatus.isEqualTo(DeliveryStatus.NotInEvent.id)),
        this.ready,
        this.onTheWay,
        this.delivered,
        this.problem,
        new FaimilyStatistics('משפחות עם הערות משנע', f => f.courierComments.IsDifferentFrom('')),
        new FaimilyStatistics('משפחות עם הערות טלפנית', f => f.callComments.IsDifferentFrom('')),
        new FaimilyStatistics('ללא קפואים', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.Frozen.id).and(f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id))),
        new FaimilyStatistics('קפואים', f => f.deliverStatus.isEqualTo(DeliveryStatus.Frozen.id))
    ];
    async getData() {
        let r = await new StatsAction().run({});
        this.statistics.forEach(x => x.loadFrom(r.data));
    }
}

export class StatsAction extends ServerAction<InArgs, OutArgs>{
    constructor() {
        super('StatsAction');//required because of minification
    }
    protected async execute(info: InArgs, req: DataApiRequest<myAuthInfo>): Promise<OutArgs> {

        let result = { data: {} };
        let stats = new Stats();
        await Promise.all(stats.statistics.map(x => x.saveTo(result.data)));
        return result;


    }

}
export class FaimilyStatistics {
    constructor(public name: string, public rule: (f: Families) => FilterBase) {

    }

    value = 0;
    async saveTo(data: any) {
        let f = new Families();
        data[this.name] = await f.source.count(this.rule(f)).then(c => this.value = c);
    }
    async loadFrom(data: any) {
        this.value = data[this.name];
    }
}

