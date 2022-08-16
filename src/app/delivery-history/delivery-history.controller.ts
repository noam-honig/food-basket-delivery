import { remult, Remult, SqlDatabase } from 'remult';
import { getDb, SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Helpers } from '../helpers/helpers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';

import { BackendMethod } from 'remult';
import { Roles } from '../auth/roles';

import { HelperGifts } from '../helper-gifts/HelperGifts';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DistributionCenters } from '../manage/distribution-centers';


export class DeliveryHistoryController {
    @BackendMethod({ allowed: Roles.admin })
    static async getHelperHistoryInfo(fromDate: Date, toDate: Date, distCenter: DistributionCenters, onlyDone: boolean, onlyArchived: boolean) {


        toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
        var sql = new SqlBuilder(remult);
        var fd = await SqlFor(remult.repo(FamilyDeliveries));

        var h = await SqlFor(remult.repo(Helpers));
        var hg = await SqlFor(remult.repo(HelperGifts));


        let r = fd.where({
            deliveryStatusDate: { ">=": fromDate, "<": toDate },
            distributionCenter: remult.context.filterDistCenter(distCenter),
            deliverStatus: onlyDone ? DeliveryStatus.isAResultStatus() : undefined,
            archive: onlyArchived ? true : undefined
        });

        let queryText =
            await sql.build("select ", [
                fd.courier.getDbName(),
                sql.columnInnerSelect(fd, {
                    select: () => [h.name],
                    from: h,
                    where: () => [sql.build(h.id, "=", fd.courier.getDbName())]
                }),
                sql.columnInnerSelect(fd, {
                    select: () => [h.company],
                    from: h,
                    where: () => [sql.build(h.id, "=", fd.courier.getDbName())]
                }),
                sql.columnInnerSelect(fd, {
                    select: () => [h.phone],
                    from: h,
                    where: () => [sql.build(h.id, "=", fd.courier.getDbName())]
                }),
                sql.columnInnerSelect(hg, {
                    select: () => [sql.build('sum (case when ', sql.eq(hg.wasConsumed, true), ' then 1 else 0 end) consumed')],
                    from: hg,
                    where: () => [sql.build(hg.assignedToHelper, "=", fd.courier.getDbName())]
                }),
                sql.columnInnerSelect(hg, {
                    select: () => [sql.build('sum (case when ', sql.eq(hg.wasConsumed, false), ' then 1 else 0 end) pending')],
                    from: hg,
                    where: () => [sql.build(hg.assignedToHelper, "=", fd.courier.getDbName())]
                })
                , "deliveries", "dates", "families", "succesful", "selfassigned", "firstd", "lastd"], " from (",
                await sql.build("select ", [
                    fd.courier,
                    "count(*) deliveries",
                    sql.build("count (distinct date (", fd.courierAssingTime, ")) dates"),
                    sql.build("count (distinct ", fd.family, ") families"),
                    sql.build('sum (case when ', sql.eq(fd.courierAssignUser, fd.courier), ' and ', sql.and(fd.where({ deliverStatus: DeliveryStatus.isSuccess() })), ' then 1 else 0 end) selfassigned'),
                    sql.build('sum (', sql.case([{ when: [fd.where({ deliverStatus: DeliveryStatus.isSuccess() })], then: 1 }], 0), ') succesful'),
                    sql.build(sql.func('to_char', sql.func("min", fd.deliveryStatusDate), "'YY-MM'"), ' firstd'),
                    sql.build(sql.func('to_char', sql.func("max", fd.deliveryStatusDate), "'YY-MM'"), ' lastd')],
                    ' from ', fd,
                    ' where ', sql.and(r))

                + await sql.build(' group by ', fd.courier), ") x");

        return ((await getDb().execute((queryText))).rows);

    }
}
function log(x: any) {
    console.log(x);
    return x;
}