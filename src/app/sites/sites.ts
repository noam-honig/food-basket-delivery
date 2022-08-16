import { Remult, DataProvider } from "remult";


import { Roles } from "../auth/roles";
import { Language, TranslationOptions, langByCode, use } from "../translate";

declare var multiSite: boolean;


export class Sites {
    static addSchema(id: string) {
        this.schemas.push(id);
    }

    static isOverviewSchema(remult: Remult) {
        return Sites.getOrganizationFromContext(remult) == Sites.guestSchema;
    }
    static guestSchema = 'guest';
    static schemas = [];
    static multipleSites = false;
    static initOnServer() {
        let x = process.env.SCHEMAS;
        if (x)
            Sites.schemas = x.split(',');
        Sites.multipleSites = true;
    }
    static initOnBrowserAndReturnAngularBaseHref() {
        Sites.multipleSites = true;//this setting is for testing
        if (typeof (multiSite) != "undefined") {
            Sites.multipleSites = multiSite;
        }
        let site = '';
        if (typeof (window) != "undefined" && Sites.multipleSites) {

            if (Sites.multipleSites) {
                site = window.location.pathname.split('/')[1];
                if (!site) {
                    site = Sites.guestSchema;
                }
                Remult.apiBaseUrl = '/' + site + '/api';
            }


        }
        return site;

    }
    static getDataProviderForOrg: (org: string) => DataProvider;
    static isValidOrganization(org: string) {
        if (!Sites.multipleSites)
            return true;
        if (org == Sites.guestSchema)
            return true;
        return Sites.schemas.indexOf(org) >= 0;

    }

    static getValidSchemaFromContext(y: Remult) {
        if (!Sites.multipleSites)
            return '';
        try {
            let org = Sites.getOrganizationFromContext(y);
            if (!Sites.isValidOrganization(org))
                return Sites.guestSchema;
            return org;
        }
        catch {
            return Sites.guestSchema;
        }
    }
    static setSiteToContext(c: Remult, site: string, origContext: Remult) {
        c.state.getSite = () => site;
    }

    static getOrganizationFromContext(y: Remult) {
        if (!Sites.multipleSites)
            return '';
        return y.state.getSite();
    }
    static getOrgRole(y: Remult) {
        return 'org:' + Sites.getOrganizationFromContext(y);
    }

}
export function getSiteFromUrl(url: string) {
    let site = url.split('/')[1];
    if (site && site.toLowerCase() == 'api')
        site = url.split('/')[2];
    return site;
}


export function validSchemaName(x: string) {

    let okChars = 'abcdefghijklmnopqrstuvwxyz1234567890_';
    let removeFromStart = '1234567890';
    x = x.toLowerCase();
    while (x.length > 0 && removeFromStart.includes(x[0]))
        x = x.substr(1);

    for (let index = x.length - 1; index >= 0; index--) {
        if (!okChars.includes(x[index]))
            x = x.substring(0, index) + x.substring(index + 1);
    }
    return x;
}


const langForSite = new Map<string, Language>();
export function setLangForSite(site: string, lang: TranslationOptions) {
    langForSite.set(site, langByCode(lang.args.languageFile));
}
export function getLang(remult: Remult) {
    let r = langForSite.get(Sites.getValidSchemaFromContext(remult));
    if (r)
        return r;
    return use.language;
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