import { DataControl } from '../common-ui-elements/interfaces'
import { IdEntity, Entity } from 'remult'
import { Roles } from '../auth/roles'
import { Fields, FieldType, use } from '../translate'

@Entity('groups', {
  allowApiRead: Roles.admin,
  allowApiCrud: Roles.admin
})
export class Groups extends IdEntity {
  @Fields.string({ translation: (l) => l.group })
  name: string
}

@FieldType<GroupsValue>({
  valueConverter: {
    toJson: (x) => (x ? x.value : ''),
    fromJson: (x) => new GroupsValue(x)
  },
  displayValue: (y, x) => x.value,
  translation: (l) => l.familyGroup,
  width: '300',
  clickWithTools: async (row, col, ui) => {
    ui.updateGroup({
      groups: col.value?.value,
      ok: (x) => (col.value = new GroupsValue(x))
    })
  }
})
export class GroupsValue {
  hasAny() {
    return this.value != ''
  }

  constructor(private readonly value: string) {}
  evilGet() {
    return this.value
  }
  listGroups() {
    if (!this.value) return []
    return this.value.split(',')
  }
  removeGroup(group: string) {
    let groups = this.value.split(',').map((x) => x.trim())
    let index = groups.indexOf(group)
    let result = ''
    if (index >= 0) {
      groups.splice(index, 1)
      result = groups.join(', ')
    }
    return new GroupsValue(result)
  }
  addGroup(group: string) {
    let r = this.value
    if (r) r += ', '
    else r = ''
    r += group
    return new GroupsValue(r)
  }
  selected(group: string) {
    if (!this.value) return false
    return this.value.indexOf(group) >= 0
  }
}
