import { IdFilter, Remult, UserInfo, ValueFilter } from "remult";
import { BasketType } from "../families/BasketType";
import { DistributionCenters } from "../manage/distribution-centers";

import { Helpers } from "./helpers";
import { GetDistanceBetween, Location } from "../shared/googleApiHelpers";
import { Roles } from "../auth/roles";
import { getLang, Sites } from "../sites/sites";
import { Language } from "../translate";
import { ApplicationSettings } from "../manage/ApplicationSettings";


export const initConfig = {
    disableForTesting: false
}

export async function InitContext(remult: Remult, user?: UserInfo) {
    if (user === undefined)
        user = remult.user;
    let defaultBasketType: BasketType;
    remult.getSettings = () => ApplicationSettings.getAsync(remult);
    remult.getUserDistributionCenter = () => remult.repo(DistributionCenters).findId(remult.user.distributionCenter);
    remult.getCurrentUser = () => remult.repo(Helpers).findId(remult.user.id);
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

    remult.findClosestDistCenter = async (loc: Location, centers?: DistributionCenters[]) => {
        let result: DistributionCenters;
        let dist: number;
        if (!centers)
            centers = await remult.repo(DistributionCenters).find({ where: DistributionCenters.isActive });
        for (const c of centers) {
            let myDist = GetDistanceBetween(c.addressHelper.location, loc);
            if (result === undefined || myDist < dist) {
                result = c;
                dist = myDist;
            }
        }
        return result;
    }
    remult.filterCenterAllowedForUser = () => {
        if (!remult.authenticated())
            return [];
        else if (remult.isAllowed(Roles.admin)) {
            return undefined;
        } else
            return { $id: [remult.user.distributionCenter] };

    }
    remult.filterDistCenter = (distCenter): IdFilter<DistributionCenters> => {

        if (distCenter == null) {
            return remult.filterCenterAllowedForUser();
        } else {
            if (remult.isAllowed(Roles.admin) || distCenter.id == remult.user.distributionCenter)
                return distCenter;
        }
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
        getCurrentUser: () => Promise<Helpers>;
        getUserDistributionCenter: () => Promise<DistributionCenters>;
        defaultBasketType: () => Promise<BasketType>;
        defaultDistributionCenter: () => Promise<DistributionCenters>;
        findClosestDistCenter(loc: Location, centers?: DistributionCenters[]): Promise<DistributionCenters>;
        filterCenterAllowedForUser(): IdFilter<DistributionCenters>;
        filterDistCenter(distCenter: DistributionCenters): IdFilter<DistributionCenters>;
        getSettings: () => Promise<import('../manage/ApplicationSettings').ApplicationSettings>
        lang: Language;
        getSite(): string;
        getOrigin(): string;
    }
    export interface UserInfo {
        theHelperIAmEscortingId: string;
        escortedHelperName: string;
        distributionCenter: string;
    }
}

