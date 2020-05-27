import { ServerFunction } from '@remult/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Helpers } from '../helpers/helpers';
import * as fetch from 'node-fetch';
import { Context, ServerContext } from '@remult/core';
import { Roles } from "../auth/roles";
import { Sites } from '../sites/sites';




export class SendSmsAction {
    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async SendSms(helperId: string, reminder: Boolean, context?: ServerContext) {

        try {
            let h = await context.for(Helpers).findId(helperId);
            await SendSmsAction.generateMessage(context, h, context.getOrigin(), reminder, context.user.name, async (phone, message, sender) => {

                new SendSmsUtils().sendSms(phone, sender, message, context.getOrigin(), Sites.getOrganizationFromContext(context));
                if (reminder)
                    h.reminderSmsDate.value = new Date();
                else
                    h.smsDate.value = new Date();
                await h.save();
            });
        }
        catch (err) {
            console.error(err);
        }
    }




    static async  generateMessage(ds: Context, helper: Helpers, origin: string, reminder: Boolean, senderName: string, then: (phone: string, message: string, sender: string, url: string) => void) {

        if (!origin) {
            throw 'Couldnt determine origin for sms';
        }
        let org = Sites.getOrganizationFromContext(ds);
        if (org.length > 0) {
            origin = origin + '/' + org;
        }

        if (helper) {
            if (helper.veryUrlKeyAndReturnTrueIfSaveRequired()) {
                await helper.save();
            }
            let message = '';
            let settings = await ApplicationSettings.getAsync(ds);
            if (reminder) {
                message = settings.reminderSmsText.value;

            }
            else {

                message = settings.smsText.value;
                if (!message || message.trim().length == 0) {
                    message = 'שלום !מתנדב! לחלוקת חבילות !ארגון! לחץ על: !אתר! תודה !שולח!';
                }
            }
            let url = origin + '/x/' + helper.shortUrlKey.value;
            message = SendSmsAction.getMessage(message, settings.organisationName.value, helper.name.value, senderName, url);
            let sender = await SendSmsAction.getSenderPhone(ds);

            then(helper.phone.value, message, sender, url);
            await helper.save();
            var x = 1 + 1;

        }
    }
    public static async getSenderPhone(context: Context) {
        let sender = (await ApplicationSettings.getAsync(context)).helpPhone.value;
        if (!sender || sender.length < 3) {
            let currentUser = await (context.for(Helpers).findFirst(h => h.id.isEqualTo(context.user.id)));
            sender = currentUser.phone.value;
        }
        return sender;
    }

    static getMessage(template: string, orgName: string, courier: string, sender: string, url: string) {
        return template.replace('!מתנדב!', courier).replace('!משנע!', courier).replace('!שולח!', sender).replace('!ארגון!', orgName).replace('!אתר!', url)

    }
}

export interface SendSmsInfo {

    helperId: string;
    reminder: Boolean;
}
export interface SendSmsResponse {


}

export class SendSmsUtils {
    un = process.env.SMS_UN;
    pw = process.env.SMS_PW;
    accid = process.env.SMS_ACCID;


    async sendSms(phone: string, from: string, text: string, org: string, schema: string) {

        var t = new Date();
        var date = t.getFullYear() + '/' + (t.getMonth() + 1) + '/' + t.getDate() + ' ' + t.getHours() + ':' + t.getMinutes() + ':' + t.getSeconds();

        var data =
            '<?xml version="1.0" encoding="utf-8"?>' +
            '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
            '<soap12:Body>' +
            '<sendSmsToRecipients xmlns="apiItnewsletter">' +
            '<un>' + this.un + '</un>' +
            '<pw>' + this.pw + '</pw>' +
            '<accid>' + this.accid + '</accid>' +
            '<sysPW>' + 'itnewslettrSMS' + '</sysPW>' +
            '<t>' + date + '</t>' +
            '<txtUserCellular>' + from + '</txtUserCellular>' +
            '<destination>' + phone + '</destination>' +
            '<txtSMSmessage>' + text + '</txtSMSmessage>' +
            '<dteToDeliver></dteToDeliver>' +
            '<txtAddInf>jsnodetest</txtAddInf>' +
            '</sendSmsToRecipients>' +
            '</soap12:Body>' +
            '</soap12:Envelope>';



        try {
            let h = new fetch.Headers();
            h.append('Content-Type', 'text/xml; charset=utf-8');
            h.append('SOAPAction', 'apiItnewsletter/sendSmsToRecipients');
            let r = await fetch.default('https://sapi.itnewsletter.co.il/webservices/webservicesms.asmx', {
                method: 'POST',
                headers: h,
                body: data
            });

            let res = await r.text();
            let orig = res;
            let t = '<sendSmsToRecipientsResult>';
            let i = res.indexOf(t);
            if (i >= 0) {
                res = res.substring(i + t.length);
                res = res.substring(0, res.indexOf('<'));
            }
            console.log('sms response for:' + schema + ' - ' + res);


        }
        catch (err) {
            console.error('sms error ', err);
        }


    }
}