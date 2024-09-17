import { Entity, Remult, EntityBase, remult } from 'remult'
import { Roles } from '../auth/roles'
import { Field, Fields } from '../translate'
@Entity('ApplicationImages', {
  allowApiRead: Roles.admin,
  allowApiUpdate: Roles.admin
})
export class ApplicationImages extends EntityBase {
  @Fields.integer()
  id: number
  @Fields.string({ caption: 'איקון דף base64' })
  base64Icon: string
  @Fields.string({ caption: 'איקון דף הבית בטלפון base64' })
  base64PhoneHomeImage: string

  static async getAsync(): Promise<ApplicationImages> {
    return remult.repo(ApplicationImages).findFirst(undefined)
  }
}
