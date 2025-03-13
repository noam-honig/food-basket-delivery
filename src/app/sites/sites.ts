import { DataProvider, Remult, remult } from 'remult'

import { Roles } from '../auth/roles'
import { Language, TranslationOptions, langByCode, use } from '../translate'

declare var multiSite: boolean

export class Sites {
  static addSchema(id: string) {
    this.schemas.push(id)
  }

  static isOverviewSchema() {
    return Sites.getOrganizationFromContext() == Sites.guestSchema
  }
  static guestSchema = 'guest'
  static schemas = []
  static multipleSites = false
  static initOnServer() {
    let x = process.env.SCHEMAS
    if (x) Sites.schemas = x.split(',')
    Sites.multipleSites = true
  }
  static initOnBrowserAndReturnAngularBaseHref() {
    Sites.multipleSites = true //this setting is for testing
    if (typeof multiSite != 'undefined') {
      Sites.multipleSites = multiSite
    }
    let site = ''
    if (typeof window != 'undefined' && Sites.multipleSites) {
      if (Sites.multipleSites) {
        site = window.location.pathname.split('/')[1]
        if (!site) {
          site = Sites.guestSchema
        }
        remult.apiClient.url = '/' + site + '/api'
      }
    }
    return site
  }
  static getDataProviderForOrg: (org: string) => DataProvider
  static isValidOrganization(org: string) {
    if (!Sites.multipleSites) return true
    if (org == Sites.guestSchema) return true
    return Sites.schemas.indexOf(org) >= 0
  }

  static getValidSchemaFromContext() {
    if (!Sites.multipleSites) return ''
    try {
      let org = Sites.getOrganizationFromContext()
      if (!Sites.isValidOrganization(org)) return Sites.guestSchema
      return org
    } catch {
      return Sites.guestSchema
    }
  }
  static setSiteToContext(site: string) {
    remult.context.getSite = () => site
  }

  static getOrganizationFromContext() {
    return remult.context.getSite()
  }
  static getOrgRole() {
    return 'org:' + Sites.getOrganizationFromContext()
  }
}
export function getSiteFromUrl(url: string) {
  let site = url.split('/')[1]
  if (site && site.toLowerCase() == 'api') site = url.split('/')[2]
  return site
}

export function validSchemaName(x: string) {
  let okChars = 'abcdefghijklmnopqrstuvwxyz1234567890_'
  let removeFromStart = '1234567890'
  x = x.toLowerCase()
  while (x.length > 0 && removeFromStart.includes(x[0])) x = x.substr(1)

  for (let index = x.length - 1; index >= 0; index--) {
    if (!okChars.includes(x[index]))
      x = x.substring(0, index) + x.substring(index + 1)
  }
  return x
}

const langForSite = new Map<string, Language>()
export function setLangForSite(site: string, lang: TranslationOptions) {
  langForSite.set(site, langByCode(lang.args.languageFile))
}
export function getLang() {
  let r = langForSite.get(Sites.getValidSchemaFromContext())
  if (r) return r
  return use.language
}

export function usesIntakeForm() {
  return ['ssderot', 'test', 'test1'].includes(
    Sites.getOrganizationFromContext()
  )
}

export function isSderot() {
  return true
}

//SELECT string_agg(id::text, ',') FROM guest.sites

//count all tables
/*
with tbl as (
  SELECT table_schema,table_name 
  FROM information_schema.tables
  WHERE table_name not like 'pg_%' AND table_schema IN ('shabatm')
)
SELECT 
  table_schema, 
  table_name, 
  (xpath('/row/c/text()', 
    query_to_xml(format('select count(*) AS c from %I.%I', table_schema, table_name), 
    false, 
    true, 
    '')))[1]::text::int AS rows_n 
FROM tbl ORDER BY 3 DESC;
*/

/*
select organisationname,(select min (createdate) from test.helpers) createDate,
(select max (deliverystatusDate) from test.familyDeliveries) lastDeliveryStatus,
(select count(*) from test.familyDeliveries)  allDeliveries,
(select count(*) from test.familyDeliveries where deliverStatus >= 10)  doneDeliveries,
(select name from test.helpers  where phone not in ('0507330590','0523307014','+972507330590') order by createdate limit 1) first_admin,
(select phone from test.helpers  where phone not in ('0507330590','0523307014','+972507330590') order by createdate limit 1) first_adminPhone
from test.applicationSettings


*/

/*
SELECT
schemaname,
   relname as "Table",
   
   pg_size_pretty(pg_total_relation_size(relid)) As "Size",
   pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as "External Size"
   FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;
*/

/*
WITH tbl AS
  (SELECT table_schema,
          TABLE_NAME
   FROM information_schema.tables
   WHERE TABLE_NAME not like 'pg_%'
    -- AND table_schema in ('public')
  )
SELECT table_schema,
       TABLE_NAME,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, TABLE_NAME), FALSE, TRUE, '')))[1]::text::int AS rows_n
FROM tbl
ORDER BY 1,2 DESC

*/
