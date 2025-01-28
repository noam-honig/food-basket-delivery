import { Allow, Entity, Fields, IdEntity } from 'remult'

@Entity<HelperBasketTypes>('HelpersBase', {
  dbName: 'HelperBasketTypes',
  allowApiCrud: false,
  allowApiRead: Allow.authenticated
})
export class HelperBasketTypes extends IdEntity {
  @Fields.string<HelperBasketTypes>({})
  helperId: string

  @Fields.string<HelperBasketTypes>({})
  basketTypeId: string
}
