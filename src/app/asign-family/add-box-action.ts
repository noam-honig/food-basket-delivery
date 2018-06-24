import { ServerAction } from "../auth/server-action";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { Families, DeliveryStatus, Helpers } from "../models";


export class AddBoxAction extends ServerAction<AddBoxInfo, AddBoxResponse>{
    constructor() {
        super('add-box');//required because of minification
    }
    protected async execute(info: AddBoxInfo, req: DataApiRequest<myAuthInfo>): Promise<AddBoxResponse> {
        let result = {
            helperId: info.helperId,
            ok: false
        }

        let h = new Helpers();
        if (!info.helperId) {
            let r = await h.source.find({ where: h.phone.isEqualTo(info.phone) });
            if (r.length == 0) {
                h.phone.value = info.phone;
                h.name.value = info.name;
                await h.save();
                result.helperId = h.id.value;
            }
        }

        {
            let f = new Families();
            let where = f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.basketType.isEqualTo(info.basketType)));
            if (info.language > -1)
                where = where.and(f.language.isEqualTo(info.language));
            let r = await f.source.find({ where });
            if (r.length > 0) {
                r[0].courier.value = result.helperId;
                await r[0].save();
                result.ok = true;
            }
        }
        return result;


    }
}

export interface AddBoxInfo {
    name: string;
    basketType: string;
    phone: string;
    language: number;
    helperId?: string;
}
export interface AddBoxResponse {
    helperId?: string;
    ok: boolean;

}