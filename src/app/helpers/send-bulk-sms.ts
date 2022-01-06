import { BackendMethod, Controller, Field, Filter, getFields, Remult, SqlDatabase } from "remult";
import { FamilyDeliveries } from "../families/FamilyDeliveries";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Helpers } from "./helpers";
import { Event, volunteersInEvent, eventStatus } from '../events/events';
import { HelperCommunicationHistory } from "../in-route-follow-up/in-route-helpers";
import { Roles } from "../auth/roles";
import { Families } from "../families/families";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { EditCustomMessageComponent, messageMerger } from "../edit-custom-message/edit-custom-message.component";
import { Sites } from "../sites/sites";
import { SendSmsUtils } from "../asign-family/send-sms-action";
import { openDialog, RowButton } from "@remult/angular";
import { DialogService } from "../select-popup/dialog";

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
    async sendBulkDialog(dialog: DialogService, currentHelper: Helpers) {
        let messageCount = await this.count();
        this.editInviteMethod(dialog, currentHelper, {
            send: () => this.send(),
            messageCount

        })
    }
    sendSingleHelperButton(dialog: DialogService) {
        return {
            name: "שליחת הודעת זימון",
            click: async (h: Helpers) => {
                this.editInviteMethod(dialog, h, {
                    send: async () => {
                        if (h.doNotSendSms) {
                            if (!await dialog.YesNoPromise("המתנדב ביקש לא לקבל הודעות, האם לשלוח בכל זאת?"))
                                return;
                        }
                        if (await this.remult.repo(HelperCommunicationHistory).count({
                            volunteer: h,
                            createDate: { ">=": this.yesterdayMorning() }
                        }) > 0) {
                            if (!await dialog.YesNoPromise("כבר נשלחה למתנדב הודעה מאתמול בבוקר, האם לשלוח בכל זאת?"))
                                return;
                        }


                        await this.sendSingleMessage(h.id);
                        return 1;
                    },
                    messageCount: 1
                })
            },
            visible: () => this.remult.isAllowed(Roles.admin) && getSettings(this.remult).bulkSmsEnabled
        }
    }


    private async editInviteMethod(
        dialog: DialogService,
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
        let settings = (await this.remult.getSettings());
        await openDialog(EditCustomMessageComponent, edit => edit.args = {
            message: this.buildMessage(currentHelper.name, settings),
            templateText: settings.inviteVolunteersMessage || defaultMessage,
            helpText: '',
            title: settings.lang.sendMessageToInviteVolunteers + ' ' + settings.lang.to + ' ' + args.messageCount + ' ' + settings.lang.volunteers,
            buttons: [{
                name: 'שלח הודעה',
                click: async () => {
                    settings.inviteVolunteersMessage = edit.args.templateText;
                    await settings.save();
                    if (await dialog.YesNoPromise(settings.lang.sendMessageToInviteVolunteers + ' ' + settings.lang.to + ' ' + args.messageCount + ' ' + settings.lang.volunteers + "?")) {
                        let r = await args.send();
                        dialog.Info(r + " הודעות נשלחו");
                        edit.ref.close();
                    }
                }
            }]
        });
    }
    @Field({ caption: 'רק כאלו שהתנדבו בעבר בעיר' })
    city: string = '';
    @Field({ caption: "הגבלת מספר הודעות" })
    limit: number = 100;

    @BackendMethod({ allowed: Roles.admin })
    private async sendSingleMessage(helperId: string) {
        let helper = await this.remult.repo(Helpers).findId(helperId);
        let settings = await ApplicationSettings.getAsync(this.remult);
        if (!settings.bulkSmsEnabled)
            throw ("Forbidden");
        let message = this.buildMessage(helper.name, settings).merge(settings.inviteVolunteersMessage);
        if (true)
            await new SendSmsUtils().sendSms(helper.phone.thePhone, message, this.remult, helper);

        else
            console.log(message);
    }

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
        let twoDaysAgo = this.yesterdayMorning();
        let q = await sql.query({
            from: helpers,
            select: () => [helpers.phone, helpers.name, helpers.id],
            where: async () => [
                await Filter.translateCustomWhere(helpers.where({
                    archive: false, doNotSendSms: false,
                    $and: [this.city && Helpers.deliveredPreviously({ city: this.city })]
                }), helpers.metadata, this.remult),

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
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
        twoDaysAgo.setHours(0);
        return twoDaysAgo;
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