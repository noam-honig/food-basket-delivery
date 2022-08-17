import { FieldMetadata, Remult, Entity, IdEntity, BackendMethod, SqlDatabase, SqlResult, remult } from "remult";
import { Roles } from "../auth/roles";
import { getDb, SqlBuilder, SqlDefs, SqlFor } from "../model-shared/SqlBuilder";
import { Helpers } from "../helpers/helpers";
import { Families } from "../families/families";
import { Field } from '../translate';

@Entity("RegisterURL", {
    allowApiCrud: Roles.admin,
})
export class RegisterURL extends IdEntity {

    @Field({ caption: "URL", allowApiUpdate: Roles.admin })
    URL: string;
    @Field({ caption: "שם ייחודי לדוחות", allowApiUpdate: Roles.distCenterAdmin })
    prettyName: string


    urlPrettyName(url: string) {
        let s = url.slice(7).split('/')[0].trim();
        return remult.repo(RegisterURL).findFirst({ URL: { $contains: s } });
    }

    @BackendMethod({ allowed: Roles.admin })
    static async loadUrlsFromTables() {

        let h = SqlFor(remult.repo(Helpers));
        let f = SqlFor(remult.repo(Families));
        let u = SqlFor(remult.repo(RegisterURL));
        let sql = new SqlBuilder();
        let urls = [];

        async function loadUrls(sql: SqlBuilder, table: SqlDefs, field: FieldMetadata) {
            let q = await sql.query({
                select: async () => [sql.build('distinct ', urlDbOperator(await field.getDbName()), ' as url')],
                from: table,
                outerJoin: () => [{ to: u, on: () => [sql.build(field, ' like textcat(textcat(\'%\',', u.URL, '),\'%\')')] }],
                where: () => [sql.build(u.URL, ' is null')]
            })
            let r = (await getDb().execute(q));
            r.rows.forEach(x => urls.push(x.url));
        }

        await loadUrls(sql, f, f.custom1);
        await loadUrls(sql, h, h.referredBy);

        for (const url of urls) {
            if ((url != undefined) && (url != '')) {
                let g = await remult.repo(RegisterURL).findFirst({ URL: { $contains: url.trim() } });
                if (!g) {
                    console.log("adding entry for: ", url);
                    g = remult.repo(RegisterURL).create();
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

