import { Component, OnInit, Inject } from '@angular/core';
import { Context } from '@remult/core';
import { Groups } from '../manage/groups';
import { DialogService } from '../select-popup/dialog';
import { MatDialogRef } from '@angular/material/dialog';

import { ApplicationSettings } from '../manage/ApplicationSettings';
import { InputField } from '../../../../radweb/projects/angular';
import { GroupsValue } from '../families/families';

@Component({
  selector: 'app-update-group-dialog',
  templateUrl: './update-group-dialog.component.html',
  styleUrls: ['./update-group-dialog.component.scss']
})

export class UpdateGroupDialogComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService,
    private dialogRef: MatDialogRef<any>, public settings: ApplicationSettings) {


  }


  init(args: {
    groups: string,
    ok: (s: string) => void
  }) {
    this.groups.value = new GroupsValue( args.groups);
    this.ok = args.ok;
  }
  ok: (s: string) => void;

  availableGroups: Groups[] = [];
  async ngOnInit() {
    this.availableGroups = await this.context.for(Groups).find({ limit: 1000 });
  }

  groups = new InputField<GroupsValue>({dataType:GroupsValue});
  selected(group: string) {
    return this.groups.value.selected(group);
  }
  select(group: string) {
    if (!this.selected(group)) {
      this.groups.value.addGroup(group);

    }
    else {
      this.groups.value.removeGroup(group);
      if (this.selected(group))
        this.dialog.messageDialog("לא הצלחתי לבטל את הקבוצה " + group + " כנראה שהיא לא מופיעה בפני עצמה אלא כחלק משם קבוצה אחרת, אנא וודא שיש פסיקים בין הקבוצות");


    }

  }
  cancel() {

    this.dialogRef.close();
  }
  async confirm() {
    await this.ok(this.groups.value.evilGet());
    this.dialogRef.close();
  }
}
