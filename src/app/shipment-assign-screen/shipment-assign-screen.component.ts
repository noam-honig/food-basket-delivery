import { Component, OnInit } from '@angular/core';
import { Roles } from '../auth/roles';
import { ServerFunction, Context } from '@remult/core';
import { Helpers } from '../helpers/helpers';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Location, GetDistanceBetween } from '../shared/googleApiHelpers';

@Component({
  selector: 'app-shipment-assign-screen',
  templateUrl: './shipment-assign-screen.component.html',
  styleUrls: ['./shipment-assign-screen.component.scss']
})
export class ShipmentAssignScreenComponent implements OnInit {


  openFamilies = new Map<familyInfo, boolean>();
  shouldShowHelper(forFamily: familyInfo) {
    return !!this.openFamilies.get(forFamily);

  }
  togglerShowHelper(forFamily: familyInfo) {
    this.openFamilies.set(forFamily, !this.openFamilies.get(forFamily));
  }
  constructor() { }
  data: data;
  families: familyInfo[] = [];
  async ngOnInit() {
    this.families = [];
    this.data = await ShipmentAssignScreenComponent.getShipmentAssignInfo();
    console.time("it");
    for (const famKey in this.data.families) {
      if (Object.prototype.hasOwnProperty.call(this.data.families, famKey)) {
        const family = this.data.families[famKey];
        this.families.push(family);
        for (const key in this.data.helpers) {
          if (Object.prototype.hasOwnProperty.call(this.data.helpers, key)) {
            const helper = this.data.helpers[key];
            if (helper.families.length < 4) {
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
              }
              checkDistance(helper.location1, 'העדפת מתנדב: ' + helper.address1);
              checkDistance(helper.location2, 'העדפת מתנדב: ' + helper.address2);
              for (const exF of helper.families) {
                checkDistance(exF.location, 'משלוח: ' + exF.address);
              }
              if (d < 5) {
                family.relevantHelpers.push({
                  helper: helper,
                  distance: d,
                  referencePoint: referencePoint
                });
                family.relevantHelpers.sort((a, b) => a.distance - b.distance);
              }
            }
          }
        }
      }
    }
    this.families.sort((a, b) => b.relevantHelpers.length - a.relevantHelpers.length);
    console.timeEnd('it');



  }
  @ServerFunction({ allowed: Roles.admin })
  static async getShipmentAssignInfo(context?: Context) {
    let result: data = {
      helpers: {},
      families: {}
    };
    for await (let h of context.for(Helpers).iterate({ where: h => h.archive.isEqualTo(false) })) {
      result.helpers[h.id.value] = {
        id: h.id.value,
        name: h.name.value,
        location1: h.getGeocodeInformation().location(),
        address1: h.preferredDistributionAreaAddress.value,
        address2: h.preferredDistributionAreaAddress2.value,
        location2: h.getGeocodeInformation().location(),
        families: []
      };
    }
    for await (let d of context.for(ActiveFamilyDeliveries).iterate({ where: h => h.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery) })) {

      let f: familyInfo = {
        id: d.family.value,
        name: d.name.value,
        address: d.address.value,
        location: d.getDrivingLocation(),
        deliveries: [{
          basketTypeId: d.basketType.value,
          quantity: d.quantity.value,
          basketTypeName: await d.basketType.getTheValue()

        }],
        relevantHelpers: []
      }
      if (d.courier.value) {
        let h = result.helpers[d.courier.value];
        if (h) {
          let fh = h.families.find(x => x.id == f.id);
          if (fh) {
            fh.deliveries.push(...f.deliveries);
          }
          else
            h.families.push(f);
        }
      }
      else {
        let ef = result.families[f.id];
        if (ef) {
          ef.deliveries.push(...f.deliveries);
        }
        else
          result.families[f.id] = f;
      }
    }

    return result;
  }

}
interface familyInfo {
  id: string,
  name: string,
  address: string,
  location: Location,
  deliveries: deliveryInfo[];
  relevantHelpers: relevantHelper[];
}
interface helperInfo {
  id: string,
  name: string,
  location1: Location,
  address1: string,
  location2: Location,
  address2: string,
  families: familyInfo[],

}
interface relevantHelper {
  helper: helperInfo;
  distance: number;
  referencePoint: string;
}

interface deliveryInfo {
  basketTypeId: string,
  basketTypeName: string,
  quantity: number
}

interface data {
  helpers: { [id: string]: helperInfo },
  families: { [id: string]: familyInfo }
}