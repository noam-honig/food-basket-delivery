import { Entity, IdEntity } from 'remult'
import { Roles } from '../auth/roles'
import { Fields } from '../translate'

@Entity('VolunteerInstructions', {
  dbName: 'VolunteerInstructions',
  allowApiCrud: Roles.admin,
  allowApiRead:true,
})
export class VolunteerInstructions extends IdEntity {
  @Fields.string({ translation: (l) => l.instructioDescription })
  description: string = ''

  @Fields.boolean({ translation: (l) => l.active })
  active: boolean = true
}
