import { Component, OnInit, Inject } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Helpers } from '../helpers/helpers';
import { Context } from 'radweb';
import { FilterBase, FindOptionsPerEntity } from 'radweb';

import { BusyService } from 'radweb';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-select-helper',
  templateUrl: './select-helper.component.html',
  styleUrls: ['./select-helper.component.scss']
})
export class SelectHelperComponent implements OnInit {

  searchString: string = '';
  lastFilter: string = undefined;

  filteredHelpers: Helpers[] = [];
  constructor(
    private dialogRef: MatDialogRef<SelectHelperComponent>,
    @Inject(MAT_DIALOG_DATA) private data: SelectHelperInfo,
    private context: Context,
    private busy: BusyService

  ) {

  }
  clearHelper() {
    this.select(undefined);
  }
  

  findOptions = {
    orderBy: h => [h.name], limit: 25
  } as FindOptionsPerEntity<Helpers>;
  async ngOnInit() {


    this.findOptions.where = h => {
      let r = h.name.isContains(this.searchString);
      if (this.data.filter) {
        return r.and(this.data.filter(h));
      }
      return r;
    };

    if (Helpers.recentHelpers.length == 0)
      this.getHelpers();
    else {
      this.filteredHelpers = [...Helpers.recentHelpers];
      this.showingRecentHelpers = true;
    }

  }
  showingRecentHelpers = false;
  moreHelpers() {
    this.findOptions.limit *= 2;
    this.getHelpers();
  }
  async getHelpers() {
    
    await this.busy.donotWait(async () =>{
      this.filteredHelpers = await this.context.for(Helpers).find(this.findOptions);
      this.showingRecentHelpers = false;
    });
    
  }
  doFilter() {
    if (this.searchString.trim() != this.lastFilter) {
      this.lastFilter = this.searchString.trim();
      this.getHelpers();
    }

  }
  showCompany(){
    return ApplicationSettings.get(this.context).showCompanies.value;
  }
  selectFirst() {
    if (this.filteredHelpers.length > 0)
      this.select(this.filteredHelpers[0]);
  }
  select(h: Helpers) {
    this.data.onSelect(h);
    if (h&&!h.isNew())
      Helpers.addToRecent(h);
    this.dialogRef.close();
  }

}
export interface SelectHelperInfo {

  onSelect: (selectedValue: Helpers) => void,
  filter?: (helper: Helpers) => FilterBase

}