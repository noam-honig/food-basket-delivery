//import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/dist-server/radweb');

import { readFileSync } from "fs";
import { SqlDatabase } from '@remult/core';





import { serverInit } from "./serverInit";


import { ServerContext, allEntities } from '@remult/core';
import { GeocodeCache, GeocodeInformation } from "../shared/googleApiHelpers";
import { Sites } from "../sites/sites";
import * as fs from 'fs';
import { processPhone } from "../import-from-excel/import-from-excel.component";



let match = 0;
export async function DoIt() {
    try {
        await serverInit();

        let dp = Sites.getDataProviderForOrg('catz');
        let context = new ServerContext(dp);
        
        workOnPhones();






        //   await ImportFromExcel();
    }
    catch (err) {
        console.error(err);
    }

}
DoIt();

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

