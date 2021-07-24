import { FieldMetadata, Context, Entity, IdEntity, BackendMethod, SqlDatabase, SqlResult } from "remult";
import { Roles } from "../auth/roles";
import { SqlBuilder, SqlDefs, SqlFor } from "../model-shared/SqlBuilder";
import { Helpers } from "../helpers/helpers";
import { Families } from "../families/families";
import { Field } from '../translate';

@Entity({
    key: "RegisterURL",
    allowApiCrud: Roles.admin,
})
export class RegisterURL extends IdEntity {

    @Field({ caption: "URL", allowApiUpdate: Roles.admin })
    URL: string;
    @Field({ caption: "שם ייחודי לדוחות", allowApiUpdate: Roles.distCenterAdmin })
    prettyName: string

    constructor(private context: Context) {
        super();
    }

    urlPrettyName(url: string) {
        let s = url.slice(7).split('/')[0].trim();
        return this.context.for(RegisterURL).findFirst(g => g.URL.contains(s));
    }

    @BackendMethod({ allowed: Roles.admin })
    static async loadUrlsFromTables(context?: Context, db?: SqlDatabase) {

        let h = await SqlFor(context.for(Helpers));
        let f = await SqlFor(context.for(Families));
        let u = await SqlFor(context.for(RegisterURL));
        let sql = new SqlBuilder(context);
        let urls = [];

        async function loadUrls(sql: SqlBuilder, table: SqlDefs, field: FieldMetadata) {
            let q =await sql.query({
                select:async () => [sql.build('distinct ', urlDbOperator(await field.getDbName()), ' as url')],
                from: table,
                outerJoin: () => [{ to: u, on: () => [sql.build(field, ' like textcat(textcat(\'%\',', u.URL, '),\'%\')')] }],
                where: () => [sql.build(u.URL, ' is null')]
            })
            let r = (await db.execute(q));
            r.rows.forEach(x => urls.push(x.url));
        }

        await loadUrls(sql, f, f.custom1);
        await loadUrls(sql, h, h.referredBy);

        for (const url of urls) {
            if ((url != undefined) && (url != '')) {
                let g = await context.for(RegisterURL).findFirst(g => g.URL.contains(url.trim()));
                if (!g) {
                    console.log("adding entry for: ", url);
                    g = context.for(RegisterURL).create();
                    g.URL = url;
                    g.prettyName = url;
                    await g.save();
                }
            }
        }
    }
};

export function urlDbOperator(fieldDBName: string): string {
    return 'split_part(' + fieldDBName + ', \'/\', 3)'
}

