import { Families } from "../models";
import { readFileSync, readFile } from "fs";
import { ColumnHashSet } from "radweb";

import { GetGeoInformation } from "../shared/googleApiHelpers";
import { foreachEntityItem, foreachSync } from "../shared/utils";

import { serverInit } from "./serverInit";
import * as XLSX from 'xlsx';

serverInit();

export async function DoIt() {
    try {




        console.log('123');
        //        new SendSmsUtils().sendSms('0507330590', 'test2');
    }
    catch (err) {
        console.log(err);
    }

}
DoIt();


async function getGeolocationInfo() {
    let families = new Families();
    foreachEntityItem(new Families(), undefined, async f => {
        if (!f.getGeocodeInformation().ok()) {
            f.addressApiResult.value = (await GetGeoInformation(f.address.value)).saveToString();
            await f.save();
        }

    });
}
async function ImportFromExcel(){
    
    let wb = XLSX.readFile("C:\\Users\\Yoni\\Downloads\\xxx.xlsx");
    let s = wb.Sheets[wb.SheetNames[1]];
    let o = XLSX.utils.sheet_to_json(s);
    let found = true;
    await foreachSync(o, async r => {
        try {

            let f = new Families();
            let get = x => {
                if (!r[x])
                    return '';
                return r[x];
            };
            f.appartment.value = r["דירה"];
            f.address.value = (get("כתובת") + ' ' + get("מספר").trim() + ' ' + get("עיר"));
            f.familyMembers.value = +r["מס' נפשות"];
            f.name.value = (get("שם משפחה") + " " + get("שם פרטי")).trim();
            if (!f.name.value) {
                f.name.value = '!ללא שם ';
            }
            f.phone1.value = r["טלפון"];
            f.addressComment.value = r["הערות"];
            if (found) {
                await f.doSaveStuff({});
                await f.save();
            }
            else if (f.address.value == 'השילוח 16 חולון')
                found = true;
        }
        catch (err) {
            console.log(err, o);
        }

    });

}

async function updateAddress() {
    (await new Families().source.find({})).forEach(f => {
        if (f.address.value.indexOf('נתניה') < 0) {
            f.address.value = f.address.value.trim() + ' נתניה';
            f.save();
        }
    });
}

async function updatePhone() {
    (await new Families().source.find({})).forEach(f => {
        f.phone1.value = '0507330590';
        f.save();
    });
}
function UpdateAllFamiliyNames() {
    readFile(`c:\\temp\\famiilies.txt`, (err, data) => {
        let names = data.toString().split('\r\n');
        new Families().source.find({}).then(async families => {
            for (let i = 0; i < families.length; i++) {
                families[i].name.value = names[i];
                await families[i].save();
                console.log(i + families[i].name.value);
            }
        });

    });
}
async function imprortFamiliesFromJson() {
    let r = readFileSync(`c:\\temp\\hugmoms.json`);
    var rows = JSON.parse(r.toString());
    for (let i = 0; i < rows.length; i++) {
        let f = new Families();
        let c = new ColumnHashSet();
        f.__fromPojo(rows[i], c);
        let families = await f.source.find({ where: f.id.isEqualTo(f.id.value) });
        if (families.length == 0) {
            await f.save();
        }
    }
}