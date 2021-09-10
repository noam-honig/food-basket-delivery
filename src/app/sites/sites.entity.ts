import { Entity, Remult, EntityBase } from "remult";
import { Field } from '../translate';
import { Roles } from "../auth/roles";
import { Sites } from "./sites";

@Entity<SitesEntity>('Sites', {
    allowApiRead: Roles.overview,
    saving: (self) => {
        self.id = self.id.toLowerCase().trim();
        if (self.isNew()) {
            self.createDate = new Date();
            if (self.remult.user)
                self.createUser = self.remult.user.id;
        }
        else {
            if (self.$.id.valueChanged())
                self.$.id.error = 'not allowed to change';
        }
    }
})
export class SitesEntity extends EntityBase {
    @Field()
    id: string;
    @Field({ caption: 'מועד הוספה', allowApiUpdate: false })
    createDate: Date;
    @Field()
    createUser: string;

    constructor(private remult: Remult) {
        super();
    }
    static async completeInit(remult: Remult) {
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
