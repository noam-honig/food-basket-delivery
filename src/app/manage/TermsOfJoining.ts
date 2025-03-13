import { Entity, IdEntity } from 'remult'
import { Roles } from '../auth/roles'
import { Fields } from '../translate'

@Entity<TermsOfJoining>('TermsOfJoining', {
  dbName: 'TermsOfJoining',
  allowApiCrud: Roles.admin,
  allowApiRead:true,
})
export class TermsOfJoining extends IdEntity {
  @Fields.string({ translation: (l) => l.termDescription, width: '100' })
  description: string = ''

  @Fields.boolean({ translation: (l) => l.active })
  active: boolean = true
}
