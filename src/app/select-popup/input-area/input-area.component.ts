import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { DialogService } from '../dialog';
import { ApplicationSettings } from '../../manage/ApplicationSettings';
import { DataAreaSettings, IDataAreaSettings } from '@remult/angular/interfaces';
import { button, InputAreaArgs } from '../../helpers/init-context';


@Component({
  selector: 'app-input-area',
  templateUrl: './input-area.component.html',
  styleUrls: ['./input-area.component.scss']
})
export class InputAreaComponent implements OnInit {
  args: InputAreaArgs;

  constructor(
    public dialogRef: MatDialogRef<any>,
    private dialog: DialogService,
    public settings: ApplicationSettings

  ) {

    dialogRef.afterClosed().toPromise().then(x => this.cancel());
  }
  area: DataAreaSettings;

  ngOnInit() {
    this.area = new DataAreaSettings(this.args.settings, null, null);
  }
  cancel() {
    if (!this.ok && this.args.cancel)
      this.args.cancel();

  }
  ok = false;
  async confirm() {
    if (this.args.validate) {
      try {
        await this.args.validate();
      }
      catch (err) {
        this.dialog.Error((err));
        return;
      }
    }
    try {
      await this.args.ok();
    }
    catch (err) {
      this.dialog.Error((err));
      return;
    }
    this.ok = true;
    this.dialogRef.close();
    return false;
  }
  buttonClick(b: button, e: MouseEvent) {
    e.preventDefault();
    b.click(() => {
      this.dialogRef.close();
    });
  }
}
