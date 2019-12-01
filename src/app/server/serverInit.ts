
import { Pool, QueryResult } from 'pg';
import { config } from 'dotenv';
import { PostgresDataProvider, PostgrestSchemaBuilder, PostgresPool, PostgresClient } from '@remult/server-postgres';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { ApplicationImages } from '../manage/ApplicationImages';
import { ServerContext,  Context, Entity } from '@remult/core';
import '../app.module';


import { ActualSQLServerDataProvider } from '@remult/core';
import { Helpers } from '../helpers/helpers';
import * as passwordHash from 'password-hash';
import { initSchema } from './initSchema';
import { Sites } from '../sites/sites';



export async function serverInit() {
    try {
        config();
        let ssl = true;
        if (process.env.DISABLE_POSTGRES_SSL)
            ssl = false;
        
        
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
        Sites.initOnServer();
        if (Sites.multipleSites) {

            {
                await verifySchemaExistance(pool, Sites.guestSchema);
                let adminSchemaPool = new PostgresSchemaWrapper(pool,Sites. guestSchema);
                let context = new ServerContext();
                let dp = new PostgresDataProvider(adminSchemaPool);
                context.setDataProvider(dp)
                let builder = new PostgrestSchemaBuilder(adminSchemaPool,Sites. guestSchema);
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

            for (const s of Sites.schemas) {
                if (s.toLowerCase() == Sites.guestSchema)
                    throw 'admin is an ivalid schema name;'
                await verifySchemaExistance(pool, s);
                let schemaPool = new PostgresSchemaWrapper(pool, s);
                await new PostgrestSchemaBuilder(schemaPool, s).verifyStructureOfAllEntities();
                await initSchema(schemaPool,s);
            }
            return (y: Context) => {
                let org = Sites.getValidSchemaFromContext(y);

                return new PostgresDataProvider(new PostgresSchemaWrapper(pool, org));
            };
        }
        else {
            await new PostgrestSchemaBuilder(pool).verifyStructureOfAllEntities();
            await initSchema(pool,'');
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
