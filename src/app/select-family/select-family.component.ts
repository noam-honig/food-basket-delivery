import { Component, OnInit, Inject } from '@angular/core';
import { GridSettings, Filter } from 'radweb';
import { Families } from '../models';
import { BusyService } from '../select-popup/busy-service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';


@Component({
  selector: 'app-select-family',
  templateUrl: './select-family.component.html',
  styleUrls: ['./select-family.component.scss']
})
export class SelectFamilyComponent implements OnInit {

  constructor(private busy: BusyService, private dialogRef: MatDialogRef<SelectFamilyComponent>,
    @Inject(MAT_DIALOG_DATA) private data: SelectFamilyInfo) { }
  searchString: string = '';
  families = new GridSettings(new Families());
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
      where: f => f.name.isContains(this.searchString),
      orderBy: f => f.name,
      limit: this.pageSize

    });

  }
  clearHelper() {
    this.searchString = '';
    this.getRows();
  }
  select(f: Families) {
    this.data.onSelect(f);
    this.dialogRef.close();
  }
  ngOnInit() {
    this.getRows();
  }
  moreFamilies() {
    this.pageSize += 7;
    this.getRows();
  }


}
export interface SelectFamilyInfo {

  where: (f: Families) => Filter,
  onSelect: (selectedValue: Families) => void,

}