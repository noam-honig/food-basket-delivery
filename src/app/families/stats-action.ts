import { ServerAction } from "../auth/server-action";
import { DataApiRequest, FilterBase } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { Families, DeliveryStatus, Helpers, DeliveryEvents, FamilyDeliveryEvents, CallStatus } from "../models";
import * as fetch from 'node-fetch';
import { foreachSync } from "../shared/utils";
import { evilStatics } from "../auth/evil-statics";
import { PostgresDataProvider } from "../../../node_modules/radweb/server";
import { Column, Filter } from "../../../node_modules/radweb";


export interface InArgs {

}
export interface OutArgs {
    data: any;

}

export class Stats {
    ready = new FaimilyStatistics('מוכנות', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('')));
    onTheWay = new FaimilyStatistics('בדרך', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.IsDifferentFrom('')));
    delivered = new FaimilyStatistics('הגיעו', f => f.deliverStatus.isEqualTo(DeliveryStatus.Success.id));
    problem = new FaimilyStatistics('בעיות', f => f.deliverStatus.IsGreaterOrEqualTo(DeliveryStatus.FailedBadAddress.id).and(f.deliverStatus.IsLessOrEqualTo(DeliveryStatus.FailedOther.id)));
    currentEvent = new FaimilyStatistics('באירוע', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id));
    notInEvent = new FaimilyStatistics('לא באירוע', f => f.deliverStatus.isEqualTo(DeliveryStatus.NotInEvent.id));
    frozen = new FaimilyStatistics('קפואים', f => f.deliverStatus.isEqualTo(DeliveryStatus.Frozen.id));
    deliveryComments = new FaimilyStatistics('הערות משנע', f => f.courierComments.IsDifferentFrom(''));
    phoneComments = new FaimilyStatistics('הערות טלפנית', f => f.callComments.IsDifferentFrom(''));
    phoneReady = new FaimilyStatistics('ממתינה לשיחה', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.NotYet.id).and(f.callHelper.isEqualTo(''))));
    phoneAssigned = new FaimilyStatistics('משוייכת לטלפנית', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.NotYet.id).and(f.callHelper.IsDifferentFrom(''))));
    phoneOk = new FaimilyStatistics('בוצעה שיחה', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.Success.id)));
    phoneFailed = new FaimilyStatistics('לא השגנו', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.Failed.id)));
    statistics: FaimilyStatistics[] = [
        new FaimilyStatistics('כל המשפחות', f => undefined),
        this.currentEvent,
        this.notInEvent,
        this.ready,
        this.onTheWay,
        this.delivered,
        this.problem,
        this.frozen,
        this.deliveryComments,
        this.phoneComments,
        this.phoneReady,
        this.phoneAssigned,
        this.phoneOk,
        this.phoneFailed
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

