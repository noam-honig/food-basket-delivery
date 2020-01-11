import { Context, DataProvider } from "@remult/core";

declare var multiSite: boolean;

export class Sites {
    static guestSchema = 'guest';
    static schemas = [];
    static multipleSites = false;
    static initOnServer() {
        let x = process.env.SCHEMAS;
        if (x)
            Sites.schemas = x.split(',');
        Sites.multipleSites = Sites.schemas.length > 0;
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
                Context.apiBaseUrl = '/' + site + '/api';
            }


        }
        return site;

    }
    static getDataProviderForOrg:(org: string) =>DataProvider;
    static isValidOrganization(org: string) {
        if (!Sites.multipleSites)
            return true;
        if (org == Sites.guestSchema)
            return true;
        return Sites.schemas.indexOf(org) >= 0;

    }

    static getValidSchemaFromContext(y: Context) {
        if (!Sites.multipleSites)
            return '';
        let org = Sites.getOrganizationFromContext(y);
        if (!Sites.isValidOrganization(org))
            return Sites.guestSchema;
        return org;
    }

    static getOrganizationFromContext(y: Context) {
        if (!Sites.multipleSites)
            return '';
        let url = y.getPathInUrl();
        let org = url.split('/')[1];
        if (org && org.toLowerCase() == 'api')
            org = url.split('/')[2];
        return org;
    }
    static getOrgRole(y: Context) {
        return 'org:' + Sites.getOrganizationFromContext(y);
    }
}

