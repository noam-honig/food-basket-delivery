import { Component, OnInit, Inject } from '@angular/core';
import { Context } from '@remult/core';
import { Groups } from '../manage/manage.component';
import { DialogService } from '../select-popup/dialog';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-update-group-dialog',
  templateUrl: './update-group-dialog.component.html',
  styleUrls: ['./update-group-dialog.component.scss']
})
export class UpdateGroupDialogComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService,
    private dialogRef: MatDialogRef<any>) {


  }
  public args: {
    groups: string,
    ok: (s: string) => void
  };
  availableGroups: Groups[] = [];
  async ngOnInit() {
    this.availableGroups = await this.context.for(Groups).find();
  }

  selected(group: string) {
    if (!this.args.groups)
      return false;
    return this.args.groups.indexOf(group) >= 0;
  }
  select(group: string) {
    if (!this.selected(group)) {

      if (this.args.groups)
        this.args.groups += ', ';
      else
        this.args.groups = '';
      this.args.groups += group;
    }
    else {
      let groups = this.args.groups.split(",").map(x => x.trim());
      let index = groups.indexOf(group);
      if (index < 0) {
        this.dialog.messageDialog("לא הצלחתי לבטל את הקבוצה " + group + " כנראה שהיא לא מופיעה בפני עצמה אלא כחלק משם קבוצה אחרת, אנא וודא שיש פסיקים בין הקבוצות");
      }
      else {
        groups.splice(index, 1);
        this.args.groups = groups.join(", ");
      }

    }

  }
  cancel() {

    this.dialogRef.close();
  }
  async confirm() {
    await this.args.ok(this.args.groups);
    this.dialogRef.close();
  }
}
