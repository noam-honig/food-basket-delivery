import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Families, duplicateFamilyInfo } from '../families/families';
import { Context, DataAreaSettings } from 'radweb';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-quick-add-family',
  templateUrl: './quick-add-family.component.html',
  styleUrls: ['./quick-add-family.component.scss']
})
export class QuickAddFamilyComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public data: QuickAddParameters,
    private context: Context,
    private select: SelectService
  ) {
    this.f.name.value = data.searchName;
    this.f.deliverStatus.value = ApplicationSettings.get(this.context).defaultStatusType.value;;
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
      [
        this.f.deliverStatus.getColumn(),
        this.f.basketType.getColumn()],
      [this.f.tz, this.f.tz2],
      this.f.address,
      [this.f.floor,
      this.f.appartment,
      this.f.entrance
      ],
      [this.f.phone1,
      this.f.phone2],
      this.f.addressComment,
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
    this.data.addedFamily(this.f);
  }
  cancel() {
    this.dialogRef.close();
  }
  ngOnInit() {
  }
  static dialog(dialog: MatDialog, data: QuickAddParameters) {
    let r = dialog.open(QuickAddFamilyComponent, { data });
  }
  getExistingFamily() {
    let f: duplicateFamilyInfo = undefined;
    for (const t of this.f.duplicateFamilies) {
      if (f == undefined)
        f = t;
      if (f.phone1 || f.phone2 || f.tz || f.tz2)
        return t;
    }
    return f;

  }
  async showExistingFamily() {
    let f = await this.context.for(Families).findFirst(f => f.id.isEqualTo(this.getExistingFamily().id));
    this.select.updateFamiliy({ f: f, message: 'נוסף ב' + f.createDate.displayValue + ' ע"י ' + (await f.createUser.getValue()) });
  }


}

interface QuickAddParameters {
  searchName: string;
  addedFamily: (f: Families) => void;
}