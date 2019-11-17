import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import { Helpers } from '../helpers/helpers';
import { Context } from '@remult/core';
import { AsignFamilyComponent } from '../asign-family/asign-family.component';

@Component({
  selector: 'app-helper-assignment',
  templateUrl: './helper-assignment.component.html',
  styleUrls: ['./helper-assignment.component.scss']
})
export class HelperAssignmentComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public data: HelperAssignmentParameters,
    private context: Context
  ) {
  }
  @ViewChild("assign", { static: true }) asign: AsignFamilyComponent;
  ngOnInit() {
    this.asign.specificToHelper(this.data.helper);
  }
  static dialog(dialog: MatDialog, data: HelperAssignmentParameters) {
    let x = new MatDialogConfig();
    x.data = data;
    x.minWidth = 350;
    let r = dialog.open(HelperAssignmentComponent, x);
  }
  close() {
    this.dialogRef.close();
  }
}
export interface HelperAssignmentParameters {
  helper: Helpers
}
