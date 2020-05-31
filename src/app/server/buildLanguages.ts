import * as fs from "fs";
import { Language } from "../translate";
import { jsonToXlsx } from "../shared/saveToExcel";
import * as request from 'request';
import { getMultipleValuesInSingleSelectionError } from "@angular/cdk/collections";


export async function loadTranslationXlsx(fileName: string, language: string) {
    let XLSX = await import('xlsx');
    var wb = XLSX.readFile(fileName);
    var sheet = wb.Sheets[wb.SheetNames[0]];
    let data = XLSX.utils.sheet_to_json(sheet, {
        raw: false,
        dateNF: "DD-MMM-YYYY",
        header: 1,
        defval: ""
    });
    let known = loadLangFile(language);
    for (let index = 1; index < data.length; index++) {
        const row = data[index];
        let key = row[0];
        let k = known[key];
        if (k) {
            let val = row[1].trim();
            if (val != k.google.trim() && val) {
                k.custom = val;
            }
            else {

            }
        }
        else {
            console.error(key + ' not found');
        }




    }
    saveLangFile(language, known);


}
function loadLangFile(filename: string) {
    return JSON.parse(fs.readFileSync('./src/app/languages/' + filename + '.json').toString());
}
function saveLangFile(filename: string, data: any) {
    fs.writeFileSync('./src/app/languages/' + filename + '.json', JSON.stringify(data, undefined, 2));
}
export async function buildLanguageFiles() {

    for (const lang of ["en", "es", "it"]) {
        let fileAndClassName = lang;
        if (lang == 'it') {
            fileAndClassName = 'italy';
        }
        let known = {};
        try { known = loadLangFile(fileAndClassName); }
        catch{ }
        let knownEnglish = {};
        if (lang != "en") {
            knownEnglish = loadLangFile("en");
        }
        let result = '';
        let l = new Language();
        let keys: translationEntry[] = [];
        for (const key in l) {
            if (l.hasOwnProperty(key)) {
                let knownVal: translation = known[key];
                let knownEnglishItem: translation = knownEnglish[key];
                let valueInEnglish: string = undefined;
                if (knownEnglishItem) {
                    valueInEnglish = knownEnglishItem.custom;
                    if (!valueInEnglish)
                        valueInEnglish = knownEnglishItem.google;
                    //If has no custom and english has custom and was changed
                    if (!knownVal.custom && knownEnglishItem.custom && knownEnglishItem.custom != knownVal.valueInEnglish)
                        knownVal = undefined;
                }
                if (!knownVal) {
                    let val = l[key];
                    if (valueInEnglish)
                        val = valueInEnglish;

                    const element: string[] = val.split('\n');
                    for (let index = 0; index < element.length; index++) {
                        const term = element[index];
                        let trans = await translate(term, lang);
                        element[index] = trans;
                    }
                    knownVal = { google: element.join('\\n'), valueInCode: l[key], valueInEnglish };
                    known[key] = knownVal;
                }
                knownVal.valueInCode = l[key];
                knownVal.valueInEnglish = valueInEnglish;
                let v = knownVal.google;
                if (knownVal.custom)
                    v = knownVal.custom;
                if (key == 'languageCode')
                    v = lang;
                let r = v;
                if (r.includes('\''))
                    r = '"' + r.replace(/"/g, '\\"') + '"';
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
        saveLangFile(fileAndClassName, json);
        fs.writeFileSync('./src/app/languages/' + fileAndClassName + '.ts', 'import { Language } from "../translate";\nexport class ' + fileAndClassName + ' implements Language {\n' + result + '}');
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
    valueInEnglish: string;
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
