import { AndFilter, Context, Filter, FilterFactory, UserInfo } from "remult";
import { BasketType } from "../families/BasketType";
import { DistributionCenters } from "../manage/distribution-centers";

import { Helpers } from "./helpers";
import { GetDistanceBetween, Location } from "../shared/googleApiHelpers";
import { Roles } from "../auth/roles";
import { getLang, Sites } from "../sites/sites";
import { Language } from "../translate";
import { ApplicationSettings, settingsForSite } from "../manage/ApplicationSettings";


export const initConfig = {
    disableForTesting: false
}
const helpersCache = new Map<string, Helpers>();
export async function InitContext(context: Context, user?: UserInfo, site?: string) {
    let h: Helpers;
    let gotUser = !!user;
    if (user === undefined)
        user = context.user;
    if (!site)
        site = Sites.getValidSchemaFromContext(context);
    context.settings = settingsForSite.get(site);
    if (!context.settings && !initConfig.disableForTesting)
        context.settings = await ApplicationSettings.getAsync(context);

    if (context.authenticated() || gotUser) {
        h = helpersCache.get(user.id);
        if (!h) {
            h = await context.for(Helpers).findId(user.id);
            helpersCache.set(user.id, h);
        }
    }
    let defaultBasketType: BasketType;
    context.defaultBasketType = async () => {
        if (defaultBasketType)
            return defaultBasketType;
        await context.for(BasketType).find({ orderBy: x => x.id }).then(y => {
            if (y.length > 0)
                defaultBasketType = y[0];
        });
    }
    context.defaultDistributionCenter = async () =>
        (await context.for(DistributionCenters).findFirst(x => DistributionCenters.isActive(x)))
    context.currentUser = h;

    context.findClosestDistCenter = async (loc: Location, centers?: DistributionCenters[]) => {
        let result: DistributionCenters;
        let dist: number;
        if (!centers)
            centers = await context.for(DistributionCenters).find({ where: c => DistributionCenters.isActive(c) });
        for (const c of centers) {
            let myDist = GetDistanceBetween(c.addressHelper.location(), loc);
            if (result === undefined || myDist < dist) {
                result = c;
                dist = myDist;
            }
        }
        return result;
    }
    context.filterCenterAllowedForUser = (center) => {
        if (context.isAllowed(Roles.admin)) {
            return new Filter();
        } else if (context.authenticated())
            return center.isEqualTo(context.currentUser.distributionCenter);
    }
    context.filterDistCenter = (distCenterColumn, distCenter): Filter => {
        let allowed = context.filterCenterAllowedForUser(distCenterColumn);
        if (distCenter != null)
            return new AndFilter(allowed, distCenterColumn.isEqualTo(distCenter));
        return allowed;
    }
    context.lang = getLang(context);
}
declare module 'remult' {
    export interface Context {
        currentUser: Helpers;
        defaultBasketType: () => Promise<BasketType>
        defaultDistributionCenter: () => Promise<DistributionCenters>;
        findClosestDistCenter(loc: Location, centers?: DistributionCenters[]): Promise<DistributionCenters>;
        filterCenterAllowedForUser(center: FilterFactory<DistributionCenters>): Filter;
        filterDistCenter(distCenterColumn: FilterFactory<DistributionCenters>, distCenter: DistributionCenters): Filter
        lang: Language;
        settings: ApplicationSettings;
    }
}
