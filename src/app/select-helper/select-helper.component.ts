import { Component, OnInit } from '@angular/core';

import { MatDialogRef } from '@angular/material/dialog';
import { HelperId, Helpers, HelpersBase } from '../helpers/helpers';
import { Context, filterOf, FindOptions, ServerFunction, SqlDatabase } from '@remult/core';
import { Filter, AndFilter } from '@remult/core';

import { BusyService, DialogConfig } from '@remult/angular';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { Location, GetDistanceBetween, GeocodeInformation } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';
import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';
import { SqlBuilder, relativeDateName, SqlFor } from '../model-shared/types';
import { getLang } from '../sites/sites';
import { DeliveryStatus } from '../families/DeliveryStatus';

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
    includeFrozen?: boolean,
    searchClosestDefaultFamily?: boolean,
    onSelect: (selectedValue: HelpersBase) => void,
    filter?: (helper: filterOf<HelpersAndStats>) => Filter

  };
  filteredHelpers: helperInList[] = [];
  constructor(
    private dialogRef: MatDialogRef<any>,

    public context: Context,
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
    for await (const h of context.for(Helpers).iterate({ where: h => HelpersBase.active(h) })) {
      helpers.set(h.id, {
        helperId: h.id,
        name: h.name,
        phone: h.phone.displayValue,
        distance: 99999999
      });
      if (h.preferredDistributionAreaAddressHelper.ok()) {
        let theH = helpers.get(h.id);
        check(theH, h.preferredDistributionAreaAddressHelper.location(), getLang(context).preferredDistributionArea + ": " + h.preferredDistributionAreaAddress);
      }
      if (h.preferredFinishAddressHelper.ok()) {
        let theH = helpers.get(h.id);
        check(theH, h.preferredFinishAddressHelper.location(), getLang(context).preferredDistributionArea + ": " + h.preferredFinishAddress);
      }
    }

    let sql = new SqlBuilder();
    if (!selectDefaultVolunteer) {

      /* ----    calculate active deliveries and distances    ----*/
      let afd =SqlFor(context.for(ActiveFamilyDeliveries));
      
      


      for (const d of (await db.execute(sql.query({
        from: afd,
        where: () => [afd.courier.isDifferentFrom(HelperId.empty(context)).and(DeliveryStatus.isAResultStatus(afd.deliverStatus))],
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
          if (!getSettings(context).isSytemForMlt())
            check(h, { lat: d.lat, lng: d.lng }, getLang(context).delivery + ": " + d.address);
        }
      }

      /*  ---------- calculate completed deliveries and "busy" status -------------*/
      let sql1 = new SqlBuilder();
      
      let fd =SqlFor(context.for(FamilyDeliveries)) ;
      
      let limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - getSettings(context).BusyHelperAllowedFreq_denom);

      for (const d of (await db.execute(sql1.query({
        from: fd,
        where: () => [
          fd.courier.isDifferentFrom(HelperId.empty(context))
            .and(DeliveryStatus.isAResultStatus(fd.deliverStatus))
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
          h.isBusyVolunteer = (h.totalRecentDeliveries > getSettings(context).BusyHelperAllowedFreq_nom) ? "busyVolunteer" : "";
        }
      }
    } else {
      
      let afd = SqlFor(context.for(Families));
      for (const d of (await db.execute(sql.query({
        from: afd,
        where: () => [afd.fixedCourier.isDifferentFrom( HelperId.empty(context)).and(afd.status.isEqualTo(FamilyStatus.Active))],
        select: () => [
          sql.columnWithAlias(afd.fixedCourier, "courier"),
          sql.columnWithAlias(afd.addressLongitude, "lng"),
          sql.columnWithAlias(afd.addressLatitude, "lat"),
          sql.columnWithAlias(afd.address, 'address')]
      }))).rows) {
        let h = helpers.get(d.courier);
        if (h) {
          if (!h.fixedFamilies)
            h.fixedFamilies = 1;
          else
            h.fixedFamilies++;

          check(h, { lat: d.lat, lng: d.lng }, getLang(context).family + ": " + d.address);
        }
      }
    }
    if (familyId) {
      for (const fd of await context.for(FamilyDeliveries).find({
        where: fd => fd.family.isEqualTo(familyId).and(DeliveryStatus.isProblem(fd.deliverStatus))
      })) {
        if (fd.courier) {
          let h = helpers.get(fd.courier.evilGetId());
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
      let r: Filter = h.name.contains(this.searchString);
      if (!this.args.includeFrozen) {
        r = new AndFilter(HelpersBase.active(h), r);
      }
      if (this.args.filter) {
        return new AndFilter(this.args.filter(h), r);
      }

      return r;
    };
    if (this.args.searchByDistance)
      this.byLocation();
    else
      if (Helpers.recentHelpers.length == 0 || this.args.hideRecent)
        this.getHelpers();
      else {
        let recentHelpers = Helpers.recentHelpers;
        if (!this.args.includeFrozen) {
          recentHelpers = recentHelpers.filter(h =>
            !h.archive && !h.isFrozen
          );
        }
        this.filteredHelpers = mapHelpers(recentHelpers, x => undefined);
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
      this.filteredHelpers = mapHelpers(await this.context.for(HelpersAndStats).find(this.findOptions), x => x.deliveriesInProgress);
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
    return ApplicationSettings.get(this.context).showCompanies;
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
    helperId: h.id,
    name: h.name,
    phone: h.phone.displayValue,
    assignedDeliveries: getFamilies(h)

  } as helperInList));
}