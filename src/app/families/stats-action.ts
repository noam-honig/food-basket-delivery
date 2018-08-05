import { ServerAction } from "../auth/server-action";
import { DataApiRequest, FilterBase } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { Families, DeliveryStatus, Helpers, DeliveryEvents, FamilyDeliveryEvents, CallStatus, YesNo } from "../models";
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
export const colors={
    yellow:'#FDE098'//yello
    ,orange: '#FAC090'//orange
    ,blue: '#84C5F1'//blue
    ,green: '#91D7D7'//green
    ,red: '#FD9FB3'//red
    ,gray:'gray'
};
export class Stats {
    ready = new FaimilyStatistics('טרם שוייכו', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.special.IsDifferentFrom(YesNo.No.id))),colors.yellow);
    special = new FaimilyStatistics('מיוחדים שטרם שוייכו', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.special.isEqualTo(YesNo.Yes.id))),colors.orange);
    onTheWay = new FaimilyStatistics('בדרך', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.IsDifferentFrom('')),colors.blue);
    delivered = new FaimilyStatistics('הגיעו', f => f.deliverStatus.isEqualTo(DeliveryStatus.Success.id),colors.green);
    problem = new FaimilyStatistics('בעיות', f => f.deliverStatus.IsGreaterOrEqualTo(DeliveryStatus.FailedBadAddress.id).and(f.deliverStatus.IsLessOrEqualTo(DeliveryStatus.FailedOther.id)),colors.red);
    currentEvent = new FaimilyStatistics('באירוע', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id),colors.green);
    notInEvent = new FaimilyStatistics('לא באירוע', f => f.deliverStatus.isEqualTo(DeliveryStatus.NotInEvent.id),colors.blue);
    frozen = new FaimilyStatistics('קפואים', f => f.deliverStatus.isEqualTo(DeliveryStatus.Frozen.id),colors.gray);
    deliveryComments = new FaimilyStatistics('הערות משנע', f => f.courierComments.IsDifferentFrom(''),colors.yellow);
    phoneComments = new FaimilyStatistics('הערות טלפנית', f => f.callComments.IsDifferentFrom(''),colors.orange);
    phoneReady = new FaimilyStatistics('ממתינה לשיחה', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.NotYet.id).and(f.callHelper.isEqualTo(''))),colors.yellow);
    phoneAssigned = new FaimilyStatistics('משוייכת לטלפנית', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.NotYet.id).and(f.callHelper.IsDifferentFrom(''))),colors.blue);
    phoneOk = new FaimilyStatistics('בוצעה שיחה', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.Success.id)),colors.green);
    phoneFailed = new FaimilyStatistics('לא השגנו', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.Failed.id)),colors.red);
    statistics: FaimilyStatistics[] = [
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
    constructor(public name: string, public rule: (f: Families) => FilterBase,public color:string) {

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

