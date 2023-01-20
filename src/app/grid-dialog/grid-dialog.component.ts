import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from '../common-ui-elements';
import { GridSettings } from '../common-ui-elements/interfaces';
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver';
import { button, GridDialogArgs } from '../helpers/init-context';
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

  args: GridDialogArgs;

  constructor(
    public dialogRef: MatDialogRef<any>,
    public settings: ApplicationSettings

  ) {

    dialogRef.afterClosed().toPromise().then(x => this.cancel());
  }


  ngOnInit() {
    if (this.args?.stateName)
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


