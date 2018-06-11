import { Families } from "../models";
import { readFileSync, readFile } from "fs";
import { UrlBuilder } from "radweb";
import * as fetch from 'node-fetch';
import { GetGeoInformation } from "../shared/googleApiHelpers";
import { foreachEntityItem } from "../shared/utils";
import { SendSmsUtils } from "../asign-family/send-sms-action";


export async function DoIt() {
    try {
//        new SendSmsUtils().sendSms('0507330590', 'test2');
    }
    catch (err) {
        console.log(err);
    }

}
async function getGeolocationInfo() {
    let families = new Families();
    foreachEntityItem(new Families(), undefined, async f => {
        if (!f.getGeocodeInformation().ok()) {
            f.addressApiResult.value = (await GetGeoInformation(f.address.value)).saveToString();
            await f.save();
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