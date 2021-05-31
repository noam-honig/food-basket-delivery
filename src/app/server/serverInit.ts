
import { Pool, QueryResult } from 'pg';
import { config } from 'dotenv';
import { PostgresDataProvider, PostgresSchemaBuilder, PostgresPool, PostgresClient } from '@remult/core/postgres';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { ApplicationImages } from '../manage/ApplicationImages';
import { ServerContext, Context, Entity, SqlDatabase, ClassType } from '@remult/core';
import '../app.module';



import { Helpers } from '../helpers/helpers';

import { initSchema } from './initSchema';
import { Sites } from '../sites/sites';
import { OverviewComponent } from '../overview/overview.component';
import { SqlBuilder, SqlFor } from '../model-shared/types';
import { ConnectionOptions } from 'tls';
import { SitesEntity } from '../sites/sites.entity';
import { FamilyInfoComponent } from '../family-info/family-info.component';
import './send-email';
import { SendSmsUtils } from '../asign-family/send-sms-action';

declare const lang = '';
export const initSettings = {
    disableSchemaInit: false
}

export async function serverInit() {
    try {
        config();
        let ssl: boolean | ConnectionOptions = {
            rejectUnauthorized: false
        };
        if (process.env.DISABLE_POSTGRES_SSL)
            ssl = false;


        if (!process.env.DATABASE_URL) {
            console.error("No DATABASE_URL environment variable found, if you are developing locally, please add a '.env' with DATABASE_URL='postgres://*USERNAME*:*PASSWORD*@*HOST*:*PORT*/*DATABASE*'");
        }
        let dbUrl = process.env.DATABASE_URL;
        if (process.env.HEROKU_POSTGRESQL_GREEN_URL)
            dbUrl = process.env.HEROKU_POSTGRESQL_GREEN_URL;
        if (process.env.logSqls) {
            SqlDatabase.LogToConsole = true;

        }
        if (process.env.logSqlsThreshold) {
            SqlDatabase.durationThreshold = +process.env.logSqlsThreshold;


        }

        const pool = new Pool({
            connectionString: dbUrl,
            ssl: ssl,


        });

        const accountSID = process.env.twilio_accountSID;
        const authToken = process.env.twilio_authToken;
        FamilyInfoComponent.createPhoneProxyOnServer = async (cleanPhone, vPhone) => {
            const proxyService = process.env.twilio_proxyService;
            if (!accountSID)
                throw "לא הוגדר שירות טלפונים";
            let twilio = await import('twilio');
            let client = twilio(accountSID, authToken);

            let service = client.proxy.services(proxyService);

            let session = await service.sessions.create({
                mode: 'voice-only',
                ttl: 60
            });


            let p = await session.participants();
            let p1 = await p.create({ friendlyName: 'volunteer', identifier: vPhone });
            let p2 = await p.create({ friendlyName: 'family', identifier: cleanPhone });
            return { phone: p1.proxyIdentifier, session: session.sid }
        }
        if (process.env.twilio_use_for_sms) {

            SendSmsUtils.twilioSendSms = async (to, text, forWho) => {
                const envKey = 'twilio_sms_from_number';
                var twilio_sms_from_number = process.env[envKey];
                if (forWho.args.internationalPrefixForSmsAndAws) {
                    let specific = process.env[envKey + '_' + forWho.args.internationalPrefixForSmsAndAws.substring(1)];
                    if (specific) {
                        twilio_sms_from_number = specific;
                    }
                }

                let twilio = await import('twilio');
                let client = twilio(accountSID, authToken);
                return await client.messages.create({
                    to: to,
                    from: twilio_sms_from_number,
                    body: text
                });

            }
        }
        Sites.initOnServer();
        if (Sites.multipleSites) {

            if (!initSettings.disableSchemaInit) {
                await verifySchemaExistance(pool, Sites.guestSchema);
            }
            let adminSchemaPool = new PostgresSchemaWrapper(pool, Sites.guestSchema);
            let context = new ServerContext();
            let dp = new SqlDatabase(new PostgresDataProvider(adminSchemaPool));

            context.setDataProvider(dp)

            let builder = new PostgresSchemaBuilder(dp, Sites.guestSchema);
            if (!initSettings.disableSchemaInit) {
                for (const entity of <ClassType<any>[]>[
                    ApplicationSettings,
                    ApplicationImages,
                    Helpers, SitesEntity]) {
                    await builder.createIfNotExist(context.for(entity).defs);
                    await builder.verifyAllColumns(context.for(entity).defs);
                }
            }
            await SitesEntity.completeInit(context);
            let settings = await context.for(ApplicationSettings).lookupAsync(s => s.id.isEqualTo(1));
            if (settings.isNew()) {
                settings.organisationName = "מערכת חלוקה";
                settings.id = 1;
                await settings.save();
            } else {
                settings.logoUrl = '/assets/apple-touch-icon.png';
                if (settings.$.logoUrl.wasChanged())
                    await settings.save();
            }

            InitSchemas(pool);

            Sites.getDataProviderForOrg = org => new SqlDatabase(new PostgresDataProvider(new PostgresSchemaWrapper(pool, org)));
            return (y: Context) => {
                let org = Sites.getValidSchemaFromContext(y);

                return new SqlDatabase(new PostgresDataProvider(new PostgresSchemaWrapper(pool, org)));
            };
        }
        else {
            await new PostgresSchemaBuilder(new SqlDatabase(new PostgresDataProvider(pool))).verifyStructureOfAllEntities();
            await initSchema(pool, '');
            return y => new SqlDatabase(new PostgresDataProvider(pool));
        }







    } catch (error) {
        console.error(error);
        throw error;
    }



    async function InitSchemas(pool: Pool) {
        OverviewComponent.createDbSchema = async site => {
            return await InitSpecificSchema(pool, site);
        }
        //init application settings
        {
            let sortedSchemas: { name: string, lastSignIn: Date }[] = [];
            for (const s of Sites.schemas) {
                try {
                    let db = new SqlDatabase(new PostgresDataProvider(new PostgresSchemaWrapper(pool, s)));
                    let context = new ServerContext();
                    let h = SqlFor(context.for(Helpers));
                    var sql = new SqlBuilder();
                    let r = (await db.execute(sql.query({ from: h, select: () => [sql.max(h.lastSignInDate)] })));
                    let d = r.rows[0]['max'];
                    if (!d)
                        d = new Date(1900, 1, 1);
                    sortedSchemas.push({
                        name: s,
                        lastSignIn: d

                    });
                }
                catch {
                    sortedSchemas.push({
                        name: s,
                        lastSignIn: new Date(1900, 1, 1)
                    });
                }
            }
            sortedSchemas.sort((a, b) => b.lastSignIn.valueOf() - a.lastSignIn.valueOf());



            let i = 0;
            for (const s of sortedSchemas) {
                if (s.name.toLowerCase() == Sites.guestSchema)
                    throw 'admin is an ivalid schema name';
                try {
                    console.log("init schema for " + s.name + " - " + ++i + "/" + Sites.schemas.length + " last-sign-in:" + s.lastSignIn);
                    await InitSpecificSchema(pool, s.name);
                }
                catch (err) {
                    console.error(err);
                }
                if (!process.env.DISABLE_LOAD_DELAY)
                    await new Promise(x => setTimeout(() => {
                        x({});
                    }, 1000));
            }
        }
    }
}
async function InitSpecificSchema(pool: Pool, s: any) {
    await verifySchemaExistance(pool, s);
    let schemaPool = new PostgresSchemaWrapper(pool, s);
    let db = new SqlDatabase(new PostgresDataProvider(schemaPool));
    if (!initSettings.disableSchemaInit) {
        await new PostgresSchemaBuilder(db, s).verifyStructureOfAllEntities();
        await initSchema(schemaPool, s);
    }
    return db;
}

export async function verifySchemaExistance(pool: Pool, s: string) {
    let db = new PostgresDataProvider(pool);
    let exists = await db.createCommand().execute('SELECT schema_name FROM information_schema.schemata WHERE schema_name = \'' + s + '\'');
    if (exists.rows.length == 0) {
        await db.createCommand().execute('create schema ' + s);
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

