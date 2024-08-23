import {
  Entity,
  EntityBase,
  EntityMetadata,
  EntityRef,
  FieldRef,
  FieldsRef,
  FieldType,
  getEntityRef,
  IdEntity,
  isBackend,
  remult
} from 'remult'
import { Roles } from '../auth/roles'
import { Fields } from '../translate'

@Entity<ChangeLog>('changeLog', {
  allowApiRead: Roles.admin,
  defaultOrderBy: {
    changeDate: 'desc'
  }
})
export class ChangeLog extends IdEntity {
  @Fields.string()
  relatedId: string = ''
  @Fields.string()
  relatedName: string = ''
  @Fields.string()
  entity: string = ''
  @Fields.string()
  appUrl: string = ''
  @Fields.string()
  apiUrl: string = ''
  @Fields.date()
  changeDate: Date = new Date()
  @Fields.string()
  userId: string
  @Fields.string()
  userName: string
  @Fields.object()
  changes: change[] = []
  @Fields.object()
  changedFields: string[] = []
}
export interface changeEvent {
  date: Date
  userId: string
  userName: string
  changes: change[]
}
export interface change {
  key: string
  oldValue: string
  oldDisplayValue: string
  newValue: string
  newDisplayValue: string
}

export async function recordChanges<entityType extends EntityBase>(
  self: entityType,
  options?: ColumnDeciderArgs<entityType>
) {
  if (!self.isNew() && isBackend()) {
    let changes = [] as change[]
    const decider = new FieldDecider(self, options)

    for (const c of decider.fields.filter((c) => c.valueChanged())) {
      try {
        let transValue = (val: any) => val
        if (c.metadata.options.displayValue)
          transValue = (val) => c.metadata.options.displayValue!(self, val)
        else if (c.metadata.options.valueConverter.displayValue)
          transValue = (val) =>
            val === null
              ? null
              : val === undefined
              ? undefined
              : c.metadata.options.valueConverter.displayValue(val)
        else if (c.metadata.valueType === Boolean)
          transValue = (val) => (val ? 'V' : 'X')

        const noVal = decider.excludedValues.includes(c)
        changes.push({
          key: c.metadata.key,
          oldDisplayValue: noVal ? '***' : transValue(c.originalValue),
          newDisplayValue: noVal ? '***' : transValue(c.value),
          newValue: noVal
            ? '***'
            : c.value instanceof IdEntity
            ? c.value.id
            : c.metadata.options.valueConverter.toJson(c.value),
          oldValue: noVal
            ? '***'
            : c.originalValue instanceof IdEntity
            ? c.originalValue.id
            : c.metadata.options.valueConverter.toJson(c.originalValue)
        })
      } catch (err) {
        console.log('Change log failure', { err, c })
        throw err
      }
    }

    if (changes.length > 0) {
      await remult.repo(ChangeLog).insert({
        changeDate: new Date(),
        changedFields: changes.map((x) => x.key),
        changes,
        entity: self._.metadata.key,
        relatedId: self._.getId().toString(),
        relatedName: self.$.find('name')?.originalValue,
        userId: remult.user?.id,
        userName: remult.user?.name,
        appUrl: remult.context.requestRefererOnBackend,
        apiUrl: remult.context.requestUrlOnBackend
      })
    }
  }
}
interface ColumnDeciderArgs<entityType> {
  excludeColumns?: (e: FieldsRef<entityType>) => FieldRef<entityType>[]
  excludeValues?: (e: FieldsRef<entityType>) => FieldRef<entityType>[]
}
export class FieldDecider<entityType> {
  fields: FieldRef<entityType>[]
  excludedFields: FieldRef<entityType>[]
  excludedValues: FieldRef<entityType>[]
  constructor(entity: entityType, options: ColumnDeciderArgs<entityType>) {
    const meta = getEntityRef(entity)
    if (!options?.excludeColumns) this.excludedFields = []
    else this.excludedFields = options.excludeColumns(meta.fields)
    if (!options?.excludeValues) this.excludedValues = []
    else this.excludedValues = options.excludeValues(meta.fields)
    this.excludedFields.push(
      ...meta.fields
        .toArray()
        .filter((c) => c.metadata.options.serverExpression)
    )
    this.excludedFields.push(
      ...meta.fields.toArray().filter((c) => c.metadata.options.sqlExpression)
    )
    this.fields = meta.fields
      .toArray()
      .filter((f) => !this.excludedFields.includes(f))
  }
}

/*
select value->'newValue'->>'address',value from (
select * from uga.changelog ) as x ,json_array_elements(cast (x.changes as json))
where value->>'key' ='email'
order by changeDate desc
*/

/*
select changedate,username,relatedname, value->>'key',value->>'newDisplayValue' thenew,value->>'oldDisplayValue' theold,value from (
select * from atbh.changelog ) as x ,json_array_elements(cast (x.changes as json))
where value->>'key' ='address' or value->>'key' ='name'
order by changeDate desc
*/
