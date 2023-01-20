import { Component, OnDestroy, OnInit } from '@angular/core';
import { UserFamiliesList } from '../my-families/user-families';
import { remult } from 'remult';
import { DialogConfig } from '../common-ui-elements';

import { MatDialogRef } from '@angular/material/dialog';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DestroyHelper } from '../select-popup/dialog';


@Component({
  selector: 'app-preview-family',
  templateUrl: './preview-family.component.html',
  styleUrls: ['./preview-family.component.scss']
})
@DialogConfig({ minWidth: 350 })
export class PreviewFamilyComponent implements OnInit, OnDestroy {
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }
  familyLists = new UserFamiliesList(this.settings, this.destroyHelper);
  public argsFamily: ActiveFamilyDeliveries;
  constructor(private dialogRef: MatDialogRef<any>
    , public settings: ApplicationSettings) { }
  async ngOnInit() {

    this.familyLists.toDeliver = [this.argsFamily];
    this.familyLists.helper = await remult.context.getCurrentUser();



  }
  cancel() {
    this.dialogRef.close();
  }
}
