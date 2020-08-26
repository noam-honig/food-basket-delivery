import { Component, OnInit } from '@angular/core';

import { MatDialogRef } from '@angular/material/dialog';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { Context, FindOptions, ServerFunction, DialogConfig, SqlDatabase } from '@remult/core';
import { FilterBase } from '@remult/core';

import { BusyService } from '@remult/core';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { Location, GetDistanceBetween, GeocodeInformation } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';
import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';
import { SqlBuilder, relativeDateName } from '../model-shared/types';
import { getLang } from '../sites/sites';

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
    searchByDistance?: boolean,
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
      if (!h)
        return;
      let dist = GetDistanceBetween(location, deliveryLocation);
      if (dist < h.distance) {
        h.distance = dist;
        h.location = location;
        h.distanceFrom = from;
      }
    }

    await (await context.for(Helpers).find({ where: h => h.active() })).forEach(async h => {
      helpers.set(h.id.value, {
        helperId: h.id.value,
        name: h.name.value,
        phone: h.phone.displayValue,
        distance: 99999999
      });
      if (h.preferredDistributionAreaAddress.ok()) {
        let theH = helpers.get(h.id.value);
        check(theH, h.preferredDistributionAreaAddress.location(), getLang(context).preferredDistributionArea + ": " + h.preferredDistributionAreaAddress.value);
      }
      if (h.preferredFinishAddress.ok()) {
        let theH = helpers.get(h.id.value);
        check(theH, h.preferredFinishAddress.location(), getLang(context).preferredDistributionArea + ": " + h.preferredFinishAddress.value);
      }
    });

    let sql = new SqlBuilder();
    if (!selectDefaultVolunteer) {

      /* ----    calculate active deliveries and distances    ----*/
      let afd = context.for(ActiveFamilyDeliveries).create();



      for (const d of (await db.execute(sql.query({
        from: afd,
        where: () => [afd.courier.isDifferentFrom('').and(afd.deliverStatus.isNotAResultStatus())],
        select: () => [
          sql.columnWithAlias("distinct " + sql.getItemSql(afd.family), 'fam'),
          sql.columnWithAlias(afd.courier, "courier"),
          sql.columnWithAlias(afd.addressLongitude, "lng"),
          sql.columnWithAlias(afd.addressLatitude, "lat"),
          sql.columnWithAlias(afd.address, 'address')]
      }))).rows) {
        let h = helpers.get(d.courier);
        if (h) {
          if (!h.assignedDeliveries)
            h.assignedDeliveries = 1;
          else
            h.assignedDeliveries++;
          check(h, { lat: d.lat, lng: d.lng }, getLang(context).delivery + ": " + d.address);
        }
      }

      /*  ---------- calculate completed deliveries and "busy" status -------------*/
      let sql1 = new SqlBuilder();
      let fd = context.for(FamilyDeliveries).create();
      let limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - getSettings(context).BusyHelperAllowedFreq_denom.value);

      for (const d of (await db.execute(sql1.query({
        from: fd,
        where: () => [
          fd.courier.isDifferentFrom('')
            .and(fd.deliverStatus.isAResultStatus())
            .and(fd.deliveryStatusDate.isGreaterOrEqualTo(limitDate))
        ],
        select: () => [
          sql1.columnWithAlias(fd.courier, "courier"),
          sql1.columnWithAlias(sql.max(fd.deliveryStatusDate), "delivery_date"),
          sql1.columnWithAlias("count(distinct " + sql1.getItemSql(fd.family) + ")", "count")
        ],
        groupBy: () => [fd.courier]
      }))).rows) {
        let h = helpers.get(d.courier);
        if (h) {
          h.lastCompletedDeliveryString = relativeDateName(context, { d: d.delivery_date });
          h.totalRecentDeliveries = d.count;
          h.isBusyVolunteer = (h.totalRecentDeliveries > getSettings(context).BusyHelperAllowedFreq_nom.value) ? "busyVolunteer" : "";
        }
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
        {
          if (!h.fixedFamilies)
            h.fixedFamilies = 1;
          else
            h.fixedFamilies++;

          check(h, { lat: d.lat, lng: d.lng }, getLang(context).family + ": " + d.address);
        }
      }
    }
    if (familyId) {
      for (const fd of await context.for(FamilyDeliveries).find({ where: fd => fd.family.isEqualTo(familyId).and(fd.deliverStatus.isProblem()) })) {
        if (fd.courier.value) {
          let h = helpers.get(fd.courier.value);
          if (h) {
            h.hadProblem = true;
          }
        }
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
    this.filteredHelpers = await SelectHelperComponent.getHelpersByLocation(this.args.location, this.args.searchClosestDefaultFamily, this.args.familyId);
  }

  findOptions = {
    orderBy: h => [h.name], limit: 25
  } as FindOptions<HelpersAndStats>;
  async ngOnInit() {


    this.findOptions.where = h => {
      let r = h.name.isContains(this.searchString).and(h.active());
      if (this.args.filter) {
        return r.and(this.args.filter(h));
      }

      return r;
    };
    if (this.args.searchByDistance)
      this.byLocation();
    else
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
  totalRecentDeliveries?: number,
  isBusyVolunteer?: string,
  lastCompletedDeliveryString?: string,
  fixedFamilies?: number,
  distanceFrom?: string,
  hadProblem?: boolean
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