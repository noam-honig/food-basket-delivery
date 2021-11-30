import { Remult, UserInfo, ValueFilter } from "remult";
import { BasketType } from "../families/BasketType";
import { DistributionCenters } from "../manage/distribution-centers";

import { Helpers } from "./helpers";
import { GetDistanceBetween, Location } from "../shared/googleApiHelpers";
import { Roles } from "../auth/roles";
import { getLang, Sites } from "../sites/sites";
import { Language } from "../translate";


export const initConfig = {
    disableForTesting: false
}
const helpersCache = new Map<string, Helpers>();
export function setHelperInCache(h: Helpers) {
    if (helpersCache.size > 100)
        helpersCache.clear();
    helpersCache.set(h.id, h);

    //   console.log("HelpersCache:" + helpersCache.size);
}
export async function InitContext(remult: Remult, user?: UserInfo) {
    let h: Helpers;
    let gotUser = !!user;
    if (user === undefined)
        user = remult.user;


    if (remult.authenticated() || gotUser) {
        h = helpersCache.get(user.id);
        if (!h) {
            h = await remult.repo(Helpers).findId(user.id);
            setHelperInCache(h);
        }
    }
    let defaultBasketType: BasketType;
    remult.defaultBasketType = async () => {
        if (defaultBasketType)
            return defaultBasketType;
        await remult.repo(BasketType).find({ orderBy: { id: 'asc' }, limit: 1 }).then(y => {
            if (y.length > 0)
                defaultBasketType = y[0];
        });
        return defaultBasketType;
    }
    remult.defaultDistributionCenter = async () =>
        (await remult.repo(DistributionCenters).findFirst(DistributionCenters.isActive))
    remult.currentUser = h;

    remult.findClosestDistCenter = async (loc: Location, centers?: DistributionCenters[]) => {
        let result: DistributionCenters;
        let dist: number;
        if (!centers)
            centers = await remult.repo(DistributionCenters).find({ where: DistributionCenters.isActive });
        for (const c of centers) {
            let myDist = GetDistanceBetween(c.addressHelper.location(), loc);
            if (result === undefined || myDist < dist) {
                result = c;
                dist = myDist;
            }
        }
        return result;
    }
    remult.filterCenterAllowedForUser = () => {
        if (!remult.currentUser)
            return [];
        else if (remult.isAllowed(Roles.admin)) {
            return undefined;
        } else
            return remult.currentUser.distributionCenter;

    }
    remult.filterDistCenter = (distCenter): ValueFilter<DistributionCenters> => {
        let allowed = remult.filterCenterAllowedForUser();
        if (distCenter == null)
            return allowed;
        if (distCenter.id == (allowed as any)?.id || allowed === undefined)
            return distCenter;
        return [];
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
        filterCenterAllowedForUser(): ValueFilter<DistributionCenters>;
        filterDistCenter(distCenter: DistributionCenters): ValueFilter<DistributionCenters>
        lang: Language;
        getSite(): string;
        getOrigin(): string;
    }
}

