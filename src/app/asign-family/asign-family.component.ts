import { Component, OnInit } from '@angular/core';
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';
import { ColumnHashSet, UrlBuilder } from 'radweb';
import { Families } from '../families/families';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { YesNo } from "../families/YesNo";
import { Language } from "../families/Language";
import { Helpers } from '../helpers/helpers';
import { DialogService } from '../select-popup/dialog';
import { UserFamiliesList } from '../my-families/user-families';

import { environment } from '../../environments/environment';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { foreachSync } from '../shared/utils';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import * as fetch from 'node-fetch';
import { RunOnServer } from '../auth/server-action';
import { Context } from '../shared/context';
import { SelectService } from '../select-popup/select-service';
import { BasketType } from '../families/BasketType';
import { Routable } from '../shared/routing-helper';


@Component({
  selector: 'app-asign-family',
  templateUrl: './asign-family.component.html',
  styleUrls: ['./asign-family.component.scss']
})
@Routable({
  path: 'assign-families',
  canActivate: [HolidayDeliveryAdmin],
  caption: 'שיוך משפחות'
})
export class AsignFamilyComponent implements OnInit {
  static route: Route = {
    path: 'assign-families', component: AsignFamilyComponent, canActivate: [HolidayDeliveryAdmin], data: { name: 'שיוך משפחות' }
  };

  async searchPhone() {
    this.name = undefined;
    this.shortUrl = undefined;
    this.id = undefined;
    this.clearList();
    if (this.phone.length == 10) {


      let helper = await this.context.for(Helpers).findFirst(h => h.phone.isEqualTo(this.phone));
      if (helper) {
        this.name = helper.name.value;
        this.shortUrl = helper.shortUrlKey.value;
        this.id = helper.id.value;
        await this.refreshList();
      } else {
        
        await this.refreshList();
      }
    }
  }
  filterCity = '';
  selectCity() {
    this.refreshBaskets();
  }
  langChange() {
    this.refreshBaskets();
  }
  assignmentCanceled() {
    this.refreshBaskets();
  }
  smsSent() {
    this.dialog.Info("הודעת SMS נשלחה ל" + this.name);
    this.phone = '';
    this.name = '';
  }


  async refreshBaskets() {
    let r = (await AsignFamilyComponent.getBasketStatus({
      filterLanguage: this.filterLangulage,
      filterCity: this.filterCity
    }))
    this.baskets = r.baskets;
    this.cities = r.cities;
    this.specialFamilies = r.special;
  }
  baskets: BasketInfo[] = [];
  cities: CityInfo[] = [];
  specialFamilies = 0;
  async refreshList() {
    await this.refreshBaskets();
    await this.familyLists.initForHelper(this.id, this.name);

  }
  familyLists = new UserFamiliesList(this.context);
  filterLangulage = -1;
  langulages: Language[] = [
    new Language(-1, 'כל השפות'),
    Language.Hebrew,
    Language.Amharit,
    Language.Russian
  ];
  phone: string;
  name: string;
  shortUrl: string;
  id: string;
  clearHelper() {
    this.phone = undefined;
    this.name = undefined;
    this.shortUrl = undefined;
    this.id = undefined;
    this.numOfBaskets = 1;
    this.clearList();

  }
  clearList() {
    this.familyLists.clear();
  }
  findHelper() {
    this.selectService.selectHelper(h => {
      if (h) {
        this.phone = h.phone.value;
        this.name = h.name.value;
        this.shortUrl = h.shortUrlKey.value;
        this.id = h.id.value;
      }
      else {
        this.phone = '';
        this.name = '';
        this.shortUrl = '';
        this.id = '';
      }
      this.refreshList();
    });
  }



  constructor(private selectService: SelectService, private dialog: DialogService, private context: Context) {

  }

