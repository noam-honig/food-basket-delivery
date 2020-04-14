import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { Families, duplicateFamilyInfo } from '../families/families';
import { Context, DataAreaSettings } from '@remult/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';


import { UpdateFamilyDialogComponent } from '../update-family-dialog/update-family-dialog.component';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-quick-add-family',
  templateUrl: './quick-add-family.component.html',
  styleUrls: ['./quick-add-family.component.scss']
})
export class QuickAddFamilyComponent implements OnInit {
  public argOnAdd: (f: Families) => void;


  constructor(
    private dialogRef: MatDialogRef<any>,
    private context: Context,
    private dialog: DialogService
  ) {

    this.f.deliverStatus.value = ApplicationSettings.get(this.context).defaultStatusType.value;;
    this.f.distributionCenter.value = dialog.distCenter.value;
  }
  f: Families = this.context.for(Families).create();

  addressInfo = new DataAreaSettings<Families>({
    columnSettings: () => [
      this.f.floor,
      this.f.appartment,
      this.f.entrance
    ]
  });
  basketStatusLine = new DataAreaSettings<Families>({
    columnSettings: () => [
      this.f.name,
      [this.f.tz, this.f.tz2],
      this.f.address,
      [this.f.floor,
      this.f.appartment,
      this.f.entrance
      ],
      this.f.addressComment,
      [this.f.phone1,
      this.f.phone2],
      [
        this.f.deliverStatus,
        this.f.basketType],
      this.f.groups,
      this.f.deliveryComments



    ]
  });
  afterAddressInfo = new DataAreaSettings<Families>({
    columnSettings: () => [
      this.f.addressComment,
      this.f.deliveryComments
    ]
  });
  async confirm() {
    await this.f.save();
    this.dialogRef.close();
    this.argOnAdd(this.f);
  }
  cancel() {
    this.dialogRef.close();
  }
  ngOnInit() {
    this.f.basketType.value = '';
  }

  getExistingFamily() {
    let f: duplicateFamilyInfo = undefined;
    for (const t of this.f.duplicateFamilies) {
      if (f == undefined)
        f = t;
      if (f.phone1 || f.phone2 || f.phone3 || f.phone4 || f.tz || f.tz2)
        return t;
    }
    return f;

  }
  async showExistingFamily() {
    let f = await this.context.for(Families).findFirst(f => f.id.isEqualTo(this.getExistingFamily().id));
    this.context.openDialog(UpdateFamilyDialogComponent, async x => x.args = { f: f, message: 'נוסף ב' + f.createDate.displayValue + ' ע"י ' + (await f.createUser.getValue()) });
  }


}
