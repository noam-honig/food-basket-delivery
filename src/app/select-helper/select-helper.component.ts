import { Component, OnInit } from '@angular/core';

import { MatDialogRef } from '@angular/material/dialog';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { Context, FindOptions, ServerFunction, DialogConfig } from '@remult/core';
import { FilterBase } from '@remult/core';

import { BusyService } from '@remult/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { Location, GetDistanceBetween } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';

@Component({
  selector: 'app-select-helper',
  templateUrl: './select-helper.component.html',
  styleUrls: ['./select-helper.component.scss']
})
@DialogConfig({
  minWidth: '330px',

  maxWidth: '90vw',
  panelClass: 'select-helper-dialog'
})
export class SelectHelperComponent implements OnInit {

  searchString: string = '';
  lastFilter: string = undefined;
  public args: {
    hideRecent?: boolean,
    location?: Location,
    onSelect: (selectedValue: HelpersBase) => void,
    filter?: (helper: HelpersAndStats) => FilterBase

  };
  filteredHelpers: helperInList[] = [];
  constructor(
    private dialogRef: MatDialogRef<any>,

    private context: Context,
    private busy: BusyService,
    public settings: ApplicationSettings

  ) {

  }
  clearHelper() {
    this.select(undefined);
  }
  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async getHelpersByLocation(location: Location, context?: Context) {
    let helpers = new Map<string, helperInList>();
    await (await context.for(Helpers).find()).forEach(h => {
      helpers.set(h.id.value, {
        helperId: h.id.value,
        name: h.name.value,
        phone: h.phone.displayValue,
        distance: 99999999
      });
      if (h.getGeocodeInformation().ok()) {
        helpers.get(h.id.value).distance = GetDistanceBetween(h.getGeocodeInformation().location(), location);
      }

    });
    return [...helpers.values()].sort((a, b) => a.distance - b.distance);;




  }
  close() {
    this.dialogRef.close();
  }
  async byLocation(){
      this.filteredHelpers = await SelectHelperComponent.getHelpersByLocation(this.args.location);
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
      this.filteredHelpers = mapHelpers(Helpers.recentHelpers);
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
      this.filteredHelpers = mapHelpers(await this.context.for(HelpersAndStats).find(this.findOptions));
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
  select(h: helperInList) {
    this.args.onSelect(h.helper);
    if (h && !h.helper.isNew())
      Helpers.addToRecent(h.helper);
    this.dialogRef.close();
  }
}

interface helperInList {
  helper?: HelpersBase,
  helperId: string,
  name: string,
  phone: string,
  distance?: number,
  asignedFamilies?: number,
  fixedFamilies?: number
}
function mapHelpers(helpers: HelpersBase[]): helperInList[] {
  return helpers.map(h => ({
    helper: h,
    helperId: h.id.value,
    name: h.name.value,
    phone: h.phone.displayValue

  } as helperInList));
}