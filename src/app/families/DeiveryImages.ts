import { Allow, Remult, Entity, Field, IdEntity } from "remult";
import { Roles } from "../auth/roles";
import { HelpersBase } from "../helpers/helpers";


@Entity<DeliveryImage>('delivery_images', {
    allowApiCrud: Allow.authenticated,
    allowApiUpdate: false
},
    (options, remult) => {
        options.apiPrefilter = (self) => {
            if (!remult.isAllowed([Roles.admin]))
                return self.uploadingVolunteer.isEqualTo(remult.currentUser)
        };
        options.saving = self => {
            if (self.isNew())
                self.uploadingVolunteer = remult.currentUser
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
    allowApiCrud: Roles.admin

})
export class FamilyImage extends IdEntity {
    @Field()
    familyId: string;
    @Field()
    imageInDeliveryId: string;
    @Field()
    image: string;
}