//import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/dist-server/radweb');


import { SqlDatabase,    FieldRef } from 'remult';
import * as AWS from 'aws-sdk';





import { serverInit } from "./serverInit";


import { Remult } from 'remult';
import { GeocodeCache, GeocodeInformation, getAddress } from "../shared/googleApiHelpers";
import { Sites } from "../sites/sites";
import * as fs from 'fs';
import { processPhone } from "../import-from-excel/import-from-excel.component";

import { Helpers } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { Families } from '../families/families';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { volunteersInEvent, Event } from '../events/events';




let match = 0;
export async function DoIt() {
    try {
        var x = await serverInit();
        const accountSID = process.env.twilio_accountSID;
        const authToken = process.env.twilio_authToken;

        let twilio = await import('twilio');
        let client = twilio(accountSID, authToken);
        try {
            let r = await client.messages.create({
                to: '+972507330590',
                from: '+972525073567',
                body: 'testing 123'
            });
            console.dir(r);
        }
        catch (err) {
            console.error(err);
        }
        //await sendMessagE();
        //   await loadTranslationXlsx('c:/temp/newen.xlsx','en');
        //        await buildDocs();
        console.log('doing it');











        //   await ImportFromExcel();
    }
    catch (err) {
        console.error(err);
    }

}
DoIt();

async function sendMessagE() {
    let r = await new AWS.SNS({ apiVersion: '2010-03-31' }).publish({
        Message: `Hello Noam Honig
To deliver packages for Milano Helpers Click on :http://localhost:4200/test3/x/Ad6tTwFCpb
Thanks Noam Honig`,
        PhoneNumber: '+972507330590',
        MessageAttributes: {
            'AWS.SNS.SMS.SenderID': {
                'DataType': 'String',
                'StringValue': 'FOODBANK'
            }
            // ,
            // 'AWS.SNS.SMS.SMSType': {
            //     'DataType': 'String',
            //     'StringValue': 'Transactional'
            // }
        }
    }).promise();
    console.log(r);
}

function workOnPhones() {
    let data = fs.readFileSync('c:/temp/test.txt');
    let lines = data.toString().split('\r\n');
    let rows = [];
    let result = "<html><body dir=rtl><table border=1>";
    for (let l of lines) {
        try {
            l = l.substring(1, l.length - 1);
            let r = processPhone(l);
            let x = {
                input: l
            };
            result += "\r\n";
            let dec = "<tr>";
            let row = "<td>" + l + "</td>";
            for (let i = 0; i < r.length; i++) {
                const element = r[i];
                row += `<td>${element.phone}</td><td>${element.comment}</td>`;
                x["p" + i] = element.phone;
                x["c" + i] = element.comment;
                if (element.phone.length < 7 || element.phone.length > 13)
                    dec = '<tr style="background-color:yellow">';
            }
            result += dec + row + "</tr>";
            rows.push(x);
        }
        catch (err) {
            console.error(l, err);
        }
    }
    fs.writeFileSync('c:/temp/result.html', result + "</table></body></html>");
}


class htmlReport {
    result = '<html><body dir=tl style="font-family:\'Segoe UI\';"><table border=1>';
    addRow(...what: any[]) {
        this.result += "\r\n<tr>";
        for (let v of what) {
            let z = v as FieldRef<any>;
            if (z.displayValue)
                v = v.displayValue;
            if (v === undefined)
                v = '';
            this.result += "<td>" + v + "</td>";
        }
        this.result += "</tr>";
    }
    writeToFile() {
        fs.writeFileSync('c:/temp/result.html', this.result + "</table></body></html>");
    }
}

async function buildDocs() {
    var c = new Remult();
    
    var s = "## Data Model\n Here's a detailed list of all the entities used in the rest api";
    let list: any[] = [Families, FamilyDeliveries, Helpers, Event, volunteersInEvent, ApplicationSettings];
    // for (const iterator of allEntities) {
    //     if (!list.includes(iterator) && iterator)
    //         list.push(iterator);

    // }


    for (const type of list) {

        var e = c.repo(type).metadata;
        s += "\n\n## " + e.key + `
| name | caption | type | extra info |
| --- | --- | --- | --- |
`;
        for (const c of e.fields) {
            let extra = '';
            
            s += "| " + c.key + " | " + c.caption + " | " + c.constructor.name.replace(/Column/g, '') + " | " + extra + " |\n";
        }
    }
    fs.writeFileSync("./docs/model.md", s);
}

