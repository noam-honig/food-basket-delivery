import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { IDataAreaSettings, DataAreaSettings } from '@remult/core';

@Component({
  selector: 'app-input-area',
  templateUrl: './input-area.component.html',
  styleUrls: ['./input-area.component.scss']
})
export class InputAreaComponent implements OnInit {
  args: {
    title: string,
    settings: IDataAreaSettings<any>,
    ok: () => void,
    cancel?: () => void,
    buttons?: button[]
  };
  
  constructor(
    public dialogRef: MatDialogRef<any>

  ) {

    dialogRef.afterClosed().toPromise().then(x => this.cancel());
  }
  area: DataAreaSettings<any>;

  ngOnInit() {
    this.area = new DataAreaSettings(this.args.settings, null, null);
  }
  cancel() {
    if (!this.ok && this.args.cancel)
      this.args.cancel();

  }
  ok = false;
  confirm() {
    this.ok = true;
    this.dialogRef.close();
    this.args.ok();
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