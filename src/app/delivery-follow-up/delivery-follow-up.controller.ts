import { BackendMethod, remult, SqlDatabase } from 'remult';

import { Helpers } from '../helpers/helpers';

import { Remult } from 'remult';
import { Roles } from '../auth/roles';
import { DistributionCenters } from '../manage/distribution-centers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { relativeDateName } from '../model-shared/types';
import { getDb, SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { DeliveryStatus } from '../families/DeliveryStatus';
import { messageMerger, MessageTemplate } from '../edit-custom-message/messageMerger';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { SendSmsAction, SendSmsUtils } from '../asign-family/send-sms-action';

export class DeliveryFollowUpController {
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async helpersStatus(distCenter: DistributionCenters) {
        let fd = SqlFor(remult.repo(FamilyDeliveries));

        let h = SqlFor(remult.repo(Helpers));
        var sql = new SqlBuilder(remult);
        sql.addEntity(fd, 'fd');
        let r = await getDb().execute(log(await sql.build((await sql.query({
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
                distributionCenter: remult.context.filterDistCenter(distCenter)
            })],

        })).replace(/distributionCenter/g, 'fd.distributionCenter'), ' group by ', [fd.courier, h.name, h.phone, h.smsDate, h.eventComment, h.lastSignInDate], ' order by '
            , sql.func('max', fd.courierAssingTime), ' desc'
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
    @BackendMethod({ allowed: Roles.admin })
    static async sendAttendanceReminder(ids: string[]) {
        const message = await remult.repo(MessageTemplate).findId("simpleAttendanceReminder", { createIfNotFound: true });
        for (const h of await remult.repo(Helpers).find({ where: { id: ids } })) {
            await new SendSmsUtils().sendSms(h.phone.thePhone,
                DeliveryFollowUpController.createMessage(h, remult).merge(message.template), remult, h, {});
        }
        return "נשלחו " + ids.length + " הודעות";
    }
    static createMessage(volunteer: { name: string }, remult: Remult
    ) {
        return new messageMerger([
            { token: "מתנדב", caption: "שם המתנדב", value: volunteer.name },

            { token: "ארגון", value: getSettings(remult).organisationName },
        ]);
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