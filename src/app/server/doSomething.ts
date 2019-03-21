import { HelpersAndStats } from "../delivery-follow-up/HelpersAndStats";
import { readFileSync, readFile } from "fs";
import { ColumnHashSet, DateColumn } from "radweb";

import { GetGeoInformation } from "../shared/googleApiHelpers";
import { foreachEntityItem, foreachSync } from "../shared/utils";

import { serverInit } from "./serverInit";
import * as XLSX from 'xlsx';

import { Families, FamiliesSmall } from "../families/families";
import { ServerContext } from "../shared/context";

serverInit();

export async function DoIt() {
    try {

       /* var sc = new ServerContext();
        console.time('find');
        var f = await sc.for(Families).find({});
        console.timeEnd('find');
        console.log(f.length);*/

     //   await ImportFromExcel();
    }
    catch (err) {
        console.log(err);
    }

}
DoIt();


async function getGeolocationInfo() {
    let families = new Families(undefined);
    foreachEntityItem(new Families(undefined), undefined, async f => {
        if (!f.getGeocodeInformation().ok()) {
            f.addressApiResult.value = (await GetGeoInformation(f.address.value)).saveToString();
            await f.save();
        }

    });
}
async function ImportFromExcel() {

    let wb = XLSX.readFile("C:\\Users\\Yoni\\Downloads\\בתי מרקחת 2017 610415.xlsx");
    let s = wb.Sheets[wb.SheetNames[0]];
    let o = XLSX.utils.sheet_to_json(s);
    let context = new ServerContext();
    let found = true;
    let i=0;
    await foreachSync(o, async r => {
        try {

            let f = context.for(Families).create();
            let get = x => {
                if (!r[x])
                    return '';
                return r[x];
            };
            //    f.appartment.value = r["דירה"];
            f.address.value = (get("address") + ' ' + get("city").trim());
            //   f.familyMembers.value = +r["מס' נפשות"];
            //   f.name.value = (get("שם משפחה") + " " + get("שם פרטי")).trim();
            f.name.value = get("STOR_NAME");
            f.iDinExcel.value = get("CODE");
            if (!f.name.value) {
                f.name.value = '!ללא שם ';
            }
            
            f.phone1.value = r["phone"];
            await f.save();
            console.log(i++,r);
         //   f.addressComment.value = r["הערות"];
            /*if (found) {
                await f.save();
            }
            else if (f.address.value == 'טטט')
                found = true;*/
        }
        catch (err) {
            console.log(err, r);
        }

    });

}

async function updateAddress() {
    (await new Families(undefined).source.find({})).forEach(f => {
        if (f.address.value.indexOf('נתניה') < 0) {
            f.address.value = f.address.value.trim() + ' נתניה';
            f.save();
        }
    });
}

async function updatePhone() {
    (await new Families(undefined).source.find({})).forEach(f => {
        f.phone1.value = '0507330590';
        f.save();
    });
}
function UpdateAllFamiliyNames() {
    readFile(`c:\\temp\\famiilies.txt`, (err, data) => {
        let names = data.toString().split('\r\n');
        new Families(undefined).source.find({}).then(async families => {
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
        let f = new Families(undefined);
        let c = new ColumnHashSet();
        f.__fromPojo(rows[i], c);
        let families = await f.source.find({ where: f.id.isEqualTo(f.id.value) });
        if (families.length == 0) {
            await f.save();
        }
    }
}