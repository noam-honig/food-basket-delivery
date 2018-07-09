import { ServerAction } from "../auth/server-action";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { Families, DeliveryStatus, Helpers } from "../models";
import { Location } from '../shared/googleApiHelpers';


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
        let f = new Families();



        let existingFamilies = await f.source.find({ where: f.courier.isEqualTo(result.helperId).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id)) });

        {
            let where = f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.basketType.isEqualTo(info.basketType)));
            if (info.language > -1)
                where = where.and(f.language.isEqualTo(info.language));
            if (info.city) {
                where = where.and(f.city.isEqualTo(info.city));
            }
            let r = await f.source.find({ where });
            if (r.length > 0) {
                if (existingFamilies.length == 0) {
                    let position = Math.trunc(Math.random() * r.length);
                    let family = r[position];
                    family.courier.value = result.helperId;
                    await family.doSave(req.authInfo);
                    result.ok = true;
                }
                else {
                    let getDistanceBetweenPoints = (x: Location, center: Location) => {
                        return Math.abs(((x.lat - center.lat) * (x.lat - center.lat)) + Math.abs((x.lng - center.lng) * (x.lng - center.lng))) * 10000000
                    }
                    let getDistance = (x: Location) => {
                        let r = -1;
                        existingFamilies.forEach(ef => {
                            let loc = ef.getGeocodeInformation().location();
                            if (loc) {
                                let dis = getDistanceBetweenPoints(x, loc);
                                if (r == -1 || dis < r)
                                    r = dis;
                            }
                        });
                        return r;

                    }

                    r = r.sort((a, b) => {
                        let locA = a.getGeocodeInformation().location();
                        let locB = b.getGeocodeInformation().location();
                        if (!locA)
                            if (locB)
                                return -2;
                            else return 0;
                        if (!locB)
                            return 1;
                        let aVal = getDistance(locA);
                        let bVal = getDistance(locB);
                        return aVal - bVal;
                    });

                    r[0].courier.value = result.helperId;

                    await r[0].doSave(req.authInfo);

                    result.ok = true;
                }


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
    city: string;
}
export interface AddBoxResponse {
    helperId?: string;
    ok: boolean;

}