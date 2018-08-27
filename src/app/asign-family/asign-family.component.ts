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
import { EntityProvider, Context } from '../shared/entity-provider';


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


      let helper = await this.context.entityProvider.for(Helpers).findFirst(h => h.phone.isEqualTo(this.phone));
      if (helper) {
        this.name = helper.name.value;
        this.shortUrl = helper.shortUrlKey.value;
        this.id = helper.id.value;
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


  constructor(private auth: AuthService, private dialog: SelectService, private context: Context) {

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
    });
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
  static async AddBox(info: AddBoxInfo,  context?: Context) {
    
    let result: AddBoxResponse = {
      helperId: info.helperId,
      ok: false,
      shortUrl: undefined,
      families: [],
      basketInfo: undefined
    }

    if (!info.helperId) {
      let r = await context.entityProvider.for(Helpers).findFirst(h => h.phone.isEqualTo(info.phone));
      if (!r) {
        let h = context.entityProvider.for(Helpers).create();
        h.phone.value = info.phone;
        h.name.value = info.name;
        await h.save();
        result.helperId = h.id.value;
        result.shortUrl = h.shortUrlKey.value;
      }
    }
    let f = new Families(context);



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
          await family.doSave(context.info);
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

          await f.doSave(context.info);
          existingFamilies.push(f);
          result.ok = true;
        }

      }
      await AsignFamilyComponent.optimizeRoute(existingFamilies);
      existingFamilies.sort((a, b) => a.routeOrder.value - b.routeOrder.value);
      let exc = new ColumnHashSet()
      exc.add(...f.excludeColumns(context.info));

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