  async ngOnInit() {
    if (!environment.production) {
      this.phone = '0507330590';
      await this.searchPhone();
      //   this.selectService.updateFamiliy({ f: this.familyLists.allFamilies[0]});

    }
  }
  numOfBaskets: number = 1;
  add(what: number) {
    this.numOfBaskets += what;
    if (this.numOfBaskets < 1)
      this.numOfBaskets = 1;

  }
  async assignItem(basket: BasketInfo) {

    let x = await AsignFamilyComponent.AddBox({
      phone: this.phone,
      name: this.name,
      basketType: basket.id,
      helperId: this.id,
      language: this.filterLangulage,
      city: this.filterCity,
      numOfBaskets: this.numOfBaskets
    });
    if (x.addedBoxes) {
      this.id = x.helperId;
      this.familyLists.initForFamilies(this.id, this.name, x.families);
      this.baskets = x.basketInfo.baskets;
      this.cities = x.basketInfo.cities;
      this.specialFamilies = x.basketInfo.special;
    }
    else {
      this.refreshList();
      this.dialog.Info("לא נמצאה משפחה מתאימה");
    }
    this.id = x.helperId;


  }
  @RunOnServer({ allowed: c => c.isAdmin() })
  static async getBasketStatus(info: GetBasketStatusActionInfo, context?: Context) {
    let result = {
      baskets: [],
      cities: [],
      special: 0
    };
    let basketHash: any = {};
    let cityHash: any = {};

    let r = await context.for(Families).find({ where: f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(f.courier.isEqualTo('')) });
    r.forEach(cf => {
      if (info.filterLanguage == -1 || info.filterLanguage == cf.language.value) {
        if (!info.filterCity || info.filterCity == cf.city.value) {
          if (cf.special.listValue == YesNo.No) {
            let bi = basketHash[cf.basketType.value];
            if (!bi) {
              bi = {
                id: cf.basketType.value,
                unassignedFamilies: 0
              };
              basketHash[cf.basketType.value] = bi;
              result.baskets.push(bi);
            }
            bi.unassignedFamilies++;
          }
          else {
            result.special++;
          }
        }
        let ci: CityInfo = cityHash[cf.city.value];
        if (!ci) {
          ci = {
            name: cf.city.value,
            unassignedFamilies: 0
          };
          cityHash[cf.city.value] = ci;
          result.cities.push(ci);
        }
        ci.unassignedFamilies++;
      }
    });
    if (info.filterCity && !cityHash[info.filterCity]) {
      result.cities.push({ name: info.filterCity, unassignedFamilies: 0 });
    }
    await foreachSync(result.baskets, async (b) => {
      b.name = (await context.for(BasketType).lookupAsync(bt => bt.id.isEqualTo(b.id))).name.value;
    });
    result.baskets.sort((a, b) => b.unassignedFamilies - a.unassignedFamilies);
    return result;
  }

