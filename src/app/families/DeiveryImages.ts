import { Allow, Entity, IdEntity, SqlDatabase, remult } from 'remult'
import { Roles } from '../auth/roles'
import { HelpersBase } from '../helpers/helpers'
import { SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { Fields } from '../translate'
import { Families } from './families'

@Entity<DeliveryImage>('delivery_images', {
  allowApiCrud: Allow.authenticated,
  allowApiUpdate: false.valueOf,
  apiPrefilter: () => ({
    uploadingVolunteer: !remult.isAllowed([Roles.admin])
      ? { $id: [remult.user?.id] }
      : undefined
  }),
  saving: async (self) => {
    if (self.isNew())
      self.uploadingVolunteer = await remult.context.getCurrentUser()
  }
})
export class DeliveryImage extends IdEntity {
  @Fields.string()
  deliveryId: string
  @Fields.string()
  uploadingVolunteer: HelpersBase
  @Fields.string()
  image: string
}
@Entity('family_images', {
  allowApiCrud: Roles.familyAdmin,
  apiPrefilter: () => {
    if (!remult.isAllowed(Roles.admin)) {
      return SqlDatabase.rawFilter(async (b) => {
        var f = await SqlFor(remult.repo(Families))
        var fi = await SqlFor(remult.repo(FamilyImage))
        var sql = new SqlBuilder()
        b.sql = await sql.build(
          fi.familyId,
          sql.func(
            ' in ',
            sql.build(
              'select ',
              f.id,
              ' from ',
              f,
              ' where ',
              f.defaultDistributionCenter,
              '=',
              sql.str(remult.user.distributionCenter)
            )
          )
        )
      })
    }
  }
})
export class FamilyImage extends IdEntity {
  @Fields.string()
  familyId: string
  @Fields.string()
  imageInDeliveryId: string
  @Fields.string()
  image: string
}
