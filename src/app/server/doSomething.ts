//import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/dist-server/radweb');


import { SqlDatabase, Column } from '@remult/core';
import * as AWS from 'aws-sdk';





import { serverInit } from "./serverInit";


import { ServerContext, allEntities } from '@remult/core';
import { GeocodeCache, GeocodeInformation, getAddress } from "../shared/googleApiHelpers";
import { Sites } from "../sites/sites";
import * as fs from 'fs';
import { processPhone } from "../import-from-excel/import-from-excel.component";
import { buildLanguageFiles, loadTranslationXlsx } from "./buildLanguages";



let match = 0;
export async function DoIt() {
    try {
        await serverInit();
        //await sendMessagE();
        //   await loadTranslationXlsx('c:/temp/newen.xlsx','en');

        // await buildLanguageFiles();
        let h = new htmlReport();
        var dp = Sites.getDataProviderForOrg('test3');
        var context = new ServerContext(dp);
        for (const g of await context.for(GeocodeCache).find()) {
            let geo = GeocodeInformation.fromString(g.googleApiResult.value);
            if (geo.info.results[0]) {
                let r = [];
                r.push(g.id.value);
                if (g.id.value.includes('Upperbuitenkant')) {
                    ''.toString();
                }
                r.push(geo.info.results[0].formatted_address);
                r.push(getAddress(geo.info.results[0]));
                //r.push(...geo.info.results[0].address_components.map(y => { return '[' + y.types.join(',') + '] ' + y.short_name }))
                h.addRow(...r);
            }
        }
        h.writeToFile();










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
            if (v instanceof Column)
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

