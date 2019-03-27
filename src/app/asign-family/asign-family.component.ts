import { Component, OnInit } from '@angular/core';
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';
import { ColumnHashSet, UrlBuilder, FilterBase, NumberColumn } from 'radweb';
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
import { Context, DirectSQL } from '../shared/context';
import { SelectService } from '../select-popup/select-service';
import { BasketType } from '../families/BasketType';
import { Routable } from '../shared/routing-helper';
import { CitiesStats } from '../families/stats-action';
import { SqlBuilder } from '../model-shared/types';
import { BusyService } from '../select-popup/busy-service';


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
    path: 'assign-families', component: AsignFamilyComponent, canActivate: [HolidayDeliveryAdmin], data: { name: 'שיוך משפחות', seperator: true }
  };

  async searchPhone() {
    this.name = undefined;
    this.shortUrl = undefined;
    this.id = undefined;
    this.familyLists.routeStats = undefined;
    this.preferRepeatFamilies = true;
    this.clearList();
    if (this.phone.length == 10) {


      let helper = await this.context.for(Helpers).findFirst(h => h.phone.isEqualTo(this.phone));
      if (helper) {
        this.name = helper.name.value;
        this.shortUrl = helper.shortUrlKey.value;
        this.id = helper.id.value;
        this.familyLists.routeStats = helper.getRouteStats();
        Helpers.addToRecent(helper);

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
  async assignmentCanceled() {
    this.lastRefreshRoute = this.lastRefreshRoute.then(
      async () => await this.busy.donotWait(
        async () =>
          await this.refreshBaskets()));
    this.doRefreshRoute();

  }

  lastRefreshRoute = Promise.resolve();
  doRefreshRoute() {
    this.lastRefreshRoute = this.lastRefreshRoute.then(
      async () => await this.busy.donotWait(
        async () => await AsignFamilyComponent.RefreshRoute(this.id).then(r => {
          this.familyLists.routeStats = r;
        })));

  }
  smsSent() {
    this.dialog.Info("הודעת SMS נשלחה ל" + this.name);
    this.phone = '';
    this.name = '';
  }


  async refreshBaskets() {
    let r = (await AsignFamilyComponent.getBasketStatus({
      filterLanguage: this.filterLangulage,
      filterCity: this.filterCity,
      helperId: this.id
    }))
    this.baskets = r.baskets;
    this.cities = r.cities;
    this.specialFamilies = +r.special;
    this.repeatFamilies = +r.repeatFamilies;
  }

  baskets: BasketInfo[] = [];
  cities: CityInfo[] = [];
  specialFamilies = 0;
  repeatFamilies = 0;

  preferRepeatFamilies = true;
  async refreshList() {
    this.busy.donotWait(async () => {
      await this.refreshBaskets();
    });
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
    this.familyLists.routeStats = undefined;

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
        this.familyLists.routeStats = h.getRouteStats();

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



  constructor(private selectService: SelectService, private dialog: DialogService, private context: Context, private busy: BusyService) {

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
  lastAssign = Promise.resolve();
  async assignItem(basket: BasketInfo) {

    this.lastAssign = this.lastAssign.then(async () => {
      await this.busy.donotWait(async () => {
        let x = await AsignFamilyComponent.AddBox({
          phone: this.phone,
          name: this.name,
          basketType: basket.id,
          helperId: this.id,
          language: this.filterLangulage,
          city: this.filterCity,
          numOfBaskets: this.numOfBaskets,
          preferRepeatFamilies: this.preferRepeatFamilies && this.repeatFamilies > 0
        });
        if (x.addedBoxes) {
          if (!this.id) {
            this.context.for(Helpers).findFirst(h => h.id.isContains(x.helperId)).then(x => Helpers.addToRecent(x));

          }
          this.id = x.helperId;
          this.familyLists.initForFamilies(this.id, this.name, x.families);
          basket.unassignedFamilies--;
          if (this.preferRepeatFamilies && this.repeatFamilies > 0)
            this.repeatFamilies--;
          this.doRefreshRoute();
          this.dialog.analytics('Assign Family');
          if (this.filterLangulage != -1)
            this.dialog.analytics('assign family-language');
          if (this.filterCity)
            this.dialog.analytics('assign family-city');
          if (this.numOfBaskets)
            this.dialog.analytics('assign family boxes=' + this.numOfBaskets);
        }
        else {
          this.refreshList();
          this.dialog.Info("לא נמצאה משפחה מתאימה");
        }
        this.id = x.helperId;
      });
    });
  }

  @RunOnServer({ allowed: c => c.isAdmin() })
  static async getBasketStatus(info: GetBasketStatusActionInfo, context?: Context): Promise<GetBasketStatusActionResponse> {
    console.time('getBasketStatus');
    let result = {
      baskets: [],
      cities: [],
      special: 0,
      repeatFamilies: 0
    };
    let countFamilies = (additionalWhere?: (f: Families) => FilterBase) => {
      return context.for(Families).count(f => {
        let where = f.readyFilter(info.filterCity, info.filterLanguage);
        if (additionalWhere) {
          where = where.and(additionalWhere(f));
        }
        return where;
      });
    };

    result.special = await countFamilies(f => f.special.isEqualTo(YesNo.Yes.id));

    result.repeatFamilies = await countFamilies(f =>
      f.previousCourier.isEqualTo(info.helperId)
    );

    for (let c of await context.for(CitiesStats).find({
      orderBy: ff => [{ column: ff.city }]
    })) {
      var ci = {
        name: c.city.value,
        unassignedFamilies: c.families.value
      };
      if (info.filterLanguage == -1) {
        result.cities.push(ci);
      }
      else {
        ci.unassignedFamilies = await countFamilies(f => f.city.isEqualTo(c.city.value));
        if (ci.unassignedFamilies > 0)
          result.cities.push(ci);
      }
    }
    for (let b of await context.for(BasketType).find({})) {
      let bi = {
        id: b.id.value,
        name: b.name.value,
        unassignedFamilies: await countFamilies(f => f.basketType.isEqualTo(b.id.value))
      };
      if (bi.unassignedFamilies > 0)
        result.baskets.push(bi);
    }
    result.baskets.sort((a, b) => b.unassignedFamilies - a.unassignedFamilies);

    console.timeEnd('getBasketStatus');
    return result;
  }
  @RunOnServer({ allowed: c => c.isAdmin() })
  static async RefreshRoute(helperId: string, context?: Context) {
    let existingFamilies = await context.for(Families).find({ where: f => f.courier.isEqualTo(helperId).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id)) });
    let h = await context.for(Helpers).findFirst(h => h.id.isEqualTo(helperId));
    return await AsignFamilyComponent.optimizeRoute(h, existingFamilies, context);
  }

  @RunOnServer({ allowed: c => c.isAdmin() })
  static async AddBox(info: AddBoxInfo, context?: Context, directSql?: DirectSQL) {
    console.time('addBox');

    let result: AddBoxResponse = {
      helperId: info.helperId,
      addedBoxes: 0,
      shortUrl: undefined,
      families: [],
      basketInfo: undefined,
      routeStats: undefined

    }
    let r = await context.for(Helpers).findFirst(h => h.phone.isEqualTo(info.phone));
    if (!info.helperId) {

      if (!r) {
        let h = context.for(Helpers).create();
        h.phone.value = info.phone;
        h.name.value = info.name;
        await h.save();
        r = h;
        result.helperId = h.id.value;
        result.shortUrl = h.shortUrlKey.value;
      }
    }
    console.time('existingFamilies');
    let existingFamilies = await context.for(Families).find({ where: f => f.courier.isEqualTo(result.helperId).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id)) });
    console.timeEnd('existingFamilies');
    for (let i = 0; i < info.numOfBaskets; i++) {

      let getFamilies = async () => {

        let f = new Families(context);
        let sql = new SqlBuilder();
        sql.addEntity(f, 'Families');
        let r = (await directSql.execute(sql.query({
          select: () => [f.id, f.addressLatitude, f.addressLongitude],
          from: f,
          where: () => {
            let where = f.readyFilter(info.city, info.language).and(
              f.basketType.isEqualTo(info.basketType).and(
                f.special.IsDifferentFrom(YesNo.Yes.id)
              ));

            if (info.preferRepeatFamilies)
              where = where.and(f.previousCourier.isEqualTo(info.helperId));
            return [where];
          }
        })));

        return r.rows.map(x => {
          return {
            id: x[r.fields[0].name],
            addressLatitude: +x[r.fields[1].name],
            addressLongitude: +x[r.fields[2].name]
          } as familyQueryResult;

        }) as familyQueryResult[];


      }
      console.time('getFamilies');
      let waitingFamilies = await getFamilies();
      if (info.preferRepeatFamilies && waitingFamilies.length == 0) {
        info.preferRepeatFamilies = false;
        waitingFamilies = await getFamilies();
      }
      console.timeEnd('getFamilies');

      if (waitingFamilies.length > 0) {
        if (existingFamilies.length == 0) {
          let position = Math.trunc(Math.random() * waitingFamilies.length);
          let family = await context.for(Families).findFirst(f => f.id.isEqualTo(waitingFamilies[position].id));
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
                if (dis < r)
                  r = dis;
              }
            });
            return r;

          }
          console.time('findClosest');
          let smallFamily = waitingFamilies[0];
          let dist = getDistance({
            lat: smallFamily.addressLatitude,
            lng: smallFamily.addressLongitude
          });
          for (let i = 1; i < waitingFamilies.length; i++) {
            let f = waitingFamilies[i];
            let myDist = getDistance({ lng: f.addressLongitude, lat: f.addressLatitude });
            if (myDist < dist) {
              dist = myDist;
              smallFamily = waitingFamilies[i]
            }
          }
          console.timeEnd('findClosest');
          let f = await context.for(Families).findFirst(f => f.id.isEqualTo(smallFamily.id));
          f.courier.value = result.helperId;

          await f.save();
          existingFamilies.push(f);
          result.addedBoxes++;
        }

      }

    }
    console.time('optimizeRoute');
    //result.routeStats = await AsignFamilyComponent.optimizeRoute(r, existingFamilies, context);
    console.timeEnd('optimizeRoute');
    existingFamilies.sort((a, b) => a.routeOrder.value - b.routeOrder.value);
    result.families = await context.for(Families).toPojoArray(existingFamilies);

    /*result.basketInfo = await AsignFamilyComponent.getBasketStatus({
      filterCity: info.city,
      filterLanguage: info.language,
      helperId: info.helperId
    }, context);*/

    console.timeEnd('addBox');
    return result;
  }

  static async optimizeRoute(helper: Helpers, families: Families[], context: Context) {

    if (families.length < 1)
      return;
    let result = {
      totalKm: 0,
      totalTime: 0
    } as routeStats;
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
      for (let i = 0; i < r.routes[0].legs.length - 1; i++) {
        let l = r.routes[0].legs[i];
        result.totalKm += l.distance.value;
        result.totalTime += l.duration.value;
      }
      result.totalKm = Math.round(result.totalKm / 1000);
      result.totalTime = Math.round(result.totalTime / 60);
      helper.totalKm.value = result.totalKm;
      helper.totalTime.value = result.totalTime;
      helper.save();

    }
    return result;

  }
  addSpecial() {
    this.addFamily(f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(
      f.courier.isEqualTo('').and(f.special.isEqualTo(YesNo.Yes.id))), 'special');
  }
  addFamily(filter: (f: Families) => FilterBase, analyticsName: string) {
    this.selectService.selectFamily({
      where: f => {
        if (this.filterCity)
          return f.city.isEqualTo(this.filterCity).and(filter(f));
        return filter(f);
      },
      onSelect: async f => {
        if (!this.id) {
          let helper = await this.context.for(Helpers).lookupAsync(h => h.phone.isEqualTo(this.phone));
          if (helper.isNew()) {
            helper.phone.value = this.phone;
            helper.name.value = this.name;
            await helper.save();
            Helpers.addToRecent(helper);
          }
          this.name = helper.name.value;
          this.shortUrl = helper.shortUrlKey.value;
          this.id = helper.id.value;
        }

        let ok = async () => {
          f.courier.value = this.id;
          f.deliverStatus.listValue = DeliveryStatus.ReadyForDelivery;
          this.dialog.analytics(analyticsName);
          await f.save();
          this.refreshList();
          this.doRefreshRoute();
        };

        if (f.courier.value) {
          let c = await f.courier.getTheName();
          this.dialog.YesNoQuestion('משפחת ' +
            f.name.value + ' כבר משוייכת ל' + c + ' בסטטוס ' +
            f.deliverStatus.displayValue + '. האם לשייך אותו למשנע ' + this.name + '?', () => {
              ok();
            });

        }
        else
          ok();



      }
    })
  }
  addSpecific() {
    this.addFamily(f => f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id), 'specific');
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
  preferRepeatFamilies: boolean;

}
export interface AddBoxResponse {
  helperId: string;
  shortUrl: string;
  families: any[];
  basketInfo: GetBasketStatusActionResponse
  addedBoxes: number;
  routeStats: routeStats;


}
interface familyQueryResult {
  id: string;
  addressLatitude: number;
  addressLongitude: number;
}
export interface routeStats {
  totalKm: number;
  totalTime: number;
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
  helperId: string;
}
export interface GetBasketStatusActionResponse {
  baskets: BasketInfo[];
  cities: CityInfo[];
  special: number;
  repeatFamilies: number;
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