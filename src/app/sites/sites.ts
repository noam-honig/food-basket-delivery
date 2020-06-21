import { Context, DataProvider, EntityClass, Entity, StringColumn } from "@remult/core";
import { changeDate } from "../model-shared/types";
import { HelperIdReadonly } from "../helpers/helpers";
import { Roles } from "../auth/roles";

declare var multiSite: boolean;

@EntityClass
export class Sites extends Entity<string> {
    static addSchema(id: string) {
        this.schemas.push(id);
    }
    static async completeInit(context: Context) {
        let sites = await context.for(Sites).find();
        let missingInDb = this.schemas.filter(siteFromEnv => !sites.find(y => y.id.value == siteFromEnv));
        for (const s of missingInDb) {
            let r = await context.for(Sites).create();
            r.id.value = s;
            await r.save();
        }
        for (const s of sites) {
            if (!this.schemas.includes(s.id.value))
                this.schemas.push(s.id.value);
        }
    }
    static isOverviewSchema(context: Context) {
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
                Context.apiBaseUrl = '/' + site + '/api';
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

    static getValidSchemaFromContext(y: Context) {
        if (!Sites.multipleSites)
            return '';
        try {
            let org = Sites.getOrganizationFromContext(y);
            if (!Sites.isValidOrganization(org))
                return Sites.guestSchema;
            return org;
        }
        catch{
            return Sites.guestSchema;
        }
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
    id = new SchemaIdColumn();
    createDate = new changeDate({ caption: 'מועד הוספה' });
    createUser = new HelperIdReadonly(this.context, { caption: 'משתמש מוסיף' });
    constructor(private context: Context) {
        super({
            name: 'Sites',
            allowApiRead: Roles.overview,
            saving: () => {
                this.id.value = this.id.value.toLowerCase().trim();
                if (this.isNew()) {
                    this.createDate.value = new Date();
                    if (context.user)
                        this.createUser.value = context.user.id;
                }
                else {
                    if (this.id.value != this.id.originalValue)
                        this.id.validationError = 'not allowed to change';
                }
            }
        });
    }
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
export class SchemaIdColumn extends StringColumn {
    constructor() {
        super({
            caption: 'מזהה הסביבה'
        })
    }
    // __processValue(value: string) {
    //     return validSchemaName(value);
    // }
}