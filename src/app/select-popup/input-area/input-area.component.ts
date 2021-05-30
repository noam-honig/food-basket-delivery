import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { DialogService } from '../dialog';
import { ApplicationSettings } from '../../manage/ApplicationSettings';
import { DataAreaSettings, IDataAreaSettings } from '../../../../../radweb/projects/angular';


@Component({
  selector: 'app-input-area',
  templateUrl: './input-area.component.html',
  styleUrls: ['./input-area.component.scss']
})
export class InputAreaComponent implements OnInit {
  args: {
    title: string,
    helpText?: string,
    settings: IDataAreaSettings,
    ok: () => void,
    cancel?: () => void,
    validate?: () => Promise<void>,
    buttons?: button[]
  };

  constructor(
    public dialogRef: MatDialogRef<any>,
    private dialog: DialogService,
    public settings:ApplicationSettings

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
    await this.args.ok();
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


export interface button {
  text: string,
  click: ((close: () => void) => void);
}