import { Component, OnInit, Inject } from '@angular/core';
import { Helpers } from '../models';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-select-helper',
  templateUrl: './select-helper.component.html',
  styleUrls: ['./select-helper.component.scss']
})
export class SelectHelperComponent implements OnInit {

  searchString: string;
  lastFilter: string;
  allHelpers: Helpers[] = [];
  filteredHelpers: Helpers[] = [];
  constructor(
    private dialogRef: MatDialogRef<SelectHelperComponent>,
    @Inject(MAT_DIALOG_DATA) private data: SelectHelperInfo

  ) {

  }
  clearHelper(){
    this.select(new Helpers());
  }
  async ngOnInit() {
    let h = new Helpers();
    this.allHelpers = await h.source.find({ orderBy: [h.name], limit: 1000 });
    this.filteredHelpers = this.allHelpers;
  }
  doFilter() {
    if (this.searchString != this.lastFilter) {
      this.lastFilter = this.searchString;
      if (this.searchString.trim() == '')
        this.filteredHelpers = this.allHelpers;
      else {
        this.filteredHelpers = this.allHelpers.filter(f => f.name.value.indexOf(this.searchString) >= 0 || f.phone.value.indexOf(this.searchString) >= 0);
      }
    }

  }
  selectFirst() {
    if (this.filteredHelpers.length > 0)
      this.select(this.filteredHelpers[0]);
  }
  select(h: Helpers) {
    this.data.onSelect(h);
    this.dialogRef.close();
  }

}
export interface SelectHelperInfo {

  onSelect: (selectedValue: Helpers) => void,

}