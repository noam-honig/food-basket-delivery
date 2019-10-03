import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Families } from '../families/families';
import { GridSettings } from 'radweb';
import { Context } from 'radweb';
import { FamilyDeliveries } from '../families/FamilyDeliveries';

@Component({
  selector: 'app-update-family-dialog',
  templateUrl: './update-family-dialog.component.html',
  styleUrls: ['./update-family-dialog.component.scss']
})
export class UpdateFamilyDialogComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<UpdateFamilyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UpdateFamilyInfo,
    private context: Context

  ) {


    this.families.currentRow = data.f;
  }
  cancel() {
    this.families.currentRow.reset();
    this.dialogRef.close();
  }
  async confirm() {
    await this.families.currentRow.save();
    this.dialogRef.close();
    if (this.data)
      this.data.onSave();
  }

  currentFamilyDeliveries: FamilyDeliveries[] = [];

  async ngOnInit() {
    this.currentFamilyDeliveries = await this.families.currentRow.getDeliveries();
  }
  families = this.context.for(Families).gridSettings({ allowUpdate: true });

}

export interface UpdateFamilyInfo {
  f: Families,
  message?: string,
  disableSave?: boolean,
  onSave?: () => void
}