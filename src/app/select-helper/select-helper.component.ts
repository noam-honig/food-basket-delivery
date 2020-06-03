import { Component, OnInit } from '@angular/core';

import { MatDialogRef } from '@angular/material/dialog';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { Context, FindOptions } from '@remult/core';
import { FilterBase } from '@remult/core';

import { BusyService } from '@remult/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';

@Component({
  selector: 'app-select-helper',
  templateUrl: './select-helper.component.html',
  styleUrls: ['./select-helper.component.scss']
})
export class SelectHelperComponent implements OnInit {

  searchString: string = '';
  lastFilter: string = undefined;
  public args: {
    hideRecent?: boolean,
    onSelect: (selectedValue: HelpersBase) => void,
    filter?: (helper: HelpersAndStats) => FilterBase

  };
  filteredHelpers: HelpersBase[] = [];
  constructor(
    private dialogRef: MatDialogRef<any>,

    private context: Context,
    private busy: BusyService,
    public settings:ApplicationSettings

  ) {

  }
  clearHelper() {
    this.select(undefined);
  }


  findOptions = {
    orderBy: h => [h.name], limit: 25
  } as FindOptions<HelpersAndStats>;
  async ngOnInit() {


    this.findOptions.where = h => {
      let r = h.name.isContains(this.searchString);
      if (this.args.filter) {
        return r.and(this.args.filter(h));
      }

      return r;
    };

    if (Helpers.recentHelpers.length == 0 || this.args.hideRecent)
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

    await this.busy.donotWait(async () => {
      this.filteredHelpers = await this.context.for(HelpersAndStats).find(this.findOptions);
      this.showingRecentHelpers = false;
    });

  }
  doFilter() {
    if (this.searchString.trim() != this.lastFilter) {
      this.lastFilter = this.searchString.trim();
      this.getHelpers();
    }

  }
  showCompany() {
    return ApplicationSettings.get(this.context).showCompanies.value;
  }
  selectFirst() {
    if (this.filteredHelpers.length > 0)
      this.select(this.filteredHelpers[0]);
  }
  select(h: HelpersBase) {
    this.args.onSelect(h);
    if (h && !h.isNew())
      Helpers.addToRecent(h);
    this.dialogRef.close();
  }
}