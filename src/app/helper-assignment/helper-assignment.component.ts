import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Helpers } from '../helpers/helpers';

import { AsignFamilyComponent } from '../asign-family/asign-family.component';

@Component({
  selector: 'app-helper-assignment',
  templateUrl: './helper-assignment.component.html',
  styleUrls: ['./helper-assignment.component.scss']
})
export class HelperAssignmentComponent implements OnInit {
  public argsHelper: Helpers;
  constructor(
    private dialogRef: MatDialogRef<any>
  ) {
  }
  @ViewChild("assign", { static: true }) asign: AsignFamilyComponent;
  ngOnInit() {
    this.asign.specificToHelper(this.argsHelper);
  }

  close() {
    this.dialogRef.close();
  }
}