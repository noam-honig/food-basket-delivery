import { Allow, Entity, IdEntity } from 'remult'
import { Fields } from '../translate'

@Entity<DeliveriesInstructions>('DeliveriesInstructions', {
  dbName: 'DeliveriesInstructions',
  allowApiCrud: Allow.authenticated,
  allowApiRead: true
})
export class DeliveriesInstructions extends IdEntity {
  @Fields.string({})
  deliveryId: string = ''

  @Fields.string({})
  description: string = ''

  @Fields.boolean({})
  done: boolean = false
}
