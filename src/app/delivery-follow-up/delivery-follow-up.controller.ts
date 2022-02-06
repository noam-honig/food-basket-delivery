import { BackendMethod, SqlDatabase } from 'remult';

import { Helpers } from '../helpers/helpers';

import { Remult } from 'remult';
import { Roles } from '../auth/roles';
import { DistributionCenters } from '../manage/distribution-centers';
import {  FamilyDeliveries } from '../families/FamilyDeliveries';
import { relativeDateName } from '../model-shared/types';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { DeliveryStatus } from '../families/DeliveryStatus';

export class DeliveryFollowUpController {
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async helpersStatus(distCenter: DistributionCenters, remult?: Remult, db?: SqlDatabase) {
        let fd = SqlFor(remult.repo(FamilyDeliveries));

        let h = SqlFor(remult.repo(Helpers));
        var sql = new SqlBuilder(remult);
        sql.addEntity(fd, 'fd');
        let r = await db.execute(log(await sql.build((await sql.query({
            from: fd,
            outerJoin: () => [{ to: h, on: () => [sql.eq(fd.courier, h.id)] }],
            select: () => [
                sql.columnWithAlias(fd.courier, 'id'),
                sql.columnWithAlias(h.name, 'couriername'),
                sql.columnWithAlias(h.phone, 'phone'),
                sql.columnWithAlias(h.smsDate, 'smsdate'),
                sql.columnWithAlias(h.lastSignInDate, 'signindate'),
                sql.columnWithAlias(h.eventComment, 'comment1'),
                sql.columnWithAlias(sql.func('max', fd.courierAssingTime), 'maxasign'),
                sql.sumWithAlias(1, 'deliveries', fd.where({ deliverStatus: { "!=": [DeliveryStatus.SelfPickup, DeliveryStatus.SuccessPickedUp] } })),
                sql.sumWithAlias(1, 'inprogress', fd.where({ deliverStatus: DeliveryStatus.ReadyForDelivery })),
                sql.sumWithAlias(1, 'problem', fd.where({ deliverStatus: DeliveryStatus.isProblem() }))

            ],
            where: () => [sql.eq(fd.archive, false), fd.where({
                courier: { "!=": null },
                distributionCenter: remult.filterDistCenter(distCenter)
            })],

        })).replace(/distributionCenter/g, 'fd.distributionCenter'), ' group by ', [fd.courier, h.name, h.phone, h.smsDate, h.eventComment, h.lastSignInDate], ' order by '
            , 'couriername'// sql.func('max', fd.courierAssingTime), ' desc'
        )));
        return r.rows.map(r => {
            let smsDate = r['smsdate'];
            let maxAsign = r['maxasign'];
            let signindate = r['signindate'];
            let res: helperFollowupInfo = {
                id: r['id'],
                name: r['couriername'],
                phone: r['phone'],
                deliveries: +r['deliveries'],
                inProgress: +r['inprogress'],
                problem: +r['problem'],
                viewedSms: signindate && smsDate && signindate > smsDate,
                smsDateName: smsDate ? relativeDateName(remult, { d: smsDate }) : '',
                smsWasSent: smsDate && smsDate > maxAsign,

                eventComment: r['comment1']
            };
            return res;
        });
    }
}

export interface helperFollowupInfo {
    id: string,
    name: string,
    phone: string,
    deliveries: number,
    inProgress: number,
    problem: number,
    smsWasSent: boolean,
    eventComment: string,
    smsDateName: string,
    viewedSms: boolean

}


function log(what: string) {
    //console.log(what);
    return what;
}