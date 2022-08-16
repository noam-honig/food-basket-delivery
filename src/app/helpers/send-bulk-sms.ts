import { BackendMethod, Controller, Filter, getFields, remult, Remult, SqlDatabase } from "remult";
import { FamilyDeliveries } from "../families/FamilyDeliveries";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Helpers } from "./helpers";
import { Event, volunteersInEvent, eventStatus } from '../events/events';
import { HelperCommunicationHistory } from "../in-route-follow-up/in-route-helpers";
import { Roles } from "../auth/roles";
import { Families } from "../families/families";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { messageMerger } from "../edit-custom-message/messageMerger";
import { Sites } from "../sites/sites";
import { SendSmsUtils } from "../asign-family/send-sms-action";
import { UITools } from "./init-context";
import { Field } from "../translate";

@Controller("SendBulkSms")
export class SendBulkSms {
    @BackendMethod({ allowed: Roles.admin, queue: true })
    async send() {
        let i = 0;

        for (const v of await this.getVolunteers()) {
            await this.sendSingleMessage(v.id);
            i++;
        }
        return i;
    }
    constructor(private remult: Remult) { }
    async sendBulkDialog(ui: UITools, currentHelper: Helpers) {
        let messageCount = await this.count();
        this.editInviteMethod(ui, currentHelper, {
            send: () => this.send(),
            messageCount

        })
    }
    sendSingleHelperButton(ui: UITools) {
        return {
            name: "שליחת הודעת זימון",
            click: async (h: Helpers) => {
                this.editInviteMethod(ui, h, {
                    send: async () => {
                        if (h.doNotSendSms) {
                            if (!await ui.YesNoPromise("המתנדב ביקש לא לקבל הודעות, האם לשלוח בכל זאת?"))
                                return;
                        }
                        if (await remult.repo(HelperCommunicationHistory).count({
                            volunteer: h,
                            createDate: { ">=": this.yesterdayMorning() }
                        }) > 0) {
                            if (!await ui.YesNoPromise("כבר נשלחה למתנדב הודעה מאתמול בבוקר, האם לשלוח בכל זאת?"))
                                return;
                        }


                        await this.sendSingleMessage(h.id);
                        return 1;
                    },
                    messageCount: 1
                })
            },
            visible: () => remult.isAllowed(Roles.admin) && getSettings(remult).bulkSmsEnabled
        }
    }


    private async editInviteMethod(
        ui: UITools,
        currentHelper: Helpers,
        args: {
            messageCount: number,
            send: () => Promise<number>
        }) {
        let defaultMessage = `הי !מתנדב!
    אנו זקוקים למתנדבים לחלוקה לניצולי שואה ב!עיר! ביום חמישי, נשמח לעזרה והרשמה בלינק:
    !קישור!
    
    בתודה !ארגון!
    להסרה השב "הסר"`;
        let settings = (await remult.context.getSettings());
        await ui.editCustomMessageDialog({
            message: this.buildMessage(currentHelper.name, settings),
            templateText: settings.inviteVolunteersMessage || defaultMessage,
            helpText: '',
            title: settings.lang.sendMessageToInviteVolunteers + ' ' + settings.lang.to + ' ' + args.messageCount + ' ' + settings.lang.volunteers,
            buttons: [{
                name: 'שלח הודעה',
                click: async ({ templateText, close }) => {
                    settings.inviteVolunteersMessage = templateText;
                    await settings.save();
                    if (await ui.YesNoPromise(settings.lang.sendMessageToInviteVolunteers + ' ' + settings.lang.to + ' ' + args.messageCount + ' ' + settings.lang.volunteers + "?")) {
                        let r = await args.send();
                        ui.Info(r + " הודעות נשלחו");
                        close();
                    }
                }
            }]
        });
    }
    @Field({ caption: 'רק כאלו שהתנדבו בעבר בעיר' })
    city: string = '';
    @Field({ caption: "הגבלת מספר הודעות" })
    limit: number = 100;
    @Field({ caption: 'הגבלת שעות משליחה קודמת' })
    hours: number = 48;

    @BackendMethod({ allowed: Roles.admin })
    private async sendSingleMessage(helperId: string) {
        let helper = await remult.repo(Helpers).findId(helperId);
        let settings = await ApplicationSettings.getAsync(remult);
        if (!settings.bulkSmsEnabled)
            throw ("Forbidden");
        let message = this.buildMessage(helper.name, settings).merge(settings.inviteVolunteersMessage);
        if (true)
            await new SendSmsUtils().sendSms(helper.phone.thePhone, message, remult, helper);

        else
            console.log(message);
    }

    get $() { return getFields(this) }
    async getVolunteers() {
        let db = remult._dataSource as SqlDatabase;
        let sql = new SqlBuilder(remult);
        let helpers = SqlFor(remult.repo(Helpers));
        let fd = SqlFor(remult.repo(FamilyDeliveries));
        let f = SqlFor(remult.repo(Families));
        let events = SqlFor(remult.repo(Event))
        let ve = SqlFor(remult.repo(volunteersInEvent));
        let message = SqlFor(remult.repo(HelperCommunicationHistory));
        let twoDaysAgo = this.yesterdayMorning();
        let q = await sql.query({
            from: helpers,
            select: () => [helpers.phone, helpers.name, helpers.id],
            where: async () => [
                await Filter.translateCustomWhere(helpers.where({
                    archive: false, doNotSendSms: false, isFrozen: false,
                    $and: [this.city && Helpers.deliveredPreviously({ city: this.city })]
                }), helpers.metadata, remult),

                await sql.build(helpers.id, " not in (", sql.query({
                    select: () => [sql.build('distinct ', fd.courier)],
                    from: fd,
                    where: () => [fd.where({
                        archive: false
                    })]
                }), ")"),
                await sql.build(helpers.id, " not in (", sql.query({
                    select: () => [sql.build('distinct ',f.fixedCourier)],
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
                    select: () => [sql.build('distinct ',message.volunteer)],
                    from: message,
                    where: async () => [message.where({
                        createDate: { ">": twoDaysAgo }
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
    private yesterdayMorning() {
        let twoDaysAgo = new Date();
        twoDaysAgo.setHours(twoDaysAgo.getHours() - this.hours);
        return twoDaysAgo;
    }

    buildMessage(name: string, settings: ApplicationSettings) {
        return new messageMerger([
            { token: 'מתנדב', caption: "שם המתנדב", value: name },
            { token: 'קישור', caption: 'קישור לרישום', value: remult.context.getSettings() + '/' + Sites.getOrganizationFromContext(remult) + '/events' },
            { token: 'ארגון', caption: "שם הארגון", value: settings.organisationName },
            { token: 'עיר', value: this.city },

        ]);
    }
    @BackendMethod({ allowed: Roles.admin })
    async count() {
        return (await this.getVolunteers()).length;
    }

}