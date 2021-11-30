import { BackendMethod, Controller, Field, getFields, Remult, SqlDatabase } from "remult";
import { FamilyDeliveries } from "../families/FamilyDeliveries";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Helpers, HelpersBase } from "./helpers";
import { Event, volunteersInEvent, eventStatus } from '../events/events';
import { HelperCommunicationHistory } from "../in-route-follow-up/in-route-helpers";
import { Roles } from "../auth/roles";
import { count } from "console";
import { Families } from "../families/families";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { messageMerger } from "../edit-custom-message/edit-custom-message.component";
import { Sites } from "../sites/sites";
import { SendSmsUtils } from "../asign-family/send-sms-action";

@Controller("SendBulkSms")
export class SendBulkSms {
    @BackendMethod({ allowed: Roles.admin, queue: true })
    async send() {
        let i = 0;
        let settings = await ApplicationSettings.getAsync(this.remult);
        if (!settings.bulkSmsEnabled)
            throw ("Forbidden");
        for (const v of await this.getVolunteers()) {
            let message = this.buildMessage(v.name, settings).merge(settings.inviteVolunteersMessage);
            if (true)
                await new SendSmsUtils().sendSms(v.phone,
                    message,
                    this.remult, await this.remult.repo(Helpers).findId(v.id));
            else
                console.log(message);
            i++;
        }
        return i;
    }
    constructor(private remult: Remult) { }
    @Field({ caption: 'רק כאלו שהתנדבו בעבר בעיר' })
    city: string = '';
    @Field({ caption: "הגבלת מספר הודעות" })
    limit: number = 100;
    get $() { return getFields(this) }
    async getVolunteers() {
        let db = this.remult._dataSource as SqlDatabase;
        let sql = new SqlBuilder(this.remult);
        let helpers = SqlFor(this.remult.repo(Helpers));
        let fd = SqlFor(this.remult.repo(FamilyDeliveries));
        let f = SqlFor(this.remult.repo(Families));
        let events = SqlFor(this.remult.repo(Event))
        let ve = SqlFor(this.remult.repo(volunteersInEvent));
        let message = SqlFor(this.remult.repo(HelperCommunicationHistory));
        let threeDayAgo = new Date();
        threeDayAgo.setDate(threeDayAgo.getDate() - 3);
        let q = await sql.query({
            from: helpers,
            select: () => [helpers.phone, helpers.name, helpers.id],
            where: async () => [
                helpers.where({ archive: false, doNotSendSms: false }),
                this.city && await sql.build(helpers.id, " in (", sql.query({
                    select: () => [fd.courier],
                    from: fd,
                    where: () => [fd.where({
                        archive: true,
                        city: { $contains: this.city }
                    })]
                }), ")"),
                await sql.build(helpers.id, " not in (", sql.query({
                    select: () => [fd.courier],
                    from: fd,
                    where: () => [fd.where({
                        archive: false
                    })]
                }), ")"),
                await sql.build(helpers.id, " not in (", sql.query({
                    select: () => [f.fixedCourier],
                    from: f
                }), ")"),
                await sql.build(helpers.id, " not in (", sql.query({
                    select: () => [ve.helper],
                    from: ve,
                    where: async () => [await sql.build(ve.eventId, " in (", sql.query({
                        select: () => [events.id],
                        from: events,
                        where: () => [events.where({
                            eventStatus: eventStatus.active
                        })]
                    }), ")")]
                }), ")"),
                await sql.build(helpers.id, " not in (", sql.query({
                    select: () => [message.volunteer],
                    from: message,
                    where: async () => [message.where({
                        createDate: { ">": threeDayAgo }
                    })]
                }), ")"),

            ],

        })
            + (await sql.build(" order by (", sql.query({
                from: message,
                select: () => [sql.max(message.createDate)],
                where: () => [sql.eq(message.volunteer, helpers.id)]
            }), ") nulls first"))
            + (this.limit ? " limit " + this.limit : '');
        console.log(q);
        return (await db.execute(q)).rows as { phone: string, name: string, id: string }[];
    }
    buildMessage(name: string, settings: ApplicationSettings) {
        return new messageMerger([
            { token: 'מתנדב', caption: "שם המתנדב", value: name },
            { token: 'קישור', caption: 'קישור לרישום', value: this.remult.getOrigin() + '/' + Sites.getOrganizationFromContext(this.remult) + '/events' },
            { token: 'ארגון', caption: "שם הארגון", value: settings.organisationName },
            { token: 'עיר', value: this.city },

        ]);
    }
    @BackendMethod({ allowed: Roles.admin })
    async count() {
        return (await this.getVolunteers()).length;
    }

}