import { Location, GetDistanceBetween } from '../shared/googleApiHelpers';
import { BackendMethod, SqlDatabase, Allow, EntityFilter, ProgressListener, remult } from 'remult';

import { DeliveryStatus } from "../families/DeliveryStatus";
import { YesNo } from "../families/YesNo";

import { HelpersBase } from '../helpers/helpers';

import { ApplicationSettings } from '../manage/ApplicationSettings';

import { BasketType } from '../families/BasketType';

import { getDb, SqlBuilder, SqlDefs, SqlFor } from "../model-shared/SqlBuilder";
import { Roles } from '../auth/roles';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { DistributionCenters } from '../manage/distribution-centers';
import { CitiesStats, CitiesStatsPerDistCenter } from '../family-deliveries/family-deliveries-stats';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Families } from '../families/families';

import { optimizeRoute, routeStats, routeStrategy } from './route-strategy';




export class AsignFamilyController {
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getBasketStatus(helper: HelpersBase, basket: BasketType, distCenter: DistributionCenters, info: GetBasketStatusActionInfo): Promise<GetBasketStatusActionResponse> {
        const db = getDb();
        let result: GetBasketStatusActionResponse = {
            baskets: [],
            cities: [],
            areas: [],
            special: 0,
            repeatFamilies: []
        };


        let countFamilies = (additionalWhere?: EntityFilter<ActiveFamilyDeliveries>) => {
            return remult.repo(ActiveFamilyDeliveries).count({
                $and: [
                    additionalWhere,
                    FamilyDeliveries.readyFilter(info.filterCity, info.filterGroup, info.filterArea, basket),
                    { distributionCenter: remult.context.filterDistCenter(distCenter) }
                ],
            });
        };

        result.special = await countFamilies({ special: YesNo.Yes });


        let sql = new SqlBuilder();
        let f = SqlFor(remult.repo(ActiveFamilyDeliveries));
        let fd = SqlFor(remult.repo(FamilyDeliveries));

        if (helper) {
            let r = await db.execute(await sql.build('select ', f.id, ' from ', f, ' where ', fd.where({
                distributionCenter: remult.context.filterDistCenter(distCenter),
                special: YesNo.No,
                $and: [
                    ActiveFamilyDeliveries.active,
                    FamilyDeliveries.readyFilter(info.filterCity, info.filterGroup, info.filterArea, basket)
                ]
            }), ' and ', filterRepeatFamilies(sql, f, fd, helper), ' limit 100'));
            result.repeatFamilies = r.rows.map(x => x[r.getColumnKeyInResultForIndexInSelect(0)]);
        }



        if (!distCenter) {
            for await (let c of remult.repo(CitiesStats).query({
                orderBy: { city: 'asc' },
            })) {
                var ci = {
                    name: c.city,
                    unassignedFamilies: c.deliveries
                };
                if (!info.filterGroup) {
                    result.cities.push(ci);
                }
                else {
                    ci.unassignedFamilies = await countFamilies({ city: c.city });
                    if (ci.unassignedFamilies > 0)
                        result.cities.push(ci);
                }
            }
        } else {
            for await (let c of remult.repo(CitiesStatsPerDistCenter).query({
                orderBy: { city: "asc" },
                where: { distributionCenter: remult.context.filterDistCenter(distCenter) }
            })) {
                var ci = {
                    name: c.city,
                    unassignedFamilies: c.families
                };
                if (!info.filterGroup) {
                    result.cities.push(ci);
                }
                else {
                    ci.unassignedFamilies = await countFamilies({ city: c.city });
                    if (ci.unassignedFamilies > 0)
                        result.cities.push(ci);
                }
            }
        }
        let groupBy = (await db.execute(await sql.build(await sql.query({
            select: () => [
                sql.columnWithAlias(f.area, 'area'),
                sql.columnWithAlias(sql.func('count ', '*'), 'c')
            ],
            from: f,
            where: () => [f.where({
                distributionCenter: remult.context.filterDistCenter(distCenter),
                $and: [FamilyDeliveries.readyFilter(info.filterCity, info.filterGroup, undefined, basket)]
            })]
        }), ' group by ', f.area, ' order by ', f.area)));
        result.areas = groupBy.rows.map(x => {
            let r: CityInfo = {
                name: x['area'],
                unassignedFamilies: +x['c']
            }
            return r;
        });



        let baskets = await db.execute(await sql.build(sql.query({
            select: () => [f.basketType,
            sql.build('count (', f.quantity, ') b'),
            ],
            from: f,
            where: () => [f.where({
                distributionCenter: remult.context.filterDistCenter(distCenter),
                $and: [FamilyDeliveries.readyFilter(info.filterCity, info.filterGroup, info.filterArea)]
            })]
        }), ' group by ', f.basketType));
        for (const r of baskets.rows) {
            let basketId = r[baskets.getColumnKeyInResultForIndexInSelect(0)];
            let b = await remult.repo(BasketType).findId(basketId);
            result.baskets.push({
                id: basketId,
                name: b?.name,
                unassignedFamilies: +r['b'],
                basket: undefined
            });
        }

        result.baskets.sort((a, b) => b.unassignedFamilies - a.unassignedFamilies);


        return result;
    }
    @BackendMethod({ allowed: Allow.authenticated, blockUser: false })
    static async RefreshRoute(helper: HelpersBase, args: refreshRouteArgs, strategy?: routeStrategy) {

        if (!remult.isAllowed(Roles.distCenterAdmin)) {
            if (!helper.isCurrentUser()) {
                throw "Not Allowed";
            }
        }
        if (!args)
            args = {};
        let existingFamilies = await remult.repo(ActiveFamilyDeliveries).find({
            where: {
                courier: helper,
                deliverStatus: DeliveryStatus.ReadyForDelivery
            },
        });
        if (!strategy)
            strategy = (await ApplicationSettings.getAsync()).routeStrategy;

        if (!strategy)
            throw "Invalid Strategy";
        let r = await optimizeRoute(await helper.getHelper(), existingFamilies, !args.doNotUseGoogle, strategy, args.volunteerLocation);
        return r;
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin, queue: false })
    static async AddBox(helper: HelpersBase, basketType: BasketType, distCenter: DistributionCenters, info: AddBoxInfo, progress?: ProgressListener) {
        let result: AddBoxResponse = {
            addedBoxes: 0,
            basketInfo: undefined,
            routeStats: undefined,
            familiesInSameAddress: []
        }
        if (!helper)
            throw "helper does not exist";
        let existingFamilies = await remult.repo(ActiveFamilyDeliveries).find({
            where: {
                courier: helper,
                deliverStatus: DeliveryStatus.ReadyForDelivery
            },
            orderBy: { routeOrder: "desc" }
        });
        let moreHelperInfo = await helper.getHelper();

        let locationReferenceFamilies: Location[] = [];
        let bounds: { lng1?: number, lng2?: number, lat1?: number, lat2?: number };
        let boundsExtend = (l: Location) => {
            if (!bounds) {
                bounds = {
                    lng1: l.lng,
                    lng2: l.lng,
                    lat1: l.lat,
                    lat2: l.lat
                }
            }
            else {
                if (l.lng < bounds.lng1) {
                    bounds.lng1 = l.lng;
                }
                if (l.lng > bounds.lng2) {
                    bounds.lng2 = l.lng;
                }
                if (l.lat < bounds.lat1) {
                    bounds.lat1 = l.lat;
                }
                if (l.lat > bounds.lat2) {
                    bounds.lat2 = l.lat;
                }
            }
        };
        let boundsContains = (l: Location) => {
            return (l.lng >= bounds.lng1 && l.lng <= bounds.lng2 && l.lat >= bounds.lat1 && l.lat <= bounds.lat2);
        };
        {

            let refFam: ActiveFamilyDeliveries[] = [...existingFamilies];
            if (refFam.length == 0) {
                let from = new Date();
                from.setDate(from.getDate() - 1);
                refFam = await remult.repo(ActiveFamilyDeliveries).find({
                    where: {
                        courier: helper,
                        deliveryStatusDate: { $gte: from },
                        deliverStatus: DeliveryStatus.resultStatuses()
                    },
                    orderBy: { deliveryStatusDate: "desc" },
                    limit: 1
                });
            }
            let m = new Map<string, boolean>();
            for (const f of refFam) {
                let x = JSON.stringify(f.getDrivingLocation());
                if (!m.get(x)) {
                    m.set(x, true);
                    locationReferenceFamilies.push(f.getDrivingLocation());
                    boundsExtend(f.getDrivingLocation());
                }
            }
        }
        const buildWhere: EntityFilter<FamilyDeliveries> = {
            special: { "!=": YesNo.Yes },
            distributionCenter: remult.context.filterDistCenter(distCenter),
            basketType: basketType ? basketType : undefined,
            $and: [FamilyDeliveries.readyFilter(info.city, info.group, info.area)]
        }

        let getFamilies = async () => {
            if (locationReferenceFamilies.length > 0 && info.preferRepeatFamilies && !info.allRepeat) {
                info.preferRepeatFamilies = false;
            }
            let f = SqlFor(remult.repo(ActiveFamilyDeliveries));
            let sql = new SqlBuilder();
            sql.addEntity(f, 'Families');
            let r = (await getDb().execute(await sql.query({
                select: () => [sql.build('distinct ', [f.addressLatitude, f.addressLongitude])],
                from: f,
                where: async () => {
                    let where = f.where(buildWhere);
                    let res = [];
                    res.push(where);
                    res.push(f.where({
                        family: { "!=": moreHelperInfo.blockedFamilies }
                    }))
                    if (info.preferRepeatFamilies)
                        res.push(filterRepeatFamilies(sql, f, SqlFor(remult.repo(FamilyDeliveries)), helper));
                    return res;
                }
            })));
            return r.rows.map(x => {
                return {

                    lat: +x[r.getColumnKeyInResultForIndexInSelect(0)],
                    lng: +x[r.getColumnKeyInResultForIndexInSelect(1)]
                } as Location;

            }) as Location[];


        }

        let waitingFamilies = await getFamilies();
        let i = 0;
        let settings = await ApplicationSettings.getAsync();
        while (i < info.numOfBaskets) {
            if (progress)
                progress.progress(i / info.numOfBaskets);
            if (info.preferRepeatFamilies && waitingFamilies.length == 0 && !info.allRepeat) {
                info.preferRepeatFamilies = false;
                waitingFamilies = await getFamilies();

            }
            if (waitingFamilies.length == 0)
                break;


            let distCenter: DistributionCenters;

            let addFamilyToResult = async (fqr: Location) => {
                waitingFamilies.splice(waitingFamilies.indexOf(fqr), 1);
                locationReferenceFamilies.push(fqr);
                boundsExtend(fqr);
                for (const family of await remult.repo(ActiveFamilyDeliveries).find({
                    where: {
                        addressLongitude: fqr.lng,
                        addressLatitude: fqr.lat,
                        distributionCenter: remult.context.filterDistCenter(distCenter),
                        $and: [
                            buildWhere
                        ]
                    }
                })) {
                    if (i < info.numOfBaskets) {
                        family.courier = helper;
                        family._disableMessageToUsers = true;
                        distCenter = family.distributionCenter;
                        await family.save();
                        result.addedBoxes++;
                        existingFamilies.push(family);

                        i++;


                    }
                    else {
                        if (family.addressOk) {
                            result.familiesInSameAddress.push(family.id);
                        }
                    }
                }

            }

            if (waitingFamilies.length > 0) {

                let preferArea = moreHelperInfo.preferredDistributionAreaAddressHelper.ok;
                let preferEnd = moreHelperInfo.preferredFinishAddressHelper.ok;

                if (locationReferenceFamilies.length == 0 || (settings.isSytemForMlt && (preferArea || preferEnd))) {

                    let distCenter = settings.addressHelper.location;
                    let lastFamiliy = waitingFamilies[0];

                    if (preferArea || preferEnd) {
                        lastFamiliy = undefined;
                        var lastDist: number;
                        for (const f of waitingFamilies) {
                            if (preferArea) {
                                let dist = GetDistanceBetween(f, moreHelperInfo.preferredDistributionAreaAddressHelper.location);
                                if (!lastFamiliy || dist < lastDist) {
                                    lastFamiliy = f;
                                    lastDist = dist;
                                }
                            }
                            if (preferEnd) {
                                let dist = GetDistanceBetween(f, moreHelperInfo.preferredFinishAddressHelper.location);
                                if (!lastFamiliy || dist < lastDist) {
                                    lastFamiliy = f;
                                    lastDist = dist;
                                }
                            }
                        }

                    } else {
                        let lastDist = 0;
                        for (const f of waitingFamilies) {
                            let dist = GetDistanceBetween(f, distCenter);
                            if (dist > lastDist) {
                                lastFamiliy = f;
                                lastDist = dist;
                            }
                        }
                    }
                    await addFamilyToResult(lastFamiliy);
                }
                else {

                    let getDistance = (x: Location) => {
                        let inBounds = boundsContains(x);

                        let r = 1000000;
                        if (!x)
                            return r;
                        let start = locationReferenceFamilies.length - 1;
                        if (start < 25)
                            start = 0;
                        else start -= 25;
                        for (let index = start; index < locationReferenceFamilies.length; index++) {
                            const ef = locationReferenceFamilies[index];
                            let loc = ef;
                            if (loc) {
                                let dis = GetDistanceBetween(x, loc);
                                if (inBounds) {
                                    dis /= 3;
                                }
                                if (dis < r)
                                    r = dis;
                            }

                        }

                        return r;

                    }
                    const neededBaskets = info.numOfBaskets - i;
                    if (neededBaskets == 1) {

                        let smallFamily = waitingFamilies[0];
                        let dist = getDistance({
                            lat: smallFamily.lat,
                            lng: smallFamily.lng
                        });
                        for (let i = 1; i < waitingFamilies.length; i++) {
                            let f = waitingFamilies[i];
                            let myDist = getDistance({ lng: f.lng, lat: f.lat });
                            if (myDist < dist) {
                                dist = myDist;
                                smallFamily = waitingFamilies[i]
                                if (myDist == 0) {
                                    break;
                                }
                            }

                        }
                        await addFamilyToResult(smallFamily);
                    }
                    else {
                        let closesFamilies: FamilyDistance[] = [];
                        let maxDist: number = undefined;
                        let add = (f: FamilyDistance) => {
                            closesFamilies.push(f);
                            if (closesFamilies.length > neededBaskets) {
                                closesFamilies.sort((a, b) => a.dist - b.dist);
                                closesFamilies.pop();
                                maxDist = closesFamilies.reduce((max, val) => max > val.dist ? max : val.dist, closesFamilies[0].dist);
                            }
                        };


                        for (let i = 0; i < waitingFamilies.length; i++) {
                            let f = waitingFamilies[i];
                            let dist = getDistance({ lng: f.lng, lat: f.lat });
                            var famDist: FamilyDistance = { dist, lng: f.lng, lat: f.lat };

                            if (dist < maxDist || maxDist === undefined) {
                                add(famDist);
                            }
                        }
                        for (const f of closesFamilies) {
                            await addFamilyToResult(f);
                        }
                    }
                }
            }
        }


        result.familiesInSameAddress = result.familiesInSameAddress.filter((x, i) => !existingFamilies.find(f => f.id == x) && result.familiesInSameAddress.indexOf(x) == i);
        if (distCenter)
            distCenter.SendMessageToBrowser(settings.lang.deliveriesAssigned);
        Families.SendMessageToBrowsers(settings.lang.deliveriesAssigned, '');
        return result;
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async selectBuildings(basket: BasketType, distCenter: DistributionCenters, args: {
        filterCity: string,
        filterGroup: string,
        filterArea: string
    }
    ) {
        var sql = new SqlBuilder();
        var fd = SqlFor(remult.repo(ActiveFamilyDeliveries));

        let result = await getDb().execute(await sql.query({
            from: fd,
            select: () => [sql.columnWithAlias(sql.max('address'), 'address'), sql.sumWithAlias(fd.quantity, "quantity"), sql.build("string_agg(", fd.id, "::text, ',') ids")],
            where: () => [fd.where({
                distributionCenter: remult.context.filterDistCenter(distCenter),
                ...FamilyDeliveries.readyFilter(args.filterCity, args.filterGroup, args.filterArea, basket)
            })],
            groupBy: () => [fd.addressLatitude, fd.addressLongitude],
            having: () => [sql.build("sum(quantity)", '> 4')]
        }));
        let r: {
            address: string,
            quantity: number,
            ids: string[]
        }[] = []
        r = result.rows.map(r => ({
            address: r.address,
            quantity: r.quantity,
            ids: r.ids.split(',')
        }));
        return r;
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async assignMultipleFamilies(helper: HelpersBase, args: {
        ids: string[],
        quantity: number,
    }) {
        let familyDeliveries = await remult.repo(ActiveFamilyDeliveries).find({
            where: { id: args.ids, ...FamilyDeliveries.readyFilter() }
        });
        if (args.quantity > 0) {
            familyDeliveries.sort((a, b) => {
                if (a.floor == b.floor) {
                    return (+b.appartment - +a.appartment);
                }
                return +b.floor - +a.floor;
            });
        }
        let added = 0;
        for (const fd of familyDeliveries) {
            if (args.quantity) {
                added += fd.quantity;
                if (added > args.quantity)
                    break;
            }
            fd.courier = helper;
            await fd.save();
        }
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin, blockUser: false })
    static async getHelperStats(id: string) {
        const sql = new SqlBuilder();
        var fd = SqlFor(remult.repo(FamilyDeliveries));
        const result = await getDb().execute(await sql.query({
            select: () => [
                "count(*) deliveries",
                sql.build("count (distinct date (", fd.courierAssingTime, ")) dates"),
                sql.build("min (", fd.deliveryStatusDate, ") startDate")
            ],
            from: fd,
            where: () => [fd.where({
                courier: { $id: id },
                deliverStatus: DeliveryStatus.resultStatuses()
            })]
        }));
        const r = result.rows[0];

        if (r.deliveries > 0) {
            const d = new Date(r.startdate);
            return "השלימ/ה $1 משלוחים ב-$2 תאריכים מ-$3".replace("$1", r.deliveries).replace("$2", r.dates)
                .replace("$3", (d.getMonth() + 1) + "/" + (d.getFullYear() - 2000));
        }
        else return '';
    }
}
export interface BasketInfo {
    name: string;
    id: string;
    basket: BasketType;
    unassignedFamilies: number;

}

