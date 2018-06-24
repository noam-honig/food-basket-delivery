import { ServerAction } from "../auth/server-action";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { Families, DeliveryStatus, Helpers, BasketType } from "../models";
import { foreachSync } from "../shared/utils";


export class GetBasketStatusAction extends ServerAction<GetBasketStatusActionInfo, GetBasketStatusActionResponse>{
    constructor() {
        super('GetBasketStatusAction');//required because of minification
    }
    protected async execute(info: GetBasketStatusActionInfo, req: DataApiRequest<myAuthInfo>): Promise<GetBasketStatusActionResponse> {
        let result = {
            baskets: []
        };
        let hash: any = {};
        let f = new Families();
        let r = await f.source.find({ where: f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('')) });
        r.forEach(cf => {
            let bi = hash[cf.basketType.value];
            if (!bi) {
                bi = {
                    id: cf.basketType.value,
                    unassignedFamilies: 0
                };
                hash[cf.basketType.value] = bi;
                result.baskets.push(bi);
            }
            bi.unassignedFamilies++;

        });
        await foreachSync(result.baskets,
            async b => {
                if (b.id) {
                    b.name = (await f.lookupAsync(new BasketType(), bt => bt.id.isEqualTo(b.id))).name.value;
                }
                else
                    b.name = "סל לא הוגדר";
            });
        return result;


    }
}

export interface GetBasketStatusActionInfo {

}
export interface GetBasketStatusActionResponse {
    baskets: BasketInfo[];
}
export interface BasketInfo {
    name: string;
    id: string;
    unassignedFamilies: number;

}