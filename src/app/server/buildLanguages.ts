import * as fs from "fs";
import { Language } from "../translate";
import { jsonToXlsx } from "../shared/saveToExcel";
import * as request from 'request';

export async function buildLanguageFiles() {

    for (const lang of ["en", "es", "it"]) {
        let fileAndClassName = lang;
        if (lang=='it'){
            fileAndClassName = 'italy';
        }
        let known = {};
        try { known = JSON.parse(fs.readFileSync('./src/app/languages/' + fileAndClassName + '.json').toString()); }
        catch{}
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
                        let trans = await translate(term, lang);
                        element[index] = trans;
                    }
                    knownVal = { google: element.join('\\n'), valueInCode: l[key] };
                    known[key] = knownVal;
                }
                knownVal.valueInCode = l[key];
                let v = knownVal.google;
                if (knownVal.custom)
                    v = knownVal.custom;
                if (key=='languageCode')
                    v = lang;
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
        XLSX.writeFile(wb, '/temp/' + fileAndClassName + '.xlsx');
        let json = {};
        for (const x of keys) {
            json[x.key] = known[x.key];
        }
        ;
        fs.writeFileSync('./src/app/languages/' + lang + '.json', JSON.stringify(json, undefined, 2));
        fs.writeFileSync('./src/app/languages/' + lang + '.ts', 'import { Language } from "../translate";\nexport class ' + fileAndClassName + ' implements Language {\n' + result + '}');
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

async function translate(s: string, toLang: string) {
    let fromLang = 'iw';

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
