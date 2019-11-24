import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
let moduleLoader = new CustomModuleLoader('/dist-server/radweb');

import { readFileSync } from "fs";
import { ColumnHashSet } from '@remult/core';

import { GetGeoInformation } from "../shared/googleApiHelpers";

import { foreachEntityItem, foreachSync } from "../shared/utils";

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
import { PostgresDataProvider, PostgrestSchemaBuilder } from "@remult/server-postgres";


let match = 0;
export async function DoIt() {
    try {
        await serverInit();
        let source = new ServerContext();

        {
            let sourcePool = new Pool({
                connectionString: process.env.MIGRATION_SOURCE_DATABASE_URL,
                ssl: false
            });
            let schema = "test3";
            let targetPool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: false
            });
            source.setDataProvider(new PostgresDataProvider(sourcePool));
            verifySchemaExistance(targetPool, schema);
            var w = new PostgresSchemaWrapper(targetPool, schema);
            let builder = new PostgrestSchemaBuilder(w, schema);
            var psw = new PostgresDataProvider(w);
            await psw.doInTransaction(async tdp => {
                let target = new ServerContext();
                target.setDataProvider(tdp);

                for (const entity of allEntities) {
                    let x = source.for(entity).create();
                    if (x.__getDbName().toLowerCase().indexOf('from ') < 0) {
                        await builder.CreateIfNotExist(x);

                        let rows = await source.for(entity).find();
                        console.log(x.__getDbName() + ": " + rows.length);
                        for (const r of rows) {
                            let tr = target.for(entity).create();
                            for (const col of r.__iterateColumns()) {
                                tr.__getColumn(col).value = col.value;
                            }
                            if (tr instanceof Families)
                                tr.disableOnSavingRow = true;
                            await tr.save();

                        }
                    }
                }
            });

        }




        //   await ImportFromExcel();
    }
    catch (err) {
        console.error(err);
    }

}
DoIt();

