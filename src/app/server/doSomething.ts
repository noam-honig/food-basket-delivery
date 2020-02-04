//import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/dist-server/radweb');

import { readFileSync } from "fs";
import {  SqlDatabase } from '@remult/core';





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


let match = 0;
export async function DoIt() {
    try {
        await serverInit();
        let source = new ServerContext();

        {
            let sourcePool = new Pool({
                connectionString: process.env.MIGRATION_SOURCE_DATABASE_URL,
                ssl: true
            });
            let schema = "test"; 
            let targetPool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: true
            });
            source.setDataProvider( new SqlDatabase( new PostgresDataProvider(sourcePool)));
            console.log('123');
           // debugger;
            //return;
            verifySchemaExistance(targetPool, schema);
            var w = new PostgresSchemaWrapper(targetPool, schema);
            var psw = new PostgresDataProvider(w);
            let builder = new PostgresSchemaBuilder(new SqlDatabase( psw), schema);
            await psw.transaction(async tdp => {
                let target = new ServerContext();
                target.setDataProvider(new SqlDatabase( tdp));

                for (const entity of allEntities) {
                    let x = source.for(entity).create();
                    if (x.defs.name.toLowerCase().indexOf('from ') < 0) {
                        await builder.createIfNotExist(x);

                        let rows = await source.for(entity).find();
                        console.log(x.defs.name + ": " + rows.length);
                        for (const r of rows) {
                            let tr = target.for(entity).create();
                            for (const col of r.columns) {
                                tr.columns.find(col).value = col.value;
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

