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
        let center: Location;
        {
            let sumLong = 0;
            let sumLat = 0;
            let count = 0;
            let existingFamilies = await f.source.find({ where: f.courier.isEqualTo(result.helperId).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id)) });
            existingFamilies.forEach(ef => {
                count++;
                sumLat += ef.getGeocodeInformation().location().lat;
                sumLong += ef.getGeocodeInformation().location().lng;
            });
            if (count > 0)
                center = {
                    lat: sumLat / count,
                    lng: sumLong / count
                };

        }

        {
            let where = f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('').and(f.basketType.isEqualTo(info.basketType)));
            if (info.language > -1)
                where = where.and(f.language.isEqualTo(info.language));
            let r = await f.source.find({ where });
            if (r.length > 0) {
                if (!center) {
                    let position = Math.trunc(Math.random() * r.length);
                    let family = r[position];
                    family.courier.value = result.helperId;
                    await family.save();
                    result.ok = true;
                }
                else {
                    let getDistance = (x: Location) => {
                        return ((x.lat - center.lat) * (x.lat - center.lat) + (x.lng - center.lng) * (x.lng - center.lng)) * 10000000
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
                
                    await r[0].save();
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
}
export interface AddBoxResponse {
    helperId?: string;
    ok: boolean;

}