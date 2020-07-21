import { Component, OnInit } from '@angular/core';

import { MatDialogRef } from '@angular/material/dialog';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { Context, FindOptions, ServerFunction, DialogConfig, SqlDatabase } from '@remult/core';
import { FilterBase } from '@remult/core';

import { BusyService } from '@remult/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { Location, GetDistanceBetween, GeocodeInformation } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';
import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { getLang } from '../translate';
import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';
import { SqlBuilder } from '../model-shared/types';

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
    familyId?: string,
    hideRecent?: boolean,
    location?: Location,
    searchClosestDefaultFamily?: boolean,
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
  static async getHelpersByLocation(deliveryLocation: Location, selectDefaultVolunteer: boolean, familyId: string, context?: Context, db?: SqlDatabase) {
    let helpers = new Map<string, helperInList>();


    let check = (h: helperInList, location: Location, from: string) => {
      let dist = GetDistanceBetween(location, deliveryLocation);
      if (dist < h.distance) {
        h.distance = dist;
        h.location = location;
        h.distanceFrom = from;
      }
    }

    await (await context.for(Helpers).find()).forEach(async h => {
      helpers.set(h.id.value, {
        helperId: h.id.value,
        name: h.name.value,
        phone: h.phone.displayValue,
        distance: 99999999
      });
      if (h.getGeocodeInformation().ok()) {
        let theH = helpers.get(h.id.value);
        check(theH, h.getGeocodeInformation().location(), getLang(context).preferredDistributionArea + ": " + h.preferredDistributionAreaAddress.value);
      }
      if (h.getGeocodeInformation2().ok()) {
        let theH = helpers.get(h.id.value);
        check(theH, h.getGeocodeInformation2().location(), getLang(context).preferredDistributionArea + ": " + h.preferredDistributionAreaAddress2.value);
      }
    });
    let sql = new SqlBuilder();
    if (!selectDefaultVolunteer) {
      let afd = context.for(ActiveFamilyDeliveries).create();



      for (const d of (await db.execute(sql.query({
        from: afd,
        where: () => [afd.courier.isDifferentFrom('').and(afd.deliverStatus.isNotAResultStatus())],
        select: () => [
          sql.columnWithAlias(afd.courier, "courier"),
          sql.columnWithAlias(afd.addressLongitude, "lng"),
          sql.columnWithAlias(afd.addressLatitude, "lat"),
          sql.columnWithAlias(afd.address, 'address')]
      }))).rows) {
        let h = helpers.get(d.courier);
        if (!h.assignedDeliveries)
          h.assignedDeliveries = 1;
        else
          h.assignedDeliveries++;
        check(h, { lat: d.lat, lng: d.lng }, getLang(context).delivery + ": " + d.address);
      }
    } else {
      let afd = context.for(Families).create();
      for (const d of (await db.execute(sql.query({
        from: afd,
        where: () => [afd.fixedCourier.isDifferentFrom('').and(afd.status.isEqualTo(FamilyStatus.Active))],
        select: () => [
          sql.columnWithAlias(afd.fixedCourier, "courier"),
          sql.columnWithAlias(afd.addressLongitude, "lng"),
          sql.columnWithAlias(afd.addressLatitude, "lat"),
          sql.columnWithAlias(afd.address, 'address')]
      }))).rows) {
        let h = helpers.get(d.courier);
        if (!h.fixedFamilies)
          h.fixedFamilies = 1;
        else
          h.fixedFamilies++;

        check(h, { lat: d.lat, lng: d.lng }, getLang(context).family + ": " + d.address);
      }
    }

    return [...helpers.values()].sort((a, b) => {
      let r = a.distance - b.distance;
      if (r != 0)
        return r;
      return a.name.localeCompare(b.name);
    });




  }
  close() {
    this.dialogRef.close();
  }
  async byLocation() {
    this.filteredHelpers = await SelectHelperComponent.getHelpersByLocation(this.args.location, this.args.searchClosestDefaultFamily,this.args.familyId);
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
      this.filteredHelpers = mapHelpers(Helpers.recentHelpers, x => undefined);
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
      this.filteredHelpers = mapHelpers(await this.context.for(HelpersAndStats).find(this.findOptions), x => x.deliveriesInProgress.value);
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
  async select(h: helperInList) {
    let helper: HelpersBase;
    if (h) {
      if (!h.helper)
        h.helper = await this.context.for(Helpers).findId(h.helperId);
      helper = h.helper;
    }
    this.args.onSelect(helper);
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
  location?: Location,
  assignedDeliveries?: number,
  fixedFamilies?: number,
  distanceFrom?: string,
  hadProblem?:boolean
}
function mapHelpers<hType extends HelpersBase>(helpers: hType[], getFamilies: (h: hType) => number): helperInList[] {
  return helpers.map(h => ({
    helper: h,
    helperId: h.id.value,
    name: h.name.value,
    phone: h.phone.displayValue,
    assignedDeliveries: getFamilies(h)

  } as helperInList));
}