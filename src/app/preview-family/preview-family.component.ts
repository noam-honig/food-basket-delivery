import { Component, OnInit } from '@angular/core';
import { UserFamiliesList } from '../my-families/user-families';
import { remult } from 'remult';
import { DialogConfig } from '@remult/angular';

import { MatDialogRef } from '@angular/material/dialog';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';


@Component({
  selector: 'app-preview-family',
  templateUrl: './preview-family.component.html',
  styleUrls: ['./preview-family.component.scss']
})
@DialogConfig({ minWidth: 350 })
export class PreviewFamilyComponent implements OnInit {

  familyLists = new UserFamiliesList(this.settings, this.dialog);
  public argsFamily: ActiveFamilyDeliveries;
  constructor(private dialogRef: MatDialogRef<any>
    , public settings: ApplicationSettings, private dialog: DialogService) { }
  async ngOnInit() {

    this.familyLists.toDeliver = [this.argsFamily];
    this.familyLists.helper = await remult.context.getCurrentUser();



  }
  cancel() {
    this.dialogRef.close();
  }
}
