import { Helpers, HelpersBase } from '../helpers/helpers';
import { Remult, BackendMethod, SqlDatabase } from 'remult';

import { getSettings } from '../manage/ApplicationSettings';
import { Location, GetDistanceBetween, GeocodeInformation } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';
import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';
import { relativeDateName } from '../model-shared/types';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { getLang } from '../sites/sites';
import { DeliveryStatus } from '../families/DeliveryStatus';



export class SelectHelperController {
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getHelpersByLocation(deliveryLocation: Location, selectDefaultVolunteer: boolean, familyId: string, remult?: Remult, db?: SqlDatabase) {
        let helpers = new Map<string, helperInList>();


        let check = (h: helperInList, location: Location, from: string) => {
            if (!h)
                return;
            let dist = GetDistanceBetween(location, deliveryLocation);
            if (dist < h.distance) {
                h.distance = dist;
                h.location = location;
                h.distanceFrom = from;
            }
        }
        for await (const h of remult.repo(Helpers).query({ where: HelpersBase.active })) {
            helpers.set(h.id, {
                helperId: h.id,
                name: h.name,
                phone: h.phone?.displayValue,
                distance: 99999999
            });
            if (h.preferredDistributionAreaAddressHelper.ok) {
                let theH = helpers.get(h.id);
                check(theH, h.preferredDistributionAreaAddressHelper.location, getLang(remult).preferredDistributionAreaAddress + ": " + h.preferredDistributionAreaAddress);
            }
            if (h.preferredFinishAddressHelper.ok) {
                let theH = helpers.get(h.id);
                check(theH, h.preferredFinishAddressHelper.location, getLang(remult).preferredFinishAddress + ": " + h.preferredFinishAddress);
            }
        }

        let sql = new SqlBuilder(remult);
        if (!selectDefaultVolunteer) {

            /* ----    calculate active deliveries and distances    ----*/
            let afd = SqlFor(remult.repo(ActiveFamilyDeliveries));




            for (const d of (await db.execute(await sql.query({
                from: afd,
                where: () => [afd.where({ courier: { "!=": null }, deliverStatus: DeliveryStatus.isNotAResultStatus() })],
                select: async () => [
                    sql.columnWithAlias("distinct " + await sql.getItemSql(afd.family), 'fam'),
                    sql.columnWithAlias(afd.courier, "courier"),
                    sql.columnWithAlias(afd.addressLongitude, "lng"),
                    sql.columnWithAlias(afd.addressLatitude, "lat"),
                    sql.columnWithAlias(afd.address, 'address')]
            }))).rows) {
                let h = helpers.get(d.courier);
                if (h) {
                    if (!h.assignedDeliveries)
                        h.assignedDeliveries = 1;
                    else
                        h.assignedDeliveries++;
                    if (!getSettings(remult).isSytemForMlt)
                        check(h, { lat: d.lat, lng: d.lng }, getLang(remult).delivery + ": " + d.address);
                }
            }

            /*  ---------- calculate completed deliveries and "busy" status -------------*/
            let sql1 = new SqlBuilder(remult);

            let fd = SqlFor(remult.repo(FamilyDeliveries));

            let limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - (await remult.state.getSettings()).BusyHelperAllowedFreq_denom);

            for (const d of (await db.execute(await sql1.query({
                from: fd,
                where: () => [
                    fd.where({
                        courier: { "!=": null },
                        deliverStatus: DeliveryStatus.isAResultStatus(),
                        deliveryStatusDate: { ">=": limitDate }
                    })
                ],
                select: async () => [
                    sql1.columnWithAlias(fd.courier, "courier"),
                    sql1.columnWithAlias(sql.max(fd.deliveryStatusDate), "delivery_date"),
                    sql1.columnWithAlias("count(distinct " + await sql1.getItemSql(fd.family) + ")", "count")
                ],
                groupBy: () => [fd.courier]
            }))).rows) {
                let h = helpers.get(d.courier);
                if (h) {
                    h.lastCompletedDeliveryString = relativeDateName(remult, { d: d.delivery_date });
                    h.totalRecentDeliveries = d.count;
                    h.isBusyVolunteer = (h.totalRecentDeliveries > (await remult.state.getSettings()).BusyHelperAllowedFreq_nom) ? "busyVolunteer" : "";
                }
            }
        } else {

            let afd = SqlFor(remult.repo(Families));
            for (const d of (await db.execute(await sql.query({
                from: afd,
                where: () => [afd.where({ fixedCourier: { "!=": null }, status: FamilyStatus.Active })],
                select: () => [
                    sql.columnWithAlias(afd.fixedCourier, "courier"),
                    sql.columnWithAlias(afd.addressLongitude, "lng"),
                    sql.columnWithAlias(afd.addressLatitude, "lat"),
                    sql.columnWithAlias(afd.address, 'address')]
            }))).rows) {
                let h = helpers.get(d.courier);
                if (h) {
                    if (!h.fixedFamilies)
                        h.fixedFamilies = 1;
                    else
                        h.fixedFamilies++;

                    check(h, { lat: d.lat, lng: d.lng }, getLang(remult).family + ": " + d.address);
                }
            }
        }
        if (familyId) {
            for (const fd of await remult.repo(FamilyDeliveries).find({
                where: { family: familyId, deliverStatus: DeliveryStatus.isProblem() }
            })) {
                if (fd.courier) {
                    let h = helpers.get(fd.courier?.id);
                    if (h) {
                        h.hadProblem = true;
                    }
                }
            }
        }

        return [...helpers.values()].sort((a, b) => {
            let r = a.distance - b.distance;
            if (r != 0)
                return r;
            return a.name.localeCompare(b.name);
        });




    }
}
export interface helperInList {
    helper?: HelpersBase,
    helperId: string,
    name: string,
    phone: string,
    distance?: number,
    location?: Location,
    assignedDeliveries?: number,
    totalRecentDeliveries?: number,
    isBusyVolunteer?: string,
    lastCompletedDeliveryString?: string,
    fixedFamilies?: number,
    distanceFrom?: string,
    hadProblem?: boolean
}