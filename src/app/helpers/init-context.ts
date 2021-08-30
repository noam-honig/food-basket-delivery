import { AndFilter, Remult, Filter, FilterFactory, UserInfo } from "remult";
import { BasketType } from "../families/BasketType";
import { DistributionCenters } from "../manage/distribution-centers";

import { Helpers } from "./helpers";
import { GetDistanceBetween, Location } from "../shared/googleApiHelpers";
import { Roles } from "../auth/roles";
import { getLang, getSiteFromUrl, Sites } from "../sites/sites";
import { Language } from "../translate";
import { ApplicationSettings, settingsForSite } from "../manage/ApplicationSettings";


export const initConfig = {
    disableForTesting: false
}
const helpersCache = new Map<string, Helpers>();
export function setHelperInCache(h:Helpers){
    helpersCache.set(h.id, h);
}
export async function InitContext(remult: Remult, user?: UserInfo) {
    let h: Helpers;
    let gotUser = !!user;
    if (user === undefined)
        user = remult.user;

    if (remult.authenticated() || gotUser) {
        h = helpersCache.get(user.id);
        if (!h) {
            h = await  remult.repo(Helpers).findId(user.id);
            setHelperInCache(h);
        }
    }
    let defaultBasketType: BasketType;
    remult.defaultBasketType = async () => {
        if (defaultBasketType)
            return defaultBasketType;
        await  remult.repo(BasketType).find({ orderBy: x => x.id }).then(y => {
            if (y.length > 0)
                defaultBasketType = y[0];
        });
        return defaultBasketType;
    }
    remult.defaultDistributionCenter = async () =>
        (await  remult.repo(DistributionCenters).findFirst(x => DistributionCenters.isActive(x)))
    remult.currentUser = h;

    remult.findClosestDistCenter = async (loc: Location, centers?: DistributionCenters[]) => {
        let result: DistributionCenters;
        let dist: number;
        if (!centers)
            centers = await  remult.repo(DistributionCenters).find({ where: c => DistributionCenters.isActive(c) });
        for (const c of centers) {
            let myDist = GetDistanceBetween(c.addressHelper.location(), loc);
            if (result === undefined || myDist < dist) {
                result = c;
                dist = myDist;
            }
        }
        return result;
    }
    remult.filterCenterAllowedForUser = (center) => {
        if (remult.isAllowed(Roles.admin)) {
            return new Filter();
        } else if (remult.authenticated())
            return center.isEqualTo(remult.currentUser.distributionCenter);
    }
    remult.filterDistCenter = (distCenterColumn, distCenter): Filter => {
        let allowed = remult.filterCenterAllowedForUser(distCenterColumn);
        if (distCenter != null)
            return new AndFilter(allowed, distCenterColumn.isEqualTo(distCenter));
        return allowed;
    }
    remult.lang = getLang(remult);
}


export async function createSiteContext(site: string, original: Remult) {
    let dp = Sites.getDataProviderForOrg(site);
    let c = new Remult();
    c.setDataProvider(dp);
    Sites.setSiteToContext(c, site, original);
    await InitContext(c, undefined);
    return c;
}
declare module 'remult' {
    export interface Remult {
        currentUser: Helpers;
        defaultBasketType: () => Promise<BasketType>
        defaultDistributionCenter: () => Promise<DistributionCenters>;
        findClosestDistCenter(loc: Location, centers?: DistributionCenters[]): Promise<DistributionCenters>;
        filterCenterAllowedForUser(center: FilterFactory<DistributionCenters>): Filter;
        filterDistCenter(distCenterColumn: FilterFactory<DistributionCenters>, distCenter: DistributionCenters): Filter
        lang: Language;
        getSite(): string;
        getOrigin():string;
    }
}
