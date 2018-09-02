import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Families } from '../families/families';
import { GridSettings } from 'radweb';

@Component({
  selector: 'app-update-family-dialog',
  templateUrl: './update-family-dialog.component.html',
  styleUrls: ['./update-family-dialog.component.scss']
})
export class UpdateFamilyDialogComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<UpdateFamilyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UpdateFamilyInfo

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
  }

  ngOnInit() {
  }
  families = new GridSettings(new Families(), { allowUpdate: true });

}

export interface UpdateFamilyInfo {
  f: Families
}