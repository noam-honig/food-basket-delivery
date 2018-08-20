import { Component, OnInit, ViewChild } from '@angular/core';
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';
import { GridSettings, ColumnHashSet, UrlBuilder } from 'radweb';
import { Families } from '../families/families';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { YesNo } from "../families/YesNo";
import { Language } from "../families/Language";
import { BasketType } from "../families/BasketType";
import { Helpers } from '../helpers/helpers';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';

import { UserFamiliesList } from '../my-families/user-families';
import { SendSmsAction } from './send-sms-action';
import { GetBasketStatusAction, BasketInfo, CityInfo, GetBasketStatusActionResponse } from './get-basket-status-action';
import { MapComponent } from '../map/map.component';
import { environment } from '../../environments/environment';
import { Route } from '@angular/router';
import { AdminGuard } from '../auth/auth-guard';
import { foreachSync } from '../shared/utils';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import * as fetch from 'node-fetch';
import { myAuthInfo } from '../auth/my-auth-info';
import { RunOnServer } from '../auth/server-action';


@Component({
  selector: 'app-asign-family',
  templateUrl: './asign-family.component.html',
  styleUrls: ['./asign-family.component.scss']
})
export class AsignFamilyComponent implements OnInit {
  static route: Route = {
    path: 'assign-families', component: AsignFamilyComponent, canActivate: [AdminGuard], data: { name: 'שיוך משפחות' }
  };

  async searchPhone() {
    this.name = undefined;
    this.shortUrl = undefined;
    this.id = undefined;
    if (this.phone.length == 10) {
      let h = new Helpers();
      let r = await h.source.find({ where: h.phone.isEqualTo(this.phone) });
      if (r.length > 0) {
        this.name = r[0].name.value;
        this.shortUrl = r[0].shortUrlKey.value;
        this.id = r[0].id.value;
        this.refreshList();
      } else {
        this.refreshList();
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
    let r = (await new GetBasketStatusAction().run({
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
    this.refreshBaskets();
    this.familyLists.initForHelper(this.id, this.name);

  }
  familyLists = new UserFamiliesList();
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
    this.clearList();

  }
  clearList() {
    this.familyLists.clear();
  }
  findHelper() {
    this.dialog.selectHelper(h => {
      this.phone = h.phone.value;
      this.name = h.name.value;
      this.shortUrl = h.shortUrlKey.value;
      this.id = h.id.value;

      this.refreshList();
    });
  }


  constructor(private auth: AuthService, private dialog: SelectService) {

  }

  ngOnInit() {
    if (!environment.production) {
      this.phone = '0507330590';
      this.searchPhone();
    }
  }
  async assignItem(basket: BasketInfo) {

    let x = await AsignFamilyComponent.AddBox({
      phone: this.phone,
      name: this.name,
      basketType: basket.id,
      helperId: this.id,
      language: this.filterLangulage,
      city: this.filterCity
    }, this.auth.auth.info);
    if (x.ok) {
      basket.unassignedFamilies--;
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
  @RunOnServer
  static async AddBox(info: AddBoxInfo, authInfo: myAuthInfo) {
    let result: AddBoxResponse = {
      helperId: info.helperId,
      ok: false,
      shortUrl: undefined,
      families: [],
      basketInfo: undefined
    }

    let h = new Helpers();
    if (!info.helperId) {
      let r = await h.source.find({ where: h.phone.isEqualTo(info.phone) });
      if (r.length == 0) {
        h.phone.value = info.phone;
        h.name.value = info.name;
        await h.save();
        result.helperId = h.id.value;
        result.shortUrl = h.shortUrlKey.value;

      }
    }
    let f = new Families();



    let existingFamilies = await f.source.find({ where: f.courier.isEqualTo(result.helperId).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id)) });

    {
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
      let r = await f.source.find({ where });

      if (r.length > 0) {
        if (existingFamilies.length == 0) {
          let position = Math.trunc(Math.random() * r.length);
          let family = r[position];
          family.courier.value = result.helperId;
          await family.doSave(authInfo);
          result.ok = true;
          existingFamilies.push(family);
        }
        else {

          let getDistance = (x: Location) => {
            let r = -1;
            existingFamilies.forEach(ef => {
              let loc = ef.getGeocodeInformation().location();
              if (loc) {
                let dis = GeocodeInformation.GetDistanceBetweenPoints(x, loc);
                if (r == -1 || dis < r)
                  r = dis;
              }
            });
            return r;

          }

          let f = r[0];
          let dist = getDistance(f.getGeocodeInformation().location());
          for (let i = 1; i < r.length; i++) {
            let myDist = getDistance(r[i].getGeocodeInformation().location());
            if (myDist < dist) {
              dist = myDist;
              f = r[i]
            }
          }
          f.courier.value = result.helperId;

          await f.doSave(authInfo);
          existingFamilies.push(f);
          result.ok = true;
        }

      }
      await AsignFamilyComponent.optimizeRoute(existingFamilies);
      existingFamilies.sort((a, b) => a.routeOrder.value - b.routeOrder.value);
      let exc = new ColumnHashSet()
      exc.add(...f.excludeColumns(authInfo));

      await foreachSync(existingFamilies, async f => { result.families.push(await f.__toPojo(exc)); });
      result.basketInfo = await GetBasketStatusAction.getTheBaskts({
        filterCity: info.city,
        filterLanguage: info.language
      });
      return result;

    }
  }
  static async optimizeRoute(families: Families[]) {

    if (families.length <= 1)
      return;
    let r = await getRouteInfo(families, true);
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

      if (1 + 1 == 0) {
        let temp = families;
        let sorted = [];

        let lastLoc: Location = {
          lat: 32.2280236,
          lng: 34.8807046
        };
        let total = temp.length;
        for (let i = 0; i < total; i++) {
          let closest = temp[0];
          let closestIndex = 0;
          let closestDist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, closest.getGeocodeInformation().location());
          for (let j = 0; j < temp.length; j++) {
            let dist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, temp[j].getGeocodeInformation().location());
            if (dist < closestDist) {
              closestIndex = j;
              closestDist = dist;
              closest = temp[j];
            }
          }
          lastLoc = closest.getGeocodeInformation().location();
          sorted.push(temp.splice(closestIndex, 1)[0]);

        }
        let r2 = await getRouteInfo(sorted, false);
        console.log(getInfo(r), getInfo(r2));
      }
      return r.routes[0].overview_polyline.points;

    }
  }
  addSpecial() {
    this.dialog.selectFamily({
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
}
export interface AddBoxResponse {
  helperId: string;
  shortUrl: string;
  families: Families[];
  basketInfo: GetBasketStatusActionResponse
  ok: boolean;

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
async function getRouteInfo(families: Families[], optimize: boolean) {
  let u = new UrlBuilder('https://maps.googleapis.com/maps/api/directions/json');

  let startAndEnd = (await ApplicationSettings.getAsync()).getGeocodeInformation().getlonglat();
  let waypoints = 'optimize:' + (optimize ? 'true' : 'false');
  families.forEach(f => {
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