  @RunOnServer({ allowed: c => c.isAdmin() })
  static async AddBox(info: AddBoxInfo, context?: Context) {

    let result: AddBoxResponse = {
      helperId: info.helperId,
      addedBoxes: 0,
      shortUrl: undefined,
      families: [],
      basketInfo: undefined
    }

    if (!info.helperId) {
      let r = await context.for(Helpers).findFirst(h => h.phone.isEqualTo(info.phone));
      if (!r) {
        let h = context.for(Helpers).create();
        h.phone.value = info.phone;
        h.name.value = info.name;
        await h.save();
        result.helperId = h.id.value;
        result.shortUrl = h.shortUrlKey.value;
      }
    }

    let existingFamilies = await context.for(Families).find({ where: f => f.courier.isEqualTo(result.helperId).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id)) });
    for (let i = 0; i < info.numOfBaskets; i++) {

      let waitingFamilies = await context.for(Families).find({
        where: f => {
          let where = f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(
            f.courier.isEqualTo('').and(
              f.basketType.isEqualTo(info.basketType).and(
                f.special.IsDifferentFrom(YesNo.Yes.id)
              )));
          if (info.language > -1)
            where = where.and(f.language.isEqualTo(info.language));
          if (info.city) {
            where = where.and(f.city.isEqualTo(info.city));
          }
          return where;

        }
      });

      if (waitingFamilies.length > 0) {
        if (existingFamilies.length == 0) {
          let position = Math.trunc(Math.random() * waitingFamilies.length);
          let family = waitingFamilies[position];
          family.courier.value = result.helperId;
          await family.save();
          result.addedBoxes++;
          existingFamilies.push(family);
        }
        else {

          let getDistance = (x: Location) => {
            let r = 1000000;
            if (!x)
              return r;
            existingFamilies.forEach(ef => {
              let loc = ef.getGeocodeInformation().location();
              if (loc) {
                let dis = GeocodeInformation.GetDistanceBetweenPoints(x, loc);
                if ( dis < r)
                  r = dis;
              }
            });
            return r;

          }

          let f = waitingFamilies[0];
          let dist = getDistance(f.getGeocodeInformation().location());
          for (let i = 1; i < waitingFamilies.length; i++) {
            let myDist = getDistance(waitingFamilies[i].getGeocodeInformation().location());
            if (myDist < dist) {
              dist = myDist;
              f = waitingFamilies[i]
            }
          }
          f.courier.value = result.helperId;

          await f.save();
          existingFamilies.push(f);
          result.addedBoxes++;
        }

      }

    }
    await AsignFamilyComponent.optimizeRoute(existingFamilies, context);
    existingFamilies.sort((a, b) => a.routeOrder.value - b.routeOrder.value);
    result.families = await context.for(Families).toPojoArray(existingFamilies);
    result.basketInfo = await AsignFamilyComponent.getBasketStatus({
      filterCity: info.city,
      filterLanguage: info.language
    }, context);
    return result;
  }
  static async optimizeRoute(families: Families[], context: Context) {

    if (families.length <= 1)
      return;
    let r = await getRouteInfo(families, true, context);
    if (r.status == 'OK' && r.routes && r.routes.length > 0 && r.routes[0].waypoint_order) {
      let i = 1;

      await foreachSync(r.routes[0].waypoint_order, async (p: number) => {
        let f = families[p];
        if (f.routeOrder.value != i) {
          f.routeOrder.value = i;
          f.save();
        }
        i++;
      });
      return r.routes[0].overview_polyline.points;

    }
  }
  addSpecial() {
    this.selectService.selectFamily({
      where: f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(
        f.courier.isEqualTo('').and(f.special.isEqualTo(YesNo.Yes.id))),
      onSelect: async f => {
        f.courier.value = this.id;
        await f.save();
        this.refreshList();
      }
    })
  }

}
export interface AddBoxInfo {
  name: string;
  basketType: string;
  phone: string;
  language: number;
  helperId?: string;
  city: string;
  numOfBaskets: number;
}
export interface AddBoxResponse {
  helperId: string;
  shortUrl: string;
  families: any[];
  basketInfo: GetBasketStatusActionResponse
  addedBoxes: number;

}

function getInfo(r: any) {
  let dist = 0;
  let duration = 0;
  r.routes[0].legs.forEach(e => {
    dist += e.distance.value;
    duration += e.duration.value;
  });
  return {
    dist, duration
  }
}
async function getRouteInfo(families: Families[], optimize: boolean, context: Context) {
  let u = new UrlBuilder('https://maps.googleapis.com/maps/api/directions/json');

  let startAndEnd = (await ApplicationSettings.getAsync(context)).getGeocodeInformation().getlonglat();
  let waypoints = 'optimize:' + (optimize ? 'true' : 'false');
  families.forEach(f => {
    if (f.getGeocodeInformation().location())
      waypoints += '|' + f.getGeocodeInformation().getlonglat();
  });
  u.addObject({
    origin: startAndEnd,
    destination: startAndEnd,
    waypoints: waypoints,
    language: 'he',
    key: process.env.GOOGLE_GECODE_API_KEY
  });

  let r = await (await fetch.default(u.url)).json();
  return r;
}
export interface GetBasketStatusActionInfo {
  filterLanguage: number;
  filterCity: string;
}
export interface GetBasketStatusActionResponse {
  baskets: BasketInfo[];
  cities: CityInfo[];
  special: number;
}
export interface BasketInfo {
  name: string;
  id: string;
  unassignedFamilies: number;

}
export interface CityInfo {
  name: string;
  unassignedFamilies: number;
}