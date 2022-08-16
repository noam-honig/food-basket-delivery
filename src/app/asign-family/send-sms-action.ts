import { BackendMethod, remult } from 'remult';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { HelpersBase } from '../helpers/helpers';
import * as fetch from 'node-fetch';
import { Roles } from "../auth/roles";
import { Sites } from '../sites/sites';
import { getLang } from '../sites/sites';
import { TranslationOptions } from '../translate';
import * as FormData from 'form-data';
export class SendSmsAction {
    static getSuccessMessage(template: string, orgName: string, family: string) {
        return template
            .replace('!ארגון!', orgName).replace("!ORG!", orgName)
            .replace('!משפחה!', family);
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async SendSms(h: HelpersBase, reminder: Boolean) {

        try {
            await SendSmsAction.generateMessage(h, remult.context.getOrigin(), reminder, remult.user.name, async (phone, message, sender) => {

                await new SendSmsUtils().sendSms(phone, message, h);
                await SendSmsAction.documentHelperMessage(reminder, h, "SMS");
            });
        }
        catch (err) {
            console.error(err);
        }
    }




    public static async documentHelperMessage(reminder: Boolean, hi: HelpersBase, type: string) {
        let h = await hi.getHelper();
        if (reminder)
            h.reminderSmsDate = new Date();
        else
            h.smsDate = new Date();
        await h.save();
    }

    static async generateMessage(helperIn: HelpersBase, origin: string, reminder: Boolean, senderName: string, then: (phone: string, message: string, sender: string, url: string) => Promise<void>) {
        let helper = await helperIn.getHelper();
        if (!origin) {
            throw 'Couldnt determine origin for sms';
        }
        let org = Sites.getOrganizationFromContext(remult);
        if (org.length > 0) {
            origin = origin + '/' + org;
        }

        if (helper) {
            if (helper.veryUrlKeyAndReturnTrueIfSaveRequired()) {
                await helper.save();
            }
            let message = '';
            let settings = await ApplicationSettings.getAsync(remult);
            if (reminder) {
                message = settings.reminderSmsText;

            }
            else {

                message = settings.smsText;
                if (!message || message.trim().length == 0) {
                    message = getLang(remult).defaultSmsText;
                }
            }
            let url = origin + '/x/' + helper.shortUrlKey;
            message = SendSmsAction.getMessage(message, settings.organisationName, '', helper.name, senderName, url);
            let sender = await SendSmsAction.getSenderPhone();

            await then(helper.phone.thePhone, message, sender, url);
            var x = 1 + 1;

        }
    }
    public static async getSenderPhone() {
        let sender = (await ApplicationSettings.getAsync(remult)).helpPhone?.thePhone;
        if (!sender || sender.length < 3) {
            sender = (await remult.context.getCurrentUser()).phone.thePhone;
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


    static twilioSendSms: (to: string, body: string, forWho: TranslationOptions) => Promise<any>;

    async sendSms(phone: string, message: string, helper: HelpersBase, info?: {
        familyId?: string,
        eventId?: string
    }) {
        var schema = Sites.getOrganizationFromContext(remult);
        var settings = await ApplicationSettings.getAsync(remult)
        let un = process.env.SMS_UN;
        let pw = process.env.SMS_PW;
        let accid = process.env.SMS_ACCID;
        const inforuToken = process.env.INFORU_SMS_TOKEN;
        let useGlobalSms = !inforuToken;
        var from = settings.isSytemForMlt ? 'Mitchashvim' : 'Hagai';
        if (settings.bulkSmsEnabled) {
            if (settings.smsVirtualPhoneNumber)
                from = settings.smsVirtualPhoneNumber;
            un = settings.smsUsername;
            pw = settings.smsCredentials.password;
            accid = settings.smsClientNumber;
            useGlobalSms = true;
        }


        var t = new Date();
        var date = t.getFullYear() + '/' + (t.getMonth() + 1) + '/' + t.getDate() + ' ' + t.getHours() + ':' + t.getMinutes() + ':' + t.getSeconds();




        const send = async () => {
            if (false) {
                console.log({ phone, message });
                return;
            }
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
                        let r = await SendSmsUtils.twilioSendSms(internationalPhone, message, settings.forWho);

                        console.log(r);
                        return r;
                    }
                    else {
                        let AWS = await import('aws-sdk');
                        let r = await new AWS.SNS({ apiVersion: '2010-03-31' }).publish({
                            Message: message,
                            PhoneNumber: internationalPhone,
                            MessageAttributes: {
                                'AWS.SNS.SMS.SenderID': {
                                    'DataType': 'String',
                                    'StringValue': 'HAGAI'
                                }
                            }
                        }).promise();
                        console.log(phone, r);
                        return r;
                    }
                } else {
                    message = message.replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&apos;');

                    if (useGlobalSms) {
                        let data =
                            '<?xml version="1.0" encoding="utf-8"?>' +
                            '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
                            '<soap12:Body>' +
                            '<sendSmsToRecipients xmlns="apiItnewsletter">' +
                            '<un>' + un + '</un>' +
                            '<pw>' + pw + '</pw>' +
                            '<accid>' + accid + '</accid>' +
                            '<sysPW>' + 'itnewslettrSMS' + '</sysPW>' +
                            '<t>' + date + '</t>' +
                            '<txtUserCellular>' + from + '</txtUserCellular>' +
                            '<destination>' + phone + '</destination>' +
                            '<txtSMSmessage>' + message + '</txtSMSmessage>' +
                            '<dteToDeliver></dteToDeliver>' +
                            '<txtAddInf>jsnodetest</txtAddInf>' +
                            '</sendSmsToRecipients>' +
                            '</soap12:Body>' +
                            '</soap12:Envelope>';
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
                        return res;
                    }
                    else {
                        const data = `
<Inforu>
<User>
<Username>${process.env.INFORU_SMS_USER}</Username>
<ApiToken>${inforuToken}</ApiToken>
</User>
<Content Type="sms">
<Message>${message}</Message>
</Content>
<Recipients>
<PhoneNumber>${phone}</PhoneNumber>
</Recipients>
<Settings>
<Sender>${from}</Sender>
</Settings>
</Inforu>`;
                        let h = new fetch.Headers();
                        var formData = new FormData();

                        formData.append("InforuXML", data);

                        let r = await fetch.default('https://api.inforu.co.il/SendMessageXml.ashx', {
                            method: 'POST',
                            headers: formData.getHeaders(),
                            body: formData
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
                        return res;
                    }
                }

            }
            catch (err) {
                console.error('sms error ', err);
                return err;
            }
        }
        let apiResponse = await send();

        await remult.repo((await import('../in-route-follow-up/in-route-helpers')).HelperCommunicationHistory).create({
            volunteer: helper,
            apiResponse,
            message,
            phone,
            family: info?.familyId,
            eventId: info?.eventId


        }).save();
        if (apiResponse && typeof apiResponse !== "string")
            apiResponse = JSON.stringify(apiResponse);
        return apiResponse;
    }
}

/*
[] test send sms with twilio and aws to see that we didn't break anything
[] block send test sms to only work for  bulk enabled
    if (!settings.bulkSmsEnabled)
        throw "can only use this with bulk sms enabled";
[] remember to return this all to only work with bulk enabled
/test?cell=0507330590&message=Test&date=26%2f10%2f2021+06%3a06%3a27&destination=055-9793527
[] Make sure to add remove me.
*/