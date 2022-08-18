import { Entity, EntityBase, remult } from "remult";
import { Field } from '../translate';
import { Roles } from "../auth/roles";
import { Sites } from "./sites";
import { getDb } from "../model-shared/SqlBuilder";

@Entity<SitesEntity>('Sites', {
    allowApiRead: Roles.overview,
    saving: (self) => {
        self.id = self.id.toLowerCase().trim();
        if (self.isNew()) {
            self.createDate = new Date();
            if (remult.user)
                self.createUser = remult.user.id;
        }
        else {
            if (self.$.id.valueChanged())
                self.$.id.error = 'not allowed to change';
        }
    }
}, (_, _1) => getDb().execute("SELECT setting FROM pg_settings WHERE name = 'search_path';").then(x => console.log(x.rows[0])))
export class SitesEntity extends EntityBase {
    @Field()
    id: string;
    @Field({ caption: 'מועד הוספה', allowApiUpdate: false })
    createDate: Date;
    @Field()
    createUser: string;

    static async completeInit() {

        let sites = await remult.repo(SitesEntity).find();
        let missingInDb = Sites.schemas.filter(siteFromEnv => !sites.find(y => y.id == siteFromEnv));
        for (const s of missingInDb) {
            let r = await remult.repo(SitesEntity).create();
            r.id = s;
            await r.save();
        }
        for (const s of sites) {
            if (!Sites.schemas.includes(s.id))
                Sites.schemas.push(s.id);
        }
    }
}
