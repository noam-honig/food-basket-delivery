import { Component, OnInit, Inject } from '@angular/core';
import { UserFamiliesList } from '../my-families/user-families';
import { Context } from '../shared/context';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Families } from '../families/families';

@Component({
  selector: 'app-preview-family',
  templateUrl: './preview-family.component.html',
  styleUrls: ['./preview-family.component.scss']
})
export class PreviewFamilyComponent implements OnInit {

  familyLists = new UserFamiliesList(this.context);

  constructor(public context: Context,private dialogRef: MatDialogRef<PreviewFamilyComponent>,
    @Inject(MAT_DIALOG_DATA) private data: PreviewFamilyInfo,
    ) { }
  async ngOnInit() {
    this.familyLists.allFamilies = [this.data.f];
    this.familyLists.initFamilies();

  }
  cancel(){
    this.dialogRef.close();
  }
}

export interface PreviewFamilyInfo {

  f:Families;

}