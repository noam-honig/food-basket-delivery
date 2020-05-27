//import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/dist-server/radweb');

import { readFileSync } from "fs";
import { SqlDatabase, Column } from '@remult/core';
import * as AWS from 'aws-sdk';
import * as request from 'request';





import { serverInit } from "./serverInit";


import { ServerContext, allEntities } from '@remult/core';
import { GeocodeCache, GeocodeInformation } from "../shared/googleApiHelpers";
import { Sites } from "../sites/sites";
import * as fs from 'fs';
import { processPhone } from "../import-from-excel/import-from-excel.component";
import { Language } from "../translate";
import { jsonToXlsx } from "../shared/saveToExcel";



let match = 0;
export async function DoIt() {
    try {
        await serverInit();


        let data = fs.readFileSync('./src/assets/languages/en.txt');
        let lines = data.toString().split('\r\n');
        let knownTranslations = new Map<string, string>();
        for (let index = 0; index < lines.length; index += 2) {
            knownTranslations.set(lines[index], lines[index + 1]);
        }
        if (lines.length % 2 == 1) {
            lines.splice(lines.length - 1, 1);
        }

        let result = '';

        let l = new Language();
        let keys: translationEntry[] = [];
        for (const key in l) {
            if (l.hasOwnProperty(key)) {
                const element: string[] = l[key].split('\n');
                for (let index = 0; index < element.length; index++) {
                    const term = element[index];
                    var trans = knownTranslations.get(term);
                    if (!trans) {
                        trans = await translate(term);
                        knownTranslations.set(term, trans);
                        lines.push(term);
                        lines.push(trans);
                    }
                    element[index] = trans;
                }
                let r = element.join('\\n');
                let v = r;
                if (r.includes('\''))
                    r = '"' + r + '"';
                else
                    r = "'" + r + "'";
                result += '  ' + key + " = " + r + ';\n';
                keys.push({ key: key, value: v, valueInHebrew: l[key] });
            }
        }
        keys.sort((a, b) => a.key.localeCompare(b.key));
        let XLSX = await import('xlsx');
        let wb = XLSX.utils.book_new();
        wb.Workbook = { Views: [{ RTL: true }] };
        let ws = XLSX.utils.json_to_sheet(keys);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
        XLSX.writeFile(wb, './src/app/languages/en.xlsx');
        fs.writeFileSync('./src/app/languages/en.json', JSON.stringify(keys.map(x => ({ [x.key]: { google: x.value, orig: x.valueInHebrew } })), undefined, 2))


        fs.writeFileSync('./src/app/languages/en.ts',
            'import { Language } from "../translate";\nexport class en implements Language {\n' + result + '}');
        //        let result = await translate('שלום לכם');
        console.log(result);
        fs.writeFileSync('./src/assets/languages/en.txt', lines.join('\r\n'));







        //   await ImportFromExcel();
    }
    catch (err) {
        console.error(err);
    }

}
DoIt();
async function sendMessagE() {
    let r = await new AWS.SNS({ apiVersion: '2010-03-31' }).publish({
        Message: 'בדיקה ראשונה שלי',
        PhoneNumber: '+972507330590',
        MessageAttributes: {
            'AWS.SNS.SMS.SenderID': {
                'DataType': 'String',
                'StringValue': '972507330590'
            }
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

async function translate(s: string) {
    let fromLang = 'he';
    let toLang = "en";
    return new Promise<string>((resolve, reject) => {
        request("https://www.googleapis.com/language/translate/v2?key=" + process.env.google_key + "&source=" + fromLang + "&target=" + toLang + "&format=text", {
            method: 'post',
            body: JSON.stringify({ q: s })
        }, (err, res, body) => {
            let theBody = JSON.parse(body);
            let x = theBody.data;
            if (x)
                resolve(x.translations[0].translatedText);
            else {
                console.error(theBody, err);
                reject(err);
            };
        });
    });
}

class htmlReport {
    result = '<html><body dir=rtl style="font-family:\'Segoe UI\';"><table border=1>';
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

interface translationEntry {
    key: string;
    value: string;
    valueInHebrew: string;
}
