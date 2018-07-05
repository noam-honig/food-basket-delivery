import { Pool } from 'pg';
import { config } from 'dotenv';
import {  PostgresDataProvider, PostgrestSchemaBuilder } from 'radweb/server';
import { evilStatics } from '../auth/evil-statics';
import * as models from './../models';

export function serverInit() {
    config();
    let ssl = true;
    if (process.env.DISABLE_POSTGRES_SSL)
        ssl = false;


    if (!process.env.DATABASE_URL) {
        console.log("No DATABASE_URL environment variable found, if you are developing locally, please add a '.env' with DATABASE_URL='postgres://*USERNAME*:*PASSWORD*@*HOST*:*PORT*/*DATABASE*'");
    }
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: ssl
    });
    evilStatics.dataSource = new PostgresDataProvider(pool);
    evilStatics.openedDataApi = new PostgresDataProvider(pool);

    var sb = new PostgrestSchemaBuilder(pool);
    [
        new models.Events(),
        new models.EventHelpers(),
        new models.Helpers(),
        new models.Items(),
        new models.ItemsPerHelper(),
        new models.Families(),
        new models.BasketType(),
        new models.FamilySources()
    ].forEach(x => sb.CreateIfNotExist(x));

    sb.verifyAllColumns(new models.Families());
    sb.verifyAllColumns(new models.Helpers());


}