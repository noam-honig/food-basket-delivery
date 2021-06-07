import { Entity, Context, EntityBase } from "@remult/core";
import { Field } from '../translate';
import { Roles } from "../auth/roles";
import { Sites } from "./sites";

@Entity<SitesEntity>({
    key: 'Sites',
    allowApiRead: Roles.overview,
    saving: (self) => {
        self.id = self.id.toLowerCase().trim();
        if (self.isNew()) {
            self.createDate = new Date();
            if (self.context.user)
                self.createUser = self.context.user.id;
        }
        else {
            if (self.$.id.wasChanged())
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

    constructor(private context: Context) {
        super();
    }
    static async completeInit(context: Context) {
        let sites = await context.for(SitesEntity).find();
        let missingInDb = Sites.schemas.filter(siteFromEnv => !sites.find(y => y.id == siteFromEnv));
        for (const s of missingInDb) {
            let r = await context.for(SitesEntity).create();
            r.id = s;
            await r.save();
        }
        for (const s of sites) {
            if (!Sites.schemas.includes(s.id))
                Sites.schemas.push(s.id);
        }
    }
}
