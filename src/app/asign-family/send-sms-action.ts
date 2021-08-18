import { BackendMethod } from 'remult';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { HelpersBase } from '../helpers/helpers';
import * as fetch from 'node-fetch';
import { Remult } from 'remult';
import { Roles } from "../auth/roles";
import { Sites } from '../sites/sites';
import { getLang } from '../sites/sites';
import { TranslationOptions } from '../translate';
export class SendSmsAction {
    static getSuccessMessage(template: string, orgName: string, family: string) {
        return template
            .replace('!ארגון!', orgName).replace("!ORG!", orgName)
            .replace('!משפחה!', family);
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async SendSms(h: HelpersBase, reminder: Boolean, context?: Remult) {

        try {
            await SendSmsAction.generateMessage(context, h, context.getOrigin(), reminder, context.user.name, async (phone, message, sender) => {

                new SendSmsUtils().sendSms(phone, sender, message, context.getOrigin(), Sites.getOrganizationFromContext(context), await ApplicationSettings.getAsync(context));
                await SendSmsAction.documentHelperMessage(reminder, h, context, "SMS");
            });
        }
        catch (err) {
            console.error(err);
        }
    }




    public static async documentHelperMessage(reminder: Boolean, hi: HelpersBase, context: Remult, type: string) {
        let h = await hi.getHelper();
        if (reminder)
            h.reminderSmsDate = new Date();
        else
            h.smsDate = new Date();
        await h.save();
        let hist = context.repo((await import('../in-route-follow-up/in-route-helpers')).HelperCommunicationHistory).create();
        hist.volunteer = h;
        if (reminder) {
            hist.comment = 'Reminder ' + type;
        }
        else
            hist.comment = 'Link ' + type;
        await hist.save();
    }

    static async generateMessage(ds: Remult, helperIn: HelpersBase, origin: string, reminder: Boolean, senderName: string, then: (phone: string, message: string, sender: string, url: string) => Promise<void>) {
        let helper = await helperIn.getHelper();
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
                message = settings.reminderSmsText;

            }
            else {

                message = settings.smsText;
                if (!message || message.trim().length == 0) {
                    message = getLang(ds).defaultSmsText;
                }
            }
            let url = origin + '/x/' + helper.shortUrlKey;
            message = SendSmsAction.getMessage(message, settings.organisationName, '', helper.name, senderName, url);
            let sender = await SendSmsAction.getSenderPhone(ds);

            await then(helper.phone.thePhone, message, sender, url);
            var x = 1 + 1;

        }
    }
    public static async getSenderPhone(context: Remult) {
        let sender = (await ApplicationSettings.getAsync(context)).helpPhone?.thePhone;
        if (!sender || sender.length < 3) {
            sender = context.currentUser.phone.thePhone;
        }
        return sender;
    }

    static getMessage(template: string, orgName: string, family: string, courier: string, sender: string, url: string) {
        return template.replace('!מתנדב!', courier).replace('!משנע!', courier).replace('!VOLUNTEER!', courier)
            .replace('!משפחה!', family).replace('!FAMILY!', family)
            .replace('!תורם!', family)
            .replace('!שולח!', sender).replace('!SENDER!', sender)
            .replace('!ארגון!', orgName).replace("!ORG!", orgName)
            .replace('!אתר!', url).replace('!URL!', url);

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

    static twilioSendSms: (to: string, body: string, forWho: TranslationOptions) => Promise<any>;

    async sendSms(phone: string, from: string, text: string, org: string, schema: string, settings: ApplicationSettings) {

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
            '<txtUserCellular>' + (settings.isSytemForMlt() ? 'Mitchashvim' : 'Hagai') + '</txtUserCellular>' +
            '<destination>' + phone + '</destination>' +
            '<txtSMSmessage>' + text + '</txtSMSmessage>' +
            '<dteToDeliver></dteToDeliver>' +
            '<txtAddInf>jsnodetest</txtAddInf>' +
            '</sendSmsToRecipients>' +
            '</soap12:Body>' +
            '</soap12:Envelope>';



        try {
            let prefix = settings.forWho.args.internationalPrefixForSmsAndAws;
            if (!prefix)
                prefix = "+972";
            let internationalPhone = phone;
            if (internationalPhone.startsWith('0'))
                internationalPhone = internationalPhone.substring(1, 1000);
            if (!internationalPhone.startsWith('+'))
                internationalPhone = prefix + internationalPhone;
            if (settings.forWho.args.internationalPrefixForSmsAndAws) {
                if (SendSmsUtils.twilioSendSms) {
                    let r = await SendSmsUtils.twilioSendSms(internationalPhone, text, settings.forWho);

                    console.log(r);
                }
                else {
                    let AWS = await import('aws-sdk');
                    let r = await new AWS.SNS({ apiVersion: '2010-03-31' }).publish({
                        Message: text,
                        PhoneNumber: internationalPhone,
                        MessageAttributes: {
                            'AWS.SNS.SMS.SenderID': {
                                'DataType': 'String',
                                'StringValue': 'HAGAI'
                            }
                        }
                    }).promise();
                    console.log(phone, r);
                }
            } else {
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

        }
        catch (err) {
            console.error('sms error ', err);
        }


    }
}