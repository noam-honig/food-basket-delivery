import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MatDialogActions } from '@angular/material/dialog';
import { Families } from '../families/families';

import { Context, DialogConfig } from '@remult/core';
import { FamilyDeliveries } from '../families/FamilyDeliveries';

@Component({
  selector: 'app-update-family-dialog',
  templateUrl: './update-family-dialog.component.html',
  styleUrls: ['./update-family-dialog.component.scss']
})
@DialogConfig({ minWidth: 350 })
export class UpdateFamilyDialogComponent implements OnInit {
  public args: {
    f: Families,
    message?: string,
    disableSave?: boolean,
    onSave?: () => void
  };
  constructor(
    private dialogRef: MatDialogRef<any>,

    private context: Context

  ) {

  }
  cancel() {
    this.families.currentRow.undoChanges();
    this.dialogRef.close();
  }
  async confirm() {
    await this.families.currentRow.save();
    this.dialogRef.close();
    if (this.args)
      this.args.onSave();
  }

  currentFamilyDeliveries: FamilyDeliveries[] = [];

  async ngOnInit() {
    this.families.currentRow = this.args.f;
    this.currentFamilyDeliveries = await this.families.currentRow.getDeliveries();
  }
  families = this.context.for(Families).gridSettings({ allowUpdate: true });
}
