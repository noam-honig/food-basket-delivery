import { Context, EntityClass, IdEntity, ServerFunction, SqlDatabase, SqlResult, StringColumn } from "@remult/core";
import { Roles } from "../auth/roles";
import { SqlBuilder } from "../model-shared/types";
import { Helpers } from "../helpers/helpers";
import { Families } from "../families/families";

@EntityClass
export class RegisterURL extends IdEntity {

    URL = new StringColumn("URL" ,{allowApiUpdate:Roles.admin});
    prettyName = new StringColumn("שם ייחודי לדוחות" ,{allowApiUpdate:Roles.distCenterAdmin})

    constructor(private context: Context) {
        super({
            name: "RegisterURL",
            allowApiCRUD: Roles.admin,
        });
    }

    urlPrettyName(url:string) {
        let s = url.slice(7).split('/')[0].trim();
        return this.context.for(RegisterURL).findFirst(g=>g.URL.isContains(s));
    }

    @ServerFunction({allowed:Roles.admin})
    static async loadUrlsFromTables(context?:Context, db?: SqlDatabase){

        let h = context.for(Helpers).create();
        let f = context.for(Families).create();
        let u = context.for(RegisterURL).create();
        let sql = new SqlBuilder();
        let urls = [];

        async function loadUrls(sql: SqlBuilder, table: IdEntity, field: StringColumn){
            let q = sql.query({
                select: () => [sql.build('distinct ', urlDbOperator(field.defs.dbName), ' as url')],
                from: table,
                outerJoin: () => [{ to: u, on: () => [sql.build(field, ' like textcat(textcat(\'%\',',u.URL,'),\'%\')' )] }],
                where: () => [sql.build(u.URL, ' is null')]
            })
            let r = (await db.execute(q));
            r.rows.forEach(x=>urls.push(x.url));
        }

        await loadUrls(sql, f, f.custom1);
        await loadUrls(sql, h, h.referredBy);

        for (const url of urls) {
            if ((url!=undefined)&&(url!=''))  {
                let g = await context.for(RegisterURL).findFirst(g=>g.URL.isContains(url.trim()));
                if (!g){
                    console.log("adding entry for: ", url);
                    g = context.for(RegisterURL).create();
                    g.URL.value = url;
                    g.prettyName.value = url;
                    await g.save();
                }
            }
        }   
    }
};

export function urlDbOperator(fieldDBName: string) : string {
    return 'split_part(' + fieldDBName + ', \'/\', 3)'
}

