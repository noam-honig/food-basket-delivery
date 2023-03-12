import { Component, OnInit, Inject } from '@angular/core'
import { remult } from 'remult'
import { Groups, GroupsValue } from '../manage/groups'
import { DialogService } from '../select-popup/dialog'
import { MatDialogRef } from '@angular/material/dialog'

import { ApplicationSettings } from '../manage/ApplicationSettings'
import { InputField } from '../common-ui-elements/interfaces'
import { UpdateGroupArgs } from '../helpers/init-context'

@Component({
  selector: 'app-update-group-dialog',
  templateUrl: './update-group-dialog.component.html',
  styleUrls: ['./update-group-dialog.component.scss']
})
export class UpdateGroupDialogComponent implements OnInit {
  constructor(
    private dialog: DialogService,
    private dialogRef: MatDialogRef<any>,
    public settings: ApplicationSettings
  ) {}

  init(args: UpdateGroupArgs) {
    this.groups.value = new GroupsValue(args.groups || '')
    this.ok = args.ok
  }
  ok: (s: string) => void

  availableGroups: Groups[] = []
  async ngOnInit() {
    this.availableGroups = await remult.repo(Groups).find({ limit: 1000 })
  }

  groups = new InputField<GroupsValue>({ valueType: GroupsValue })
  selected(group: string) {
    return this.groups.value.selected(group)
  }
  select(group: string) {
    if (!this.selected(group)) {
      this.groups.value = this.groups.value.addGroup(group)
    } else {
      this.groups.value = this.groups.value.removeGroup(group)
      if (this.selected(group))
        this.dialog.messageDialog(
          'לא הצלחתי לבטל את הקבוצה ' +
            group +
            ' כנראה שהיא לא מופיעה בפני עצמה אלא כחלק משם קבוצה אחרת, אנא וודא שיש פסיקים בין הקבוצות'
        )
    }
  }
  cancel() {
    this.dialogRef.close()
  }
  async confirm() {
    await this.ok(this.groups.value.evilGet())
    this.dialogRef.close()
  }
}
