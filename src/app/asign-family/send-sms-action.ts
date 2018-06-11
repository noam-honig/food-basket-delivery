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

        await SendSmsAction.generateMessage(info.helperId, (phone, message) => {
            new SendSmsUtils().sendSms(phone, message);
        });

        return {};

    }
    static async  generateMessage(id: string, then: (phone: string, message: string) => void) {
        let h = new Helpers();
        let r = await h.source.find({ where: h.id.isEqualTo(id) });
        if (r.length > 0) {
            then(r[0].phone.value, 'שלום ' + r[0].name.value + ' אנא לחץ על https://hugmoms.herokuapp.com/x/' + r[0].id.value);

        }



    }
}

export interface SendSmsInfo {

    helperId: string;
}
export interface SendSmsResponse {


}

export class SendSmsUtils {
    un = process.env.SMS_UN;
    pw = process.env.SMS_PW;
    accid = process.env.SMS_ACCID;


    async sendSms(phone: string, text: string) {
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
            '<txtUserCellular>0521234567</txtUserCellular>' +
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