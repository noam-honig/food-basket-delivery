import { Context, EntityClass, IdEntity, ServerFunction, SqlDatabase, StringColumn } from "@remult/core";
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
            allowApiRead: Roles.admin,
            allowApiUpdate: Roles.admin,
            allowApiInsert: Roles.admin,
        });
    }

    
    @ServerFunction({allowed:Roles.admin})
    static async loadUrlsFromTables(context?:Context, db?: SqlDatabase){
        let u = context.for(RegisterURL).create();
        let h = context.for(Helpers).create();
        let f = context.for(Families).create();

        let urls = [];

        let sql = new SqlBuilder();
        let fields = [{table:h, field:h.referredBy}, {table:f, field:f.custom1}];
        fields.forEach(async data=> {
            let q = sql.query({
                select: () => [sql.build('distinct trim(\'/\' from substring(', data.field, ', 7)) as url')],
                from: data.table,
                outerJoin: () => [{ to: u, on: () => [sql.build(data.field, ' like textcat(textcat(\'%\',',u.URL,'),\'%\')' )] }],
                where: () => [sql.build(u.URL, ' is null')]
            })
            let r = (await db.execute(q));
            r.rows.forEach(x=>urls.push(x.url.split('/')[2]));
        }
        );
        console.log(urls);
        
        for (const url of urls) {
            if (url!=undefined)  {
                let g = await context.for(RegisterURL).findFirst(g=>g.URL.isContains(url.trim()));
                if (!g){
                    console.log("adding entry for: ", url);
                    g = context.for(RegisterURL).create();
                    g.URL.value = url;
                    await g.save();
                }
            }
        }   
    }

    @ServerFunction({allowed:Roles.admin})
    static async importUrls(urls:string[],context?:Context){
        if (urls.length==0)
            console.log("nothing here");
        for (const url of urls) {
            console.log("looking for: ", url);
            let g = await context.for(RegisterURL).findFirst(g=>g.URL.isContains(url.trim()));
            console.log("g=",g);
            if (!g){
                console.log("creating entry for: ", url);
                g = context.for(RegisterURL).create();
                g.URL.value = url;
                await g.save();
            }
        }
    }
};
