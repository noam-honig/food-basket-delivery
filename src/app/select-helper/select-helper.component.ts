import { Component, OnInit } from '@angular/core';

import { MatDialogRef } from '@angular/material/dialog';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { Remult, FindOptions, BackendMethod, SqlDatabase, EntityFilter } from 'remult';
import { Filter } from 'remult';

import { BusyService, DialogConfig } from '@remult/angular';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { Location, GetDistanceBetween, GeocodeInformation } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';
import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';
import { relativeDateName } from '../model-shared/types';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { getLang } from '../sites/sites';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DialogService } from '../select-popup/dialog';

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
    filter?: EntityFilter<HelpersAndStats>

  };
  filteredHelpers: helperInList[] = [];
  constructor(
    private dialogRef: MatDialogRef<any>,
    private dialog: DialogService,
    public remult: Remult,
    private busy: BusyService,
    public settings: ApplicationSettings

  ) {

  }
  async addHelper() {
    let h = this.remult.repo(Helpers).create({ name: this.searchString });;
    await h.displayEditDialog(this.dialog, this.busy);
    if (!h.isNew()) {
      this.select({
        helperId: h.id,
        name: h.name,
        phone: h.phone?.displayValue
      });
    }
  }
  clearHelper() {
    this.select(null);
  }
  isMlt() {
    return getSettings(this.remult).isSytemForMlt();
  }
  @BackendMethod({ allowed: Roles.distCenterAdmin })
  static async getHelpersByLocation(deliveryLocation: Location, selectDefaultVolunteer: boolean, familyId: string, remult?: Remult, db?: SqlDatabase) {
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
    for await (const h of remult.repo(Helpers).iterate({ where: HelpersBase.active as EntityFilter<Helpers> })) {
      helpers.set(h.id, {
        helperId: h.id,
        name: h.name,
        phone: h.phone?.displayValue,
        distance: 99999999
      });
      if (h.preferredDistributionAreaAddressHelper.ok()) {
        let theH = helpers.get(h.id);
        check(theH, h.preferredDistributionAreaAddressHelper.location(), getLang(remult).preferredDistributionArea + ": " + h.preferredDistributionAreaAddress);
      }
      if (h.preferredFinishAddressHelper.ok()) {
        let theH = helpers.get(h.id);
        check(theH, h.preferredFinishAddressHelper.location(), getLang(remult).preferredDistributionArea + ": " + h.preferredFinishAddress);
      }
    }

    let sql = new SqlBuilder(remult);
    if (!selectDefaultVolunteer) {

      /* ----    calculate active deliveries and distances    ----*/
      let afd = SqlFor(remult.repo(ActiveFamilyDeliveries));




      for (const d of (await db.execute(await sql.query({
        from: afd,
        where: () => [afd.where({ courier: { "!=": null }, deliverStatus: DeliveryStatus.isNotAResultStatus() })],
        select: async () => [
          sql.columnWithAlias("distinct " + await sql.getItemSql(afd.family), 'fam'),
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
          if (!getSettings(remult).isSytemForMlt())
            check(h, { lat: d.lat, lng: d.lng }, getLang(remult).delivery + ": " + d.address);
        }
      }

      /*  ---------- calculate completed deliveries and "busy" status -------------*/
      let sql1 = new SqlBuilder(remult);

      let fd = SqlFor(remult.repo(FamilyDeliveries));

      let limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - getSettings(remult).BusyHelperAllowedFreq_denom);

      for (const d of (await db.execute(await sql1.query({
        from: fd,
        where: () => [
          fd.where({
            courier: { "!=": null },
            deliverStatus: DeliveryStatus.isAResultStatus(),
            deliveryStatusDate: { ">=": limitDate }
          })
        ],
        select: async () => [
          sql1.columnWithAlias(fd.courier, "courier"),
          sql1.columnWithAlias(sql.max(fd.deliveryStatusDate), "delivery_date"),
          sql1.columnWithAlias("count(distinct " + await sql1.getItemSql(fd.family) + ")", "count")
        ],
        groupBy: () => [fd.courier]
      }))).rows) {
        let h = helpers.get(d.courier);
        if (h) {
          h.lastCompletedDeliveryString = relativeDateName(remult, { d: d.delivery_date });
          h.totalRecentDeliveries = d.count;
          h.isBusyVolunteer = (h.totalRecentDeliveries > getSettings(remult).BusyHelperAllowedFreq_nom) ? "busyVolunteer" : "";
        }
      }
    } else {

      let afd = SqlFor(remult.repo(Families));
      for (const d of (await db.execute(await sql.query({
        from: afd,
        where: () => [afd.where({ fixedCourier: { "!=": null }, status: FamilyStatus.Active })],
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

          check(h, { lat: d.lat, lng: d.lng }, getLang(remult).family + ": " + d.address);
        }
      }
    }
    if (familyId) {
      for (const fd of await remult.repo(FamilyDeliveries).find({
        where: { family: familyId, deliverStatus: DeliveryStatus.isProblem() }
      })) {
        if (fd.courier) {
          let h = helpers.get(fd.courier?.id);
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

  limit: 25;

  async ngOnInit() {



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
    this.limit *= 2;
    this.getHelpers();
  }
  async getHelpers() {

    await this.busy.donotWait(async () => {
      this.filteredHelpers = mapHelpers(await this.remult.repo(HelpersAndStats).find({
        orderBy: { name: "asc" },
        where :  {
          name: { $contains: this.searchString },
          $and: [
            !this.args.includeFrozen ? (HelpersBase.active as EntityFilter<HelpersAndStats>) : undefined,
            this.args.filter
          ]
        }

      }), x => x.deliveriesInProgress);
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
    return ApplicationSettings.get(this.remult).showCompanies;
  }
  selectFirst() {
    if (this.filteredHelpers.length > 0)
      this.select(this.filteredHelpers[0]);
  }
  async select(h: helperInList) {
    let helper: HelpersBase;
    if (h) {
      if (!h.helper)
        h.helper = await this.remult.repo(Helpers).findId(h.helperId);
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
    phone: h.phone?.displayValue,
    assignedDeliveries: getFamilies(h)

  } as helperInList));
}