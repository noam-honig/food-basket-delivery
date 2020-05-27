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


        await buildLanguageFiles();
        
        








        //   await ImportFromExcel();
    }
    catch (err) {
        console.error(err);
    }

}
DoIt();
async function buildLanguageFiles() {
    let known = JSON.parse(fs.readFileSync('./src/app/languages/en.json').toString());
    let result = '';
    let l = new Language();
    let keys: translationEntry[] = [];
    for (const key in l) {
        if (l.hasOwnProperty(key)) {
            let knownVal: translation = known[key];
            if (!knownVal) {
                const element: string[] = l[key].split('\n');
                for (let index = 0; index < element.length; index++) {
                    const term = element[index];
                    let trans = await translate(term);
                    element[index] = trans;
                }
                knownVal = { google: element.join('\\n'), valueInCode: l[key] };
                known[key] = knownVal;
            }
            knownVal.valueInCode = l[key];
            let v = knownVal.google;
            if (knownVal.custom)
                v = knownVal.custom;
            let r = v;
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
    let json = {};
    for (const x of keys) {
        json[x.key] = known[x.key];
    }
    ;
    fs.writeFileSync('./src/app/languages/en.json', JSON.stringify(json, undefined, 2));
    fs.writeFileSync('./src/app/languages/en.ts', 'import { Language } from "../translate";\nexport class en implements Language {\n' + result + '}');
}

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
interface translation {
    google: string;
    custom?: string;
    valueInCode: string;
}
