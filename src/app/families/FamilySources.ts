import { Phone } from '../model-shared/phone'

import { IdEntity, Entity, Allow } from 'remult'
import { Roles } from '../auth/roles'

import {
  DataControl,
  getEntityValueList
} from '../common-ui-elements/interfaces'
import { use, Field, FieldType, Fields } from '../translate'

@DataControl({
  valueList: (remult) =>
    getEntityValueList(remult.repo(FamilySources), { cache: true })
})
@FieldType<FamilySources>({
  valueConverter: {
    toJson: (x) => (x != undefined ? x : ''),
    fromJson: (x) => (x || x == '' ? x : null)
  },
  displayValue: (e, val) => (val ? val.name : '')
})
@Entity<FamilySources>('FamilySources', {
  allowApiRead: Allow.authenticated,
  allowApiCrud: Roles.admin,
  defaultOrderBy: { name: 'asc' }
})
export class FamilySources extends IdEntity {
  @Fields.string({ translation: (l) => l.familySourceName })
  name: string
  @Fields.string({ translation: (l) => l.contactPersonName })
  contactPerson: string
  @Field(() => Phone)
  phone: Phone
}