export interface GetBasketStatusActionResponse {
    baskets: BasketInfo[];
    cities: CityInfo[];
    areas: CityInfo[];
    special: number;
    repeatFamilies: string[];
}

export interface CityInfo {
    name: string;
    unassignedFamilies: number;
}
export interface AddBoxResponse {
    basketInfo: GetBasketStatusActionResponse
    addedBoxes: number;
    routeStats: routeStats;
    familiesInSameAddress: string[];
}

export interface FamilyDistance {
    lat: number, lng: number, dist: number;
}
export interface refreshRouteArgs {
    doNotUseGoogle?: boolean,
    volunteerLocation?: Location
}
export interface AddBoxInfo {
    group: string;
    city: string;
    area: string;
    numOfBaskets: number;
    preferRepeatFamilies: boolean;
    allRepeat: boolean;
}
export interface GetBasketStatusActionInfo {
    filterGroup: string;
    filterCity: string;
    filterArea: string;
}

function filterRepeatFamilies(sql: SqlBuilder, f: SqlDefs<ActiveFamilyDeliveries>, fd: SqlDefs<FamilyDeliveries>, helperId: HelpersBase) {
    return sql.build(f.family, ' in (select ', fd.family, ' from ', fd, ' where ', fd.where({ courier: helperId }), ')');

}