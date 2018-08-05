import { ServerAction } from "../auth/server-action";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { Families, DeliveryStatus, Helpers } from "../models";
import * as fetch from 'node-fetch';


export class SendSmsAction extends ServerAction<SendSmsInfo, SendSmsResponse>{
    constructor() {
        super('send-sms');//required because of minification
    }
    protected async execute(info: SendSmsInfo, req: DataApiRequest<myAuthInfo>): Promise<SendSmsResponse> {
        let result: myAuthInfo;

        let currentUser = new Helpers();
        console.log(req.authInfo.helperId);
        let y = await (currentUser.source.find({ where: currentUser.id.isEqualTo(req.authInfo.helperId) }));

        await SendSmsAction.generateMessage(info.helperId, req.getHeader('origin'), info.reminder, req.authInfo.name, (phone, message) => {

            new SendSmsUtils().sendSms(phone, y[0].phone.value, message);
        });

        return {};

    }



    static async  generateMessage(id: string, origin: string, reminder: Boolean, senderName: string, then: (phone: string, message: string) => void) {
        let h = new Helpers();
        if (!origin) {
            throw 'Couldnt determine origin for sms';
        }
        let r = await h.source.find({ where: h.id.isEqualTo(id) });
        if (r.length > 0) {
            if (r[0].veryUrlKeyAndReturnTrueIfSaveRequired()) {
                await r[0].save();
            }
            let message = 'שלום ' + r[0].name.value;
            if (reminder) {
                message += " טרם נרשם במערכת שבוצעה החלוקה, אנא עדכן אותנו אם יש צורך בעזרה או עדכן שהמשלוח הגיע ליעדו"
                message += ' אנא לחץ על ' + origin + '/x/' + r[0].shortUrlKey.value;
                r[0].reminderSmsDate.dateValue = new Date();
            }
            else {
                r[0].smsDate.dateValue = new Date();
                message += ', לחלוקת חבילות אימהות מחבקות אבן יהודה והסביבה לחץ על: ' + origin + '/x/' + r[0].shortUrlKey.value;
                message += '\nתודה ' + senderName;
            }
            then(r[0].phone.value, message);
            await r[0].save();


        }



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


    async sendSms(phone: string, from: string, text: string) {
        console.log('from', from);
        console.log('phone', phone);
        console.log('text', text);

        var t = new Date();
        var date = t.getFullYear() + '/' + (t.getMonth() + 1) + '/' + t.getDate() + ' ' + t.getHours() + ':' + t.getMinutes() + ':' + t.getSeconds();
        //console.log("date is :" + date);

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
        console.log(data);


        try {
            let h = new fetch.Headers();
            h.append('Content-Type', 'text/xml; charset=utf-8');
            h.append('SOAPAction', 'apiItnewsletter/sendSmsToRecipients');
            let r = await fetch.default('https://sapi.itnewsletter.co.il/webservices/webservicesms.asmx', {
                method: 'POST',
                headers: h,
                body: data
            });
            console.log(r, await r.text());

        }
        catch (err) {
            console.log('sms error ', err);
        }


    }
}