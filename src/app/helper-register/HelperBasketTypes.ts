import { Allow, Entity, Field, Fields, IdEntity, repo } from 'remult'
import { BasketType } from '../families/BasketType'

@Entity<HelperBasketTypes>('HelperBasketTypes', {
  dbName: 'HelperBasketTypes',
  allowApiCrud: Allow.authenticated,
  saving: async (row) => {
    if (row.isNew() || row.$.basketType.valueChanged()) {
      const helperBasketType = await repo(HelperBasketTypes).findFirst({
        helperId: row.helperId,
        basketType: row.basketType
      })

      if (helperBasketType) throw 'כבר קיים סל זה עבור המתנדב'
    }
  }
})
export class HelperBasketTypes extends IdEntity {
  @Fields.string<HelperBasketTypes>({})
  helperId: string

  @Field(() => BasketType, { caption: 'סוג סל' })
  basketType: BasketType
}
