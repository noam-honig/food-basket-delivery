import { Component, OnInit, Inject } from '@angular/core';
import { Context } from '../shared/context';
import { Groups } from '../manage/manage.component';
import { DialogService } from '../select-popup/dialog';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-update-group-dialog',
  templateUrl: './update-group-dialog.component.html',
  styleUrls: ['./update-group-dialog.component.scss']
})
export class UpdateGroupDialogComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService,
    private dialogRef: MatDialogRef<UpdateGroupInfo>,
    @Inject(MAT_DIALOG_DATA) public data: UpdateGroupInfo) {
    this.groups = data.groups;

  }
  availableGroups: Groups[] = [];
  async ngOnInit() {
    this.availableGroups = await this.context.for(Groups).find();
  }
  groups = '';
  selected(group: string) {
    return this.groups.indexOf(group) >= 0;
  }
  select(group: string) {
    if (!this.selected(group)) {

      if (this.groups)
        this.groups += ', ';
      this.groups += group;
    }
    else {
      let groups = this.groups.split(",").map(x => x.trim());
      let index = groups.indexOf(group);
      if (index < 0) {
        this.dialog.YesNoQuestion("לא הצלחתי לבטל את הקבוצה " + group + " כנראה שהיא לא מופיעה בפני עצמה אלא כחלק משם קבוצה אחרת, אנא וודא שיש פסיקים בין הקבוצות");
      }
      else {
        groups.splice(index, 1);
        this.groups = groups.join(", ");
      }

    }

  }
  cancel() {
    
    this.dialogRef.close();
  }
  async confirm() {
    await this.data.ok(this.groups);
    this.dialogRef.close();
  }
}
export interface UpdateGroupInfo {
  groups: string,
  ok: (s: string) => void
}