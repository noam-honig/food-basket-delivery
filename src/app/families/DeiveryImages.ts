import { Allow, Context, Entity, Field, IdEntity } from "remult";
import { Roles } from "../auth/roles";
import { HelpersBase } from "../helpers/helpers";


@Entity<DeliveryImage>({
    key: 'delivery_images',
    allowApiCrud: Allow.authenticated,
    allowApiUpdate: false,
    apiDataFilter: (self, context) => {
        if (!context.isAllowed([Roles.admin]))
            return self.uploadingVolunteer.isEqualTo(context.currentUser)
    },
    saving: self => {
        if (self.isNew())
            self.uploadingVolunteer = self.context.currentUser
    }

})
export class DeliveryImage extends IdEntity {
    @Field()
    deliveryId: string;
    @Field()
    uploadingVolunteer: HelpersBase;
    @Field()
    image: string;
    constructor(private context: Context) {
        super();
    }
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