import { Remult, DataProvider } from "remult";


import { Roles } from "../auth/roles";
import { Language, TranslationOptions, langByCode, use } from "../translate";

declare var multiSite: boolean;


export class Sites {
    static addSchema(id: string) {
        this.schemas.push(id);
    }

    static isOverviewSchema(context: Remult) {
        return Sites.getOrganizationFromContext(context) == Sites.guestSchema;
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
        c.getSite = () => site;
    }

    static getOrganizationFromContext(y: Remult) {
        if (!Sites.multipleSites)
            return '';
        return y.getSite();
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
export function getLang(context: Remult) {
    let r = langForSite.get(Sites.getValidSchemaFromContext(context));
    if (r)
        return r;
    return use.language;
}

//SELECT string_agg(id::text, ',') FROM guest.sites
