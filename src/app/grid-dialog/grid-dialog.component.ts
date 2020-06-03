import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { IDataAreaSettings, DataAreaSettings, GridSettings } from '@remult/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-grid-dialog',
  templateUrl: './grid-dialog.component.html',
  styleUrls: ['./grid-dialog.component.scss']
})
export class GridDialogComponent implements OnInit {

  args: {
    title: string,
    settings: GridSettings<any>,
    ok?: () => void,
    cancel?: () => void,
    validate?: () => Promise<void>,
    buttons?: button[]
  };

  constructor(
    public dialogRef: MatDialogRef<any>,
    public settings:ApplicationSettings

  ) {

    dialogRef.afterClosed().toPromise().then(x => this.cancel());
  }


  ngOnInit() {

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
      catch{
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


}


export interface button {
  text: string,
  click: ((close: () => void) => void);
}