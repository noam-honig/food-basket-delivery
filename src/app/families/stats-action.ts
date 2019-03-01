import { RunOnServer } from "../auth/server-action";
import { FilterBase } from "radweb";
import { Families } from "./families";
import { DeliveryStatus } from "./DeliveryStatus";
import { CallStatus } from "./CallStatus";
import { YesNo } from "./YesNo";
import { BasketType } from "./BasketType";
import { Context } from "../shared/context";
import { BasketInfo } from "../asign-family/asign-family.component";

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
    ready = new FaimilyStatistics('טרם שוייכו', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.special.IsDifferentFrom(YesNo.Yes.id))), colors.yellow);
    special = new FaimilyStatistics('מיוחדים שטרם שוייכו', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.special.isEqualTo(YesNo.Yes.id))), colors.orange);
    onTheWay = new FaimilyStatistics('בדרך', f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.IsDifferentFrom('')), colors.blue);
    delivered = new FaimilyStatistics('הגיעו', f => f.deliverStatus.isEqualTo(DeliveryStatus.Success.id), colors.green);
    problem = new FaimilyStatistics('בעיות', f => f.deliverStatus.IsGreaterOrEqualTo(DeliveryStatus.FailedBadAddress.id).and(f.deliverStatus.IsLessOrEqualTo(DeliveryStatus.FailedOther.id)), colors.red);
    currentEvent = new FaimilyStatistics('באירוע', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id), colors.green);
    notInEvent = new FaimilyStatistics('לא באירוע', f => f.deliverStatus.isEqualTo(DeliveryStatus.NotInEvent.id), colors.blue);
    frozen = new FaimilyStatistics('קפואים', f => f.deliverStatus.isEqualTo(DeliveryStatus.Frozen.id), colors.gray);
    deliveryComments = new FaimilyStatistics('הערות משנע', f => f.courierComments.IsDifferentFrom(''), colors.yellow);
  //  phoneComments = new FaimilyStatistics('הערות טלפנית', f => f.callComments.IsDifferentFrom(''), colors.orange);
//    phoneReady = new FaimilyStatistics('ממתינה לשיחה', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.NotYet.id).and(f.callHelper.isEqualTo(''))), colors.yellow);
    //phoneAssigned = new FaimilyStatistics('משוייכת לטלפנית', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.NotYet.id).and(f.callHelper.IsDifferentFrom(''))), colors.blue);
    //phoneOk = new FaimilyStatistics('בוצעה שיחה', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.Success.id)), colors.green);
    //phoneFailed = new FaimilyStatistics('לא השגנו', f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.callStatus.isEqualTo(CallStatus.Failed.id)), colors.red);

    async getData() {
        let r = await Stats.getDataFromServer();
        for (let s in this) {
            let x:any = this[s];
            if (x instanceof FaimilyStatistics) {
                x.loadFrom(r.data);
            }
        }
        return r.baskets;
    }
    @RunOnServer({ allowed: c => c.isAdmin() })
    static async getDataFromServer(context?: Context) {
        let result = { data: {}, baskets: [] };
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
                unassignedFamilies: await context.for(Families).count(f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(
                    f.basketType.isEqualTo(b.id).and(
                        f.courier.isEqualTo('')
                    )
                ))
            });
        }));
        await Promise.all(pendingStats);
        result.baskets = result.baskets.filter(b => b.unassignedFamilies > 0);
        result.baskets.sort((a, b) => b.unassignedFamilies - a.unassignedFamilies);
        return result;
    }
}



export class FaimilyStatistics {
    constructor(public name: string, public rule: (f: Families) => FilterBase, public color: string) {

    }

    value = 0;
    async saveTo(data: any, context: Context) {

        data[this.name] = await context.for(Families).count(f => this.rule(f)).then(c => this.value = c);
    }
    async loadFrom(data: any) {
        this.value = data[this.name];
    }
}

