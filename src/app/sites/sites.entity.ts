import { EntityClass, Entity, StringColumn, Context, DateTimeColumn } from "@remult/core";
import { HelperIdReadonly } from "../helpers/helpers";
import { Roles } from "../auth/roles";
import { Sites } from "./sites";

@EntityClass
export class SitesEntity extends Entity<string> {
    id = new SchemaIdColumn();
    createDate = new DateTimeColumn({ caption: 'מועד הוספה',allowApiUpdate:false });
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
    static async completeInit(context: Context) {
        let sites = await context.for(SitesEntity).find();
        let missingInDb = Sites.schemas.filter(siteFromEnv => !sites.find(y => y.id.value == siteFromEnv));
        for (const s of missingInDb) {
            let r = await context.for(SitesEntity).create();
            r.id.value = s;
            await r.save();
        }
        for (const s of sites) {
            if (!Sites.schemas.includes(s.id.value))
            Sites.schemas.push(s.id.value);
        }
    }
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