import { DataControl, openDialog } from "@remult/angular";
import { IdEntity, Context, Entity } from "@remult/core";
import { Roles } from "../auth/roles";
import { Field, FieldType, use } from "../translate";

@Entity({
  key: "groups",
  allowApiRead: Roles.admin,
  allowApiCrud: Roles.admin,
})
export class Groups extends IdEntity {

  @Field({ translation: l => l.group })
  name: string;
}

@FieldType<GroupsValue>({
  valueConverter: {
    toJson: x => x ? x.value : '',
    fromJson: x => new GroupsValue(x),
    displayValue: x => x.value
  },
  translation: l => l.familyGroup,
})
@DataControl<any, GroupsValue>({
  forceEqualFilter: false,
  width: '300',
  click: async (row, col) => {
    openDialog((await import('../update-group-dialog/update-group-dialog.component')).UpdateGroupDialogComponent, s => {
      s.init({
        groups: col.value.value,
        ok: x => col.value = new GroupsValue(x)
      })
    });
  }

})
export class GroupsValue {
  hasAny() {
    return this.value != '';
  }
  replace(val: string) {
    this.value = val;
  }
  constructor(private value: string) {

  }
  evilGet() {
    return this.value;
  }
  listGroups() {
    if (!this.value)
      return [];
    return this.value.split(',');
  }
  removeGroup(group: string) {
    let groups = this.value.split(",").map(x => x.trim());
    let index = groups.indexOf(group);
    if (index >= 0) {
      groups.splice(index, 1);
      this.value = groups.join(", ");
    }
  }
  addGroup(group: string) {
    if (this.value)
      this.value += ', ';
    else
      this.value = '';
    this.value += group;
  }
  selected(group: string) {
    if (!this.value)
      return false;
    return this.value.indexOf(group) >= 0;
  }

}
