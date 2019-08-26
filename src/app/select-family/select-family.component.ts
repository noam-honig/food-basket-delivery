import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { GridSettings, Filter } from 'radweb';
import { Families } from '../families/families';
import { BusyService } from 'radweb';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FilterBase } from 'radweb';
import { Context } from 'radweb';
import { DeliveryStatus } from '../families/DeliveryStatus';


@Component({
  selector: 'app-select-family',
  templateUrl: './select-family.component.html',
  styleUrls: ['./select-family.component.scss']
})
export class SelectFamilyComponent implements OnInit {
  @ViewChild("search") search: ElementRef;
  constructor(private busy: BusyService, private dialogRef: MatDialogRef<SelectFamilyComponent>,
    @Inject(MAT_DIALOG_DATA) private data: SelectFamilyInfo, private context: Context) { }
  searchString: string = '';
  families = this.context.for(Families).gridSettings({ knowTotalRows: true });
  pageSize = 7;
  selectFirst() {
    if (this.families.items.length > 0)
      this.select(this.families.items[0]);
  }

  async doFilter() {
    await this.busy.donotWait(async () => this.getRows());
  }
  async getRows() {

    await this.families.get({
      where: f => {
        let r = f.name.isContains(this.searchString);
        if (this.data.where) {
          let x = this.data.where(f);
          if (x)
            return r.and(x);
        }
        return r;
      },
      orderBy: f => f.name,
      limit: this.pageSize
    });


  }
  clearHelper() {
    this.dialogRef.close();
  }
  select(f: Families) {
    this.data.onSelect(f);
    this.dialogRef.close();
  }
  showStatus(f: Families) {
    if (f.deliverStatus.value == DeliveryStatus.ReadyForDelivery) {
      if (f.courier.value) {
        return 'משוייך למשנע';
      } else {
        return '';
      }
    }
    return f.deliverStatus.displayValue;
  }
  async ngOnInit() {
    this.busy.donotWait(async () =>
      await this.getRows());
    this.search.nativeElement.focus();
  }
  moreFamilies() {
    this.pageSize += 7;
    this.getRows();
  }


}
export interface SelectFamilyInfo {

  where: (f: Families) => FilterBase,
  onSelect: (selectedValue: Families) => void,

}