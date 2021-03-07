import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { IDataAreaSettings, DataAreaSettings, GridSettings } from '@remult/core';
import { DialogConfig } from '@remult/angular';
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-grid-dialog',
  templateUrl: './grid-dialog.component.html',
  styleUrls: ['./grid-dialog.component.scss']
})
@DialogConfig({

  minWidth: '95vw'
})
export class GridDialogComponent implements OnInit {

  args: {
    title: string,
    settings: GridSettings<any>,
    stateName?: string,
    ok?: () => void,
    cancel?: () => void,
    validate?: () => Promise<void>,
    buttons?: button[]
  };

  constructor(
    public dialogRef: MatDialogRef<any>,
    public settings: ApplicationSettings

  ) {

    dialogRef.afterClosed().toPromise().then(x => this.cancel());
  }


  ngOnInit() {
    if (this.args.stateName)
      new columnOrderAndWidthSaver(this.args.settings).load(this.args.stateName)
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
      catch {
        return;
      }
    }
    if (this.args.ok)
      await this.args.ok();
    this.ok = true;
    this.dialogRef.close();

  }
  buttonClick(b: button, e: MouseEvent) {
    e.preventDefault();
    b.click(() => {
      this.dialogRef.close();
    });
  }
  isVisible(b: button) {
    if (!b.visible)
      return true;
    return b.visible();
  }


}


export interface button {
  text: string,
  click: ((close: () => void) => void),
  visible?: () => boolean

}