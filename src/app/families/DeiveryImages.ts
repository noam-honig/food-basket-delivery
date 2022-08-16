import { Allow, Remult, Entity, IdEntity, SqlDatabase } from "remult";
import { Roles } from "../auth/roles";
import { HelpersBase } from "../helpers/helpers";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Field } from "../translate";
import { Families } from "./families";


@Entity<DeliveryImage>('delivery_images', {
    allowApiCrud: Allow.authenticated,
    allowApiUpdate: false
},
    (options, remult) => {
        options.apiPrefilter = {
            uploadingVolunteer: !remult.isAllowed([Roles.admin]) ? { $id: [remult.user.id] } : undefined
        };
        options.saving = async self => {
            if (self.isNew())
                self.uploadingVolunteer = (await remult.state.getCurrentUser())
        }

    })
export class DeliveryImage extends IdEntity {
    @Field()
    deliveryId: string;
    @Field()
    uploadingVolunteer: HelpersBase;
    @Field()
    image: string;

}
@Entity('family_images', {
    allowApiCrud: Roles.familyAdmin,

}, (options, remult) => options.apiPrefilter = () => {
    if (!remult.isAllowed(Roles.admin)) {
        return SqlDatabase.customFilter(async b => {
            var f = await SqlFor(remult.repo(Families));
            var fi = await SqlFor(remult.repo(FamilyImage));
            var sql = new SqlBuilder(remult);
            b.sql = await sql.build(fi.familyId, sql.func(" in ", sql.build("select ", f.id, " from ", f, " where ", f.defaultDistributionCenter, "=", sql.str(remult.user.distributionCenter))));
        })
    }
})
export class FamilyImage extends IdEntity {
    @Field()
    familyId: string;
    @Field()
    imageInDeliveryId: string;
    @Field()
    image: string;
}