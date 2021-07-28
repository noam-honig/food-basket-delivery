import { Component, OnInit } from '@angular/core';
import { Roles } from '../auth/roles';
import { BusyService, InputField, openDialog } from '@remult/angular';
import { BackendMethod, Context, SqlDatabase } from 'remult';
import { Helpers } from '../helpers/helpers';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Location, GetDistanceBetween } from '../shared/googleApiHelpers';
import { relativeDateName } from '../model-shared/types';
import { getValueFromResult, SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { SelectHelperComponent } from '../select-helper/select-helper.component';
import { BasketType } from '../families/BasketType';
import { getSettings, ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-shipment-assign-screen',
  templateUrl: './shipment-assign-screen.component.html',
  styleUrls: ['./shipment-assign-screen.component.scss']
})
export class ShipmentAssignScreenComponent implements OnInit {
  filterBasket = new InputField<string>({ caption: 'סינון' });
  sortDir = 1;
  sortByVolunteers() {
    this.sortDir = -this.sortDir;
    this.sortList();
  }
  matchesFilter(f: familyInfo) {
    if (!this.filterBasket.value || this.filterBasket.value.length == 0)
      return true;
    return f.deliveries.find(b => b.basketTypeName.includes(this.filterBasket.value));

  }

  private sortList() {
    this.families.sort((a, b) => {
      let res = 0;
      let itemsDiff = b.totalItems - a.totalItems;
      let alen = a.relevantHelpers.length;
      let blen = b.relevantHelpers.length;

      if (alen == 0 && blen == 0)
        return itemsDiff;

      if (alen == 0) return 1;
      if (blen == 0) return -1;

      res = (alen - blen) * this.sortDir;
      if (res == 0)
        res = itemsDiff;

      return res;
    });
  }

  async showAssignment(rh: relevantHelper) {
    let h = await this.context.for(Helpers).findId(rh.helper.id);
    openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
  }
  async assignHelper(h: helperInfo, f: familyInfo) {
    await this.busy.doWhileShowingBusy(async () => {
      for (const fd of await this.context.for(ActiveFamilyDeliveries).find({
        where: fd => FamilyDeliveries.readyFilter().and(fd.id.isIn(f.deliveries.map(x => x.id)))
      })) {
        fd.courier = await this.context.for(Helpers).findId(h.id);
        await fd.save();
      }
    });
    f.assignedHelper = h;
    h.families.push(f);
    this.openFamilies.set(f, false);

  }
  async cancelAssignHelper(f: familyInfo) {
    let helper = await this.context.for(Helpers).findId(f.assignedHelper.id);
    await this.busy.doWhileShowingBusy(async () => {
      for (const fd of await this.context.for(ActiveFamilyDeliveries).find({
        where: fd => fd.courier.isEqualTo(helper).and(fd.id.isIn(f.deliveries.map(x => x.id)))
      })) {
        fd.courier = null;
        await fd.save();
      }
    });
    f.assignedHelper.families.splice(f.assignedHelper.families.indexOf(f), 1);
    f.assignedHelper = undefined;

  }
  async searchHelper(f: familyInfo) {
    await openDialog(SelectHelperComponent, x => x.args = {
      location: f.location,
      familyId: f.id,
      searchByDistance: true,
      onSelect: async selectedHelper => {
        let h = this.data.helpers[selectedHelper.id];
        if (!h) {
          h = ShipmentAssignScreenComponent.helperInfoFromHelper(await this.context.for(Helpers).findId(selectedHelper.id));;
          this.data[h.id] = h;
        }
        this.assignHelper(h, f);
      }
    });

  }

  openFamilies = new Map<familyInfo, boolean>();
  shouldShowHelper(forFamily: familyInfo) {
    return !!this.openFamilies.get(forFamily);

  }
  togglerShowHelper(forFamily: familyInfo) {
    this.openFamilies.set(forFamily, !this.openFamilies.get(forFamily));
  }
  constructor(private context: Context, private busy: BusyService, private settings: ApplicationSettings) { }
  data: data;
  families: familyInfo[] = [];
  async ngOnInit() {
    await this.getFamiliesAndSortThem();




  }
  private async getFamiliesAndSortThem() {
    this.families = [];
    this.data = await ShipmentAssignScreenComponent.getShipmentAssignInfo();

    for (const famKey in this.data.unAssignedFamilies) {
      if (Object.prototype.hasOwnProperty.call(this.data.unAssignedFamilies, famKey)) {
        const family = this.data.unAssignedFamilies[famKey];
        this.families.push(family);
        for (const key in this.data.helpers) {
          if (Object.prototype.hasOwnProperty.call(this.data.helpers, key)) {
            const helper = this.data.helpers[key];
            if (helper.families.length < 4 && !helper.problemFamilies[family.id]) {
              let d = 99999999;
              let referencePoint = '';
              let checkDistance = (loc: Location, refPoint: string) => {
                if (loc) {
                  let dist = GetDistanceBetween(family.location, loc);
                  if (dist < d) {
                    d = dist;
                    referencePoint = refPoint;
                  }
                }
              };
              checkDistance(helper.location1, 'העדפת מתנדב: ' + helper.address1);
              checkDistance(helper.location2, 'העדפת מתנדב: ' + helper.address2);
              if (!this.settings.isSytemForMlt())
                for (const exF of helper.families) {
                  checkDistance(exF.location, 'משלוח: ' + exF.address);
                }
              if (d < 5) {
                family.relevantHelpers.push({
                  helper: helper,
                  distance: d,
                  referencePoint: referencePoint
                });
                family.relevantHelpers.sort((a, b) => {
                  let res = a.helper.families.length - b.helper.families.length;
                  if (res == 0) res = a.distance - b.distance
                  return res;
                });
              }
            }
          }
        }
      }
    }
    this.sortList();
  }

  @BackendMethod({ allowed: Roles.admin })
  static async getShipmentAssignInfo(context?: Context, db?: SqlDatabase) {
    let result: data = {
      helpers: {},
      unAssignedFamilies: {}
    };

    let i = 0;
    //collect helpers
    for (let h of await context.for(Helpers).find({ where: h => Helpers.active(h).and(h.preferredDistributionAreaAddress.isDifferentFrom('')), limit: 1000 })) {
      result.helpers[h.id] = ShipmentAssignScreenComponent.helperInfoFromHelper(h);
      i++;
    }

    //remove busy helpers
    {
      let fd = SqlFor(context.for(FamilyDeliveries));
      let sql = new SqlBuilder(context);
      let busyLimitdate = new Date();
      busyLimitdate.setDate(busyLimitdate.getDate() - getSettings(context).BusyHelperAllowedFreq_denom);


      for (let busy of (await db.execute(await sql.query({
        select: () => [fd.courier],
        from: fd,
        where: () => [DeliveryStatus.isAResultStatus(fd.deliverStatus).and(fd.deliveryStatusDate.isGreaterThan(busyLimitdate))],
        groupBy: () => [fd.courier],
        having: () => [sql.build('count(distinct ', fd.family, ' )>', getSettings(context).BusyHelperAllowedFreq_nom)]
      }))).rows) {
        result.helpers[busy.courier] = undefined;
      }
    }

    {
      let sql = new SqlBuilder(context);

      let fd = SqlFor(context.for(FamilyDeliveries));
      for (let r of (await db.execute(await sql.query({
        select: () => [sql.build("distinct ", fd.courier), fd.family],
        from: fd,
        where: () => [DeliveryStatus.isProblem(fd.deliverStatus).and(fd.courier.isDifferentFrom(null))]

      }))).rows) {
        let x = result.helpers[await getValueFromResult(r, fd.courier)];
        if (x) {
          x.problemFamilies[await getValueFromResult(r, fd.family)] = true;
        }
      }
    }


    //highlight new Helpers
    {
      let sql = new SqlBuilder(context);
      let h = SqlFor(context.for(Helpers));
      let fd = SqlFor(context.for(FamilyDeliveries));
      for (let helper of (await db.execute(await sql.query({
        select: () => [h.id],
        from: h,
        where: () => [sql.build(h.id, ' not in (', sql.query({
          select: () => [fd.courier],
          from: fd,
          where: () => [DeliveryStatus.isSuccess(fd.deliverStatus)]
        }), ')')]

      }))).rows) {
        let x = result.helpers[helper.id];
        if (x) {
          x.newHelper = true;
        }
      }
    }
    {
      let sql = new SqlBuilder(context);
      let fd =await  SqlFor(context.for(ActiveFamilyDeliveries));

      let sqlResult = await db.execute(
        await sql.query({
          select: () => [
            fd.family,
            fd.name,
            fd.address,
            fd.createDate,
            fd.addressLatitude,
            fd.addressLongitude,
            fd.basketType,
            fd.quantity,
            fd.id,
            fd.courier
          ],
          from: fd,
          where: () => [fd.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]
        }));

      //collect ready deliveries
      for (let r of sqlResult.rows) {


        let f: familyInfo = {
          id: await getValueFromResult(r, fd.family),
          name: await getValueFromResult(r, fd.name),
          address: await getValueFromResult(r, fd.address),
          createDateString: relativeDateName(context, { d: await getValueFromResult(r, fd.createDate) }),
          location: {
            lat: +await getValueFromResult(r, fd.addressLatitude),
            lng: +await getValueFromResult(r, fd.addressLongitude)
          },
          deliveries: [{
            basketTypeId: await getValueFromResult(r, fd.basketType),
            quantity: await getValueFromResult(r, fd.quantity),
            basketTypeName: (await context.for(BasketType).findId(await getValueFromResult(r, fd.basketType), { createIfNotFound: true })).name,
            id: await getValueFromResult(r, fd.id)

          }],
          totalItems: await getValueFromResult(r, fd.quantity),
          relevantHelpers: []
        }

        if (await getValueFromResult(r, fd.courier)) {
          let h = result.helpers[await getValueFromResult(r, fd.courier)];
          if (h) {
            let fh = h.families.find(x => x.id == f.id);
            if (fh) {
              fh.deliveries.push(...f.deliveries);
              fh.totalItems += f.totalItems;
            }
            else
              h.families.push(f);
          }
        }
        else {
          let ef = result.unAssignedFamilies[f.id];
          if (ef) {
            ef.deliveries.push(...f.deliveries);
            ef.totalItems += f.totalItems;
          }
          else
            result.unAssignedFamilies[f.id] = f;
        }
      }
    }

    return result;
  }


  private static helperInfoFromHelper(h: Helpers): helperInfo {
    return {
      id: h.id,
      name: h.name,
      location1: h.preferredDistributionAreaAddressHelper.ok() ? h.preferredDistributionAreaAddressHelper.location() : undefined,
      address1: h.preferredDistributionAreaAddress,
      address2: h.preferredFinishAddress,
      location2: h.preferredFinishAddressHelper.ok() ? h.preferredFinishAddressHelper.location() : undefined,
      families: [],
      problemFamilies: {},
      relevantFamilies: []
    };
  }
}
export interface familyInfo {
  id: string,
  name: string,
  address: string,
  location: Location,
  createDateString: string,
  deliveries: deliveryInfo[];
  totalItems: number;
  relevantHelpers: relevantHelper[];
  assignedHelper?: helperInfo;
}
export interface helperInfo {
  id: string,
  name: string,
  location1: Location,
  address1: string,
  location2: Location,
  address2: string,
  families: familyInfo[],
  problemFamilies: { [id: string]: boolean },
  newHelper?: boolean,
  relevantFamilies: relevantFamily[];

}
export interface relevantHelper {
  helper: helperInfo;
  distance: number;
  referencePoint: string;
}
export interface relevantFamily {
  family: familyInfo;
  distance: number;
  referencePoint: string;
}

export interface deliveryInfo {
  id: string,
  basketTypeId: string,
  basketTypeName: string,
  quantity: number

}

export interface data {
  helpers: { [id: string]: helperInfo },
  unAssignedFamilies: { [id: string]: familyInfo }
}
