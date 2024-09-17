import { Pool, QueryResult } from 'pg'
import { config } from 'dotenv'
import {
  PostgresDataProvider,
  PostgresSchemaBuilder,
  PostgresPool,
  PostgresClient
} from 'remult/postgres'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { ApplicationImages } from '../manage/ApplicationImages'
import { Remult, Entity, SqlDatabase, remult } from 'remult'

import { Helpers } from '../helpers/helpers'

import { initSchema } from './initSchema'
import { Sites } from '../sites/sites'
import { SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'

import { ConnectionOptions } from 'tls'
import { SitesEntity } from '../sites/sites.entity'
import './send-email'
import { SendSmsUtils } from '../asign-family/send-sms-action'
import { DistributionCenters } from '../manage/distribution-centers'
import { ClassType } from 'remult/classType'

import { InitContext as InitRemult } from '../helpers/init-context'
import { actionInfo } from 'remult/internals'
import { OverviewController } from '../overview/overview.controller'
import { FamilyInfoController } from '../family-info/family-info.controller'
import { MemoryStats } from './stats'
import { ChangeLog } from '../change-log/change-log'

declare const lang = ''
export const initSettings = {
  disableSchemaInit: false
}
actionInfo.runningOnServer = true
export async function serverInit() {
  try {
    config()
    console.log(process.env['DATABASE_URL'])
    let ssl: boolean | ConnectionOptions = {
      rejectUnauthorized: false
    }
    if (process.env.DISABLE_POSTGRES_SSL) ssl = false

    if (!process.env.DATABASE_URL) {
      console.error(
        "No DATABASE_URL environment variable found, if you are developing locally, please add a '.env' with DATABASE_URL='postgres://*USERNAME*:*PASSWORD*@*HOST*:*PORT*/*DATABASE*'"
      )
    }
    let dbUrl = process.env.DATABASE_URL
    if (process.env.HEROKU_POSTGRESQL_GREEN_URL)
      dbUrl = process.env.HEROKU_POSTGRESQL_GREEN_URL
    if (process.env.logSqls) {
      SqlDatabase.LogToConsole = true
    }
    if (process.env.logSqlsThreshold) {
      SqlDatabase.durationThreshold = +process.env.logSqlsThreshold
    }

    const pool = new Pool({
      connectionString: dbUrl,
      ssl: ssl
    })

    const accountSID = process.env.twilio_accountSID
    const authToken = process.env.twilio_authToken
    FamilyInfoController.createPhoneProxyOnServer = async (
      cleanPhone,
      vPhone
    ) => {
      const proxyService = process.env.twilio_proxyService
      if (!accountSID) throw 'לא הוגדר שירות טלפונים'
      let twilio = await import('twilio')
      let client = twilio.default(accountSID, authToken)

      let service = client.proxy.services(proxyService)

      let session = await service.sessions.create({
        mode: 'voice-only',
        ttl: 60
      })

      let p = await session.participants()
      let p1 = await p.create({ friendlyName: 'volunteer', identifier: vPhone })
      let p2 = await p.create({
        friendlyName: 'family',
        identifier: cleanPhone
      })
      return { phone: p1.proxyIdentifier, session: session.sid }
    }
    if (process.env.twilio_use_for_sms) {
      SendSmsUtils.twilioSendSms = async (to, text, forWho) => {
        const envKey = 'twilio_sms_from_number'
        var twilio_sms_from_number = process.env[envKey]
        if (forWho.args.internationalPrefixForSmsAndAws) {
          let specific =
            process.env[
              envKey +
                '_' +
                forWho.args.internationalPrefixForSmsAndAws.substring(1)
            ]
          if (specific) {
            twilio_sms_from_number = specific
          }
        }

        let twilio = await import('twilio')
        let client = twilio.default(accountSID, authToken)
        await client.messages.create({
          to: to,
          from: twilio_sms_from_number,
          body: text
        })
      }
    }
    Sites.initOnServer()

    Sites.getDataProviderForOrg = (org) =>
      new SqlDatabase(
        new PostgresDataProvider(pool, {
          caseInsensitiveIdentifiers: true,
          schema: org
        })
      )
    const schemas = new Map<string, { promise: Promise<void> }>()
    return {
      dataSource: async (y: Remult) => {
        let org = Sites.getValidSchemaFromContext()
        let x = schemas.get(org)
        if (!x) {
          schemas.set(
            org,
            (x = {
              promise: InitSpecificSchema(pool, org).then(() => {
                x.promise = undefined
              })
            })
          )
        }
        await x.promise

        return new SqlDatabase(
          new PostgresDataProvider(pool, {
            caseInsensitiveIdentifiers: true,
            schema: org
          })
        )
      },
      initDatabase: () => initDatabase(pool, InitSchemas)
    }
  } catch (error) {
    console.error(error)
    throw error
  }

  async function InitSchemas(pool: Pool) {
    OverviewController.createDbSchema = async (site) => {
      return await InitSpecificSchema(pool, site)
    }
    //init application settings
    {
      let sortedSchemas: { name: string; lastSignIn: Date }[] = []
      for (const s of Sites.schemas) {
        try {
          let db = new SqlDatabase(
            new PostgresDataProvider(pool, {
              caseInsensitiveIdentifiers: true,
              schema: s
            })
          )
          let h = await SqlFor(remult.repo(Helpers))
          var sql = new SqlBuilder()
          let r = await db.execute(
            await sql.query({
              from: h,
              select: () => [sql.max(h.lastSignInDate)]
            })
          )
          let d = r.rows[0]['max']
          if (!d) d = new Date(1900, 1, 1)
          sortedSchemas.push({
            name: s,
            lastSignIn: d
          })
        } catch {
          sortedSchemas.push({
            name: s,
            lastSignIn: new Date(1900, 1, 1)
          })
        }
      }
      sortedSchemas.sort(
        (a, b) => b.lastSignIn.valueOf() - a.lastSignIn.valueOf()
      )

      let i = 0
      for (const s of sortedSchemas) {
        if (s.name.toLowerCase() == Sites.guestSchema)
          throw 'admin is an invalid schema name'
        try {
          //await InitSpecificSchema(pool, s.name)
        } catch (err) {
          console.error(err)
        }
        if (!process.env.DISABLE_LOAD_DELAY)
          await new Promise((x) =>
            setTimeout(() => {
              x({})
            }, 1000)
          )
      }
    }
  }
}
async function initDatabase(
  pool: Pool,
  InitSchemas: (pool: Pool) => Promise<void>
) {
  if (!initSettings.disableSchemaInit) {
    await verifySchemaExistance(pool, Sites.guestSchema)
  }

  let dp = new SqlDatabase(
    new PostgresDataProvider(pool, {
      caseInsensitiveIdentifiers: true,
      schema: Sites.guestSchema
    })
  )
  remult.dataProvider = dp
  await InitRemult(remult)

  let builder = new PostgresSchemaBuilder(dp, Sites.guestSchema)
  if (!initSettings.disableSchemaInit) {
    for (const entity of <ClassType<any>[]>[
      ApplicationSettings,
      ApplicationImages,
      Helpers,
      SitesEntity,
      DistributionCenters,
      MemoryStats,
      ChangeLog
    ]) {
      await builder.createIfNotExist(remult.repo(entity).metadata)
      await builder.verifyAllColumns(remult.repo(entity).metadata)
    }
  }
  await SitesEntity.completeInit()
  let settings = await remult
    .repo(ApplicationSettings)
    .findId(1, { createIfNotFound: true })
  if (settings.isNew()) {
    settings.organisationName = 'מערכת חלוקה'
    settings.id = 1
    await settings.save()
  } else {
    if (settings.organisationName == 'מערכת חלוקה') {
      settings.organisationName = 'חגי - אפליקציה לחלוקת מזון'
    }
    settings.logoUrl = '/assets/apple-touch-icon.png'
    if (settings._.wasChanged()) await settings.save()
  }

  InitSchemas(pool)
}

async function InitSpecificSchema(pool: Pool, s: string) {
  console.log('init schema for ' + s)
  await verifySchemaExistance(pool, s)

  let db = new SqlDatabase(
    new PostgresDataProvider(pool, {
      caseInsensitiveIdentifiers: true,
      schema: s
    })
  )
  remult.dataProvider = db
  await InitRemult(remult)
  if (!initSettings.disableSchemaInit) {
    const b = new PostgresSchemaBuilder(db, s)
    const settings = remult.repo(ApplicationSettings)
    await b.createIfNotExist(settings.metadata)
    await b.verifyAllColumns(settings.metadata)
    await b.verifyStructureOfAllEntities(remult)
    await initSchema(db, s)
  }
  return db
}

export async function verifySchemaExistance(pool: Pool, s: string) {
  let db = new PostgresDataProvider(pool)
  let exists = await db
    .createCommand()
    .execute(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = '" +
        s +
        "'"
    )
  if (exists.rows.length == 0) {
    await db.createCommand().execute('create schema ' + s)
  }
}

export class PostgresSchemaWrapper implements PostgresPool {
  constructor(private pool: Pool, private schema: string) {}
  end(): Promise<void> {
    return this.pool.end()
  }
  async connect(): Promise<PostgresClient> {
    let r = await this.pool.connect()

    await r.query('set search_path to ' + this.schema)
    return r
  }
  async query(queryText: string, values?: any[]): Promise<QueryResult> {
    let c = await this.connect()
    try {
      return await c.query(queryText, values)
    } finally {
      c.release()
    }
  }
}
