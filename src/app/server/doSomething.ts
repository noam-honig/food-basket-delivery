//import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/dist-server/radweb');

import { readFileSync } from "fs";
import { SqlDatabase } from '@remult/core';





import { serverInit, PostgresSchemaWrapper, verifySchemaExistance } from "./serverInit";


import { Families, parseAddress } from "../families/families";
import { ServerContext, allEntities } from '@remult/core';
import { Helpers } from "../helpers/helpers";
import { isString } from "util";
import { FamilySources } from "../families/FamilySources";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { BasketType } from "../families/BasketType";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { Pool } from "pg";
import { PostgresDataProvider, PostgresSchemaBuilder } from "@remult/server-postgres";
import { GeocodeCache, GeocodeInformation } from "../shared/googleApiHelpers";
import { Sites } from "../sites/sites";


let match = 0;
export async function DoIt() {
    try {
        await serverInit();
        let context = new ServerContext();
        context.setDataProvider(Sites.getDataProviderForOrg("zkaj"));
        {

            console.log('123');
            // debugger;
            //return;
            let rows = [];

            for (const g of await context.for(GeocodeCache).find()) {
                let x = GeocodeInformation.fromString(g.googleApiResult.value);
                if (x.partialMatch()) {
                    let r = {
                        source: g.id.value,
                        found: x.getAddress(),
                        why: x.whyProblem(),
                    //    whyNew: x.whyProblemNew(),
                        what: x.info.results.length > 0 ? x.info.results[0].types[0] : '',
                        st: x.info.results.length > 0 ? x.info.results[0].address_components[0].types.join(',') : '',

                    };
                 //   if (!r.whyNew)
                  //      r.whyNew = '';
                    if (r.found == "סנהדריה מורחבת 114 ירושלים") {
debugger;
                    }
                    rows.push(r);

                }



            }
            rows.sort((a, b) => a.whyNew.localeCompare(b.whyNew));
            console.table(rows);


        }




        //   await ImportFromExcel();
    }
    catch (err) {
        console.error(err);
    }

}
DoIt();

