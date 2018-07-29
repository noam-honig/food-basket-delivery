import * as fetch from 'node-fetch';
import { ServerAction } from "../auth/server-action";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { Families, DeliveryStatus, Helpers, YesNo } from "../models";
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';
import { UrlBuilder, ColumnHashSet } from "radweb";
import { foreachSync } from '../shared/utils';
import { BasketInfo, GetBasketStatusActionResponse, GetBasketStatusAction } from './get-basket-status-action';


export class AddBoxAction extends ServerAction<AddBoxInfo, AddBoxResponse>{
    constructor() {
        super('add-box');//required because of minification
    }

    protected async execute(info: AddBoxInfo, req: DataApiRequest<myAuthInfo>): Promise<AddBoxResponse> {
        let result: AddBoxResponse = {
            helperId: info.helperId,
            ok: false,
            shortUrl: undefined,
            families: [],
            basketInfo: undefined
        }

        let h = new Helpers();
        if (!info.helperId) {
            let r = await h.source.find({ where: h.phone.isEqualTo(info.phone) });
            if (r.length == 0) {
                h.phone.value = info.phone;
                h.name.value = info.name;
                await h.save();
                result.helperId = h.id.value;
                result.shortUrl = h.shortUrlKey.value;

            }
        }
        let f = new Families();



        let existingFamilies = await f.source.find({ where: f.courier.isEqualTo(result.helperId).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id)) });

        {
            let where = f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(
                f.courier.isEqualTo('').and(
                    f.basketType.isEqualTo(info.basketType).and(
                        f.special.IsDifferentFrom(YesNo.Yes.id)
                    )));
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
                    existingFamilies.push(family);
                }
                else {

                    let getDistance = (x: Location) => {
                        let r = -1;
                        existingFamilies.forEach(ef => {
                            let loc = ef.getGeocodeInformation().location();
                            if (loc) {
                                let dis = GeocodeInformation.GetDistanceBetweenPoints(x, loc);
                                if (r == -1 || dis < r)
                                    r = dis;
                            }
                        });
                        return r;

                    }
                    console.time('sort');

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
                    console.timeEnd('sort');
                    r[0].courier.value = result.helperId;

                    await r[0].doSave(req.authInfo);
                    existingFamilies.push(r[0]);
                    result.ok = true;
                }


            }
        }
        console.time('optimize');
        await AddBoxAction.optimizeRoute(existingFamilies);
        console.timeEnd('optimize');
        existingFamilies.sort((a, b) => a.routeOrder.value - b.routeOrder.value);
        let exc = new ColumnHashSet()
        exc.add(...f.excludeColumns(req.authInfo));

        await foreachSync(existingFamilies, async f => { result.families.push(await f.__toPojo(exc)); });
        result.basketInfo = await GetBasketStatusAction.getTheBaskts({
            filterCity: info.city,
            filterLanguage: info.language
        });
        return result;


    }
    static async optimizeRoute(families: Families[]) {

        if (families.length <= 1)
            return;
        let r = await getRouteInfo(families, true);
        if (r.status == 'OK' && r.routes && r.routes.length > 0 && r.routes[0].waypoint_order) {
            let i = 1;

            await foreachSync(r.routes[0].waypoint_order, async (p: number) => {
                let f = families[p];
                if (f.routeOrder.value != i) {
                    f.routeOrder.value = i;
                    f.save();
                }
                i++;
            });

            if (1 + 1 == 0) {
                let temp = families;
                let sorted = [];

                let lastLoc: Location = {
                    lat: 32.2280236,
                    lng: 34.8807046
                };
                let total = temp.length;
                for (let i = 0; i < total; i++) {
                    let closest = temp[0];
                    let closestIndex = 0;
                    let closestDist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, closest.getGeocodeInformation().location());
                    for (let j = 0; j < temp.length; j++) {
                        let dist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, temp[j].getGeocodeInformation().location());
                        if (dist < closestDist) {
                            closestIndex = j;
                            closestDist = dist;
                            closest = temp[j];
                        }
                    }
                    lastLoc = closest.getGeocodeInformation().location();
                    sorted.push(temp.splice(closestIndex, 1)[0]);

                }
                let r2 = await getRouteInfo(sorted, false);
                console.log(getInfo(r), getInfo(r2));
            }
            return r.routes[0].overview_polyline.points;

        }
    }
}

function getInfo(r: any) {
    let dist = 0;
    let duration = 0;
    r.routes[0].legs.forEach(e => {
        dist += e.distance.value;
        duration += e.duration.value;
    });
    return {
        dist, duration
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
    helperId: string;
    shortUrl: string;
    families: Families[];
    basketInfo: GetBasketStatusActionResponse
    ok: boolean;

}

async function getRouteInfo(families: Families[], optimize: boolean) {
    let u = new UrlBuilder('https://maps.googleapis.com/maps/api/directions/json');
    let startAndEnd = 'שנהב 4 אבן יהודה';
    let waypoints = 'optimize:' + (optimize ? 'true' : 'false');
    families.forEach(f => {
        waypoints += '|' + f.getGeocodeInformation().getlonglat();
    });
    u.addObject({
        origin: startAndEnd,
        destination: startAndEnd,
        waypoints: waypoints,
        language: 'he',
        key: process.env.GOOGLE_GECODE_API_KEY
    });

    let r = await (await fetch.default(u.url)).json();
    return r;
}
