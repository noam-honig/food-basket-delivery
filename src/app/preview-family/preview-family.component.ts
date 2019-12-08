import { Component, OnInit } from '@angular/core';
import { UserFamiliesList } from '../my-families/user-families';
import { Context, DialogConfig } from '@remult/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Families } from '../families/families';

@Component({
  selector: 'app-preview-family',
  templateUrl: './preview-family.component.html',
  styleUrls: ['./preview-family.component.scss']
})
@DialogConfig({minWidth:350})
export class PreviewFamilyComponent implements OnInit {

  familyLists = new UserFamiliesList(this.context);
  public argsFamily: Families;
  constructor(public context: Context, private dialogRef: MatDialogRef<any>
  ) { }
  async ngOnInit() {

    this.familyLists.toDeliver = [this.argsFamily];



  }
  cancel() {
    this.dialogRef.close();
  }
}
