import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Families } from '../families/families';
import { Context, DataAreaSettings } from 'radweb';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-quick-add-family',
  templateUrl: './quick-add-family.component.html',
  styleUrls: ['./quick-add-family.component.scss']
})
export class QuickAddFamilyComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public data: QuickAddParameters,
    private context: Context
  ) {
    this.f.name.value = data.searchName;
    this.f.deliverStatus.value =  ApplicationSettings.get(this.context).defaultStatusType.value;;
  }
  f: Families = this.context.for(Families).create();
  area = new DataAreaSettings<Families>(
    {
      columnSettings: () => [
        this.f.name,
        this.f.tz,
        this.f.tz2,
        this.f.deliverStatus.getColumn(),
        this.f.address,
        this.f.floor,
        this.f.appartment,
        this.f.entrance,
        this.f.addressComment,
        this.f.phone1,
        this.f.phone2,
        this.f.basketType.getColumn(),
        this.f.deliveryComments
      ]
    }
  );
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


}

interface QuickAddParameters {
  searchName: string;
  addedFamily: (f: Families) => void;
}