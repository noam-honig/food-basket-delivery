import { Allow, Remult, Entity, Field, IdEntity } from "remult";
import { Roles } from "../auth/roles";
import { HelpersBase } from "../helpers/helpers";


@Entity<DeliveryImage>({
    key: 'delivery_images',
    allowApiCrud: Allow.authenticated,
    allowApiUpdate: false
},
    (options, context) => {
        options.apiDataFilter = (self) => {
            if (!context.isAllowed([Roles.admin]))
                return self.uploadingVolunteer.isEqualTo(context.currentUser)
        };
        options.saving = self => {
            if (self.isNew())
                self.uploadingVolunteer = context.currentUser
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
@Entity({
    key: 'family_images',
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