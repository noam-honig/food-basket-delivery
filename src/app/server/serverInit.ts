
import { Pool, QueryResult } from 'pg';
import { config } from 'dotenv';
import { PostgresDataProvider, PostgrestSchemaBuilder, PostgresPool, PostgresClient } from '@remult/server-postgres';
import { foreachSync } from '../shared/utils';
import { Families } from '../families/families';
import { BasketType } from "../families/BasketType";
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { ApplicationImages } from '../manage/ApplicationImages';
import { ServerContext, allEntities, Context, DataApiRequest, SupportsDirectSql, SupportsTransaction, Entity } from '@remult/core';
import '../app.module';


import { ActualSQLServerDataProvider } from '@remult/core';
import { ActualDirectSQL, actionInfo } from '@remult/core';
import { FamilyDeliveryEvents } from '../delivery-events/FamilyDeliveryEvents';
import { SqlBuilder } from '../model-shared/types';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { Helpers } from '../helpers/helpers';
import * as passwordHash from 'password-hash';
import { FamilyDeliveriesStats } from '../delivery-history/delivery-history.component';
import { getOrganizationFromContext } from '../auth/auth-service';
import { initSchema } from './initSchema';
const guestSchema = 'guest';
let schemas = [];

export async function serverInit() {
    try {
        config();
        let ssl = true;
        if (process.env.DISABLE_POSTGRES_SSL)
            ssl = false;
        let x = process.env.SCHEMAS;
        if (x)
            schemas = x.split(',');
        if (!process.env.DATABASE_URL) {
            console.error("No DATABASE_URL environment variable found, if you are developing locally, please add a '.env' with DATABASE_URL='postgres://*USERNAME*:*PASSWORD*@*HOST*:*PORT*/*DATABASE*'");
        }
        let dbUrl = process.env.DATABASE_URL;
        if (process.env.HEROKU_POSTGRESQL_GREEN_URL)
            dbUrl = process.env.HEROKU_POSTGRESQL_GREEN_URL;
        if (process.env.logSqls) {
            ActualSQLServerDataProvider.LogToConsole = true;

        }

        const pool = new Pool({
            connectionString: dbUrl,
            ssl: ssl
        });
        Helpers.passwordHelper = {
            generateHash: p => passwordHash.generate(p),
            verify: (p, h) => passwordHash.verify(p, h)
        }
        if (schemas.length > 0) {

            {
                await verifySchemaExistance(pool, guestSchema);
                let adminSchemaPool = new PostgresSchemaWrapper(pool, guestSchema);
                let context = new ServerContext();
                let dp = new PostgresDataProvider(adminSchemaPool);
                context.setDataProvider(dp)
                let builder = new PostgrestSchemaBuilder(adminSchemaPool, guestSchema);
                for (const entity of <{ new(...args: any[]): Entity<any>; }[]>[
                    ApplicationSettings,
                    ApplicationImages]) {
                    await builder.CreateIfNotExist(context.for(entity).create());
                }
                let settings = await context.for(ApplicationSettings).lookupAsync(s => s.id.isEqualTo(1));
                if (settings.isNew()) {
                    settings.organisationName.value = "מערכת חלוקה";
                    settings.id.value = 1;
                    await settings.save();
                }
            }

            for (const s of schemas) {
                if (s.toLowerCase() == guestSchema)
                    throw 'admin is an ivalid schema name;'
                await verifySchemaExistance(pool, s);
                let schemaPool = new PostgresSchemaWrapper(pool, s);
                await new PostgrestSchemaBuilder(schemaPool, s).verifyStructureOfAllEntities();
                await initSchema(schemaPool);
            }
            return (y: Context) => {
                let org = getOrganizationFromUrl(y);
                
                return new PostgresDataProvider(new PostgresSchemaWrapper(pool, org));
            };
        }
        else {
            await new PostgrestSchemaBuilder(pool).verifyStructureOfAllEntities();
            await initSchema(pool);
            return y => new PostgresDataProvider(pool);
        }







    } catch (error) {
        console.error(error);
        throw error;
    }

    
}
export async function verifySchemaExistance(pool: Pool, s: string) {
    let exists = await pool.query('SELECT schema_name FROM information_schema.schemata WHERE schema_name = \'' + s + '\'');
    if (exists.rows.length == 0) {
        await pool.query('create schema ' + s);
    }
}

export function getOrganizationFromUrl(y: Context) {
    let org = getOrganizationFromContext(y);
    if (schemas.indexOf(org) < 0)
        return guestSchema;
    return org;
}

export class PostgresSchemaWrapper implements PostgresPool {
    constructor(private pool: Pool, private schema: string) {

    }
    async connect(): Promise<PostgresClient> {
        let r = await this.pool.connect();
        
        await r.query('set search_path to ' + this.schema);
        return r;
    }
    async query(queryText: string, values?: any[]): Promise<QueryResult> {
        let c = await this.connect();
        try {
            return await c.query(queryText, values);
        }
        finally {
            c.release();
        }

    }
}
