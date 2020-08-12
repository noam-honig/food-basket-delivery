import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Helpers } from '../helpers/helpers';

import { AsignFamilyComponent } from '../asign-family/asign-family.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogConfig, Context } from '@remult/core';

@Component({
  selector: 'app-helper-assignment',
  templateUrl: './helper-assignment.component.html',
  styleUrls: ['./helper-assignment.component.scss']
})
@DialogConfig({
  minWidth:'95%',
  height:'98%',
  panelClass:'assign-volunteer-dialog'


})
export class HelperAssignmentComponent implements OnInit {
  public argsHelper: Helpers;
  constructor(
    private dialogRef: MatDialogRef<any>,
    public settings:ApplicationSettings,
    public context:Context
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