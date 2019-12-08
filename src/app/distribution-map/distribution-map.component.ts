/// <reference types="@types/googlemaps" />
import * as chart from 'chart.js';
import { Component, OnInit, ViewChild, Sanitizer, OnDestroy } from '@angular/core';

import { Families } from '../families/families';
import { DialogService } from '../select-popup/dialog';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';

import { DomSanitizer } from '@angular/platform-browser';
import { Route } from '@angular/router';

import { Context, DirectSQL } from '@remult/core';
import { ServerFunction } from '@remult/core';
import { SqlBuilder } from '../model-shared/types';
import { DeliveryStatus } from '../families/DeliveryStatus';


import { colors } from '../families/stats-action';
import { BusyService } from '@remult/core';
import { YesNo } from '../families/YesNo';
import { Roles, AdminGuard } from '../auth/roles';
import { UpdateFamilyDialogComponent } from '../update-family-dialog/update-family-dialog.component';

@Component({
  selector: 'app-distribution-map',
  templateUrl: './distribution-map.component.html',
  styleUrls: ['./distribution-map.component.scss']
})
export class DistributionMap implements OnInit, OnDestroy {
  constructor(private context: Context, private dialog: DialogService,  busy: BusyService) {

    let y = dialog.refreshStatusStats.subscribe(() => {
      busy.donotWait(async () => {
        await this.refreshFamilies();
      });
    });
    this.onDestroy = () => {
      y.unsubscribe();
    };

  }
  ngOnDestroy(): void {
    this.onDestroy();
  }
  onDestroy = () => { };
  static route: Route = {
    path: 'addresses',
    component: DistributionMap,
    data: { name: 'מפת הפצה' }, canActivate: [AdminGuard]
  };

  gridView = true;



  mapVisible = true;
  mapInit = false;
  bounds = new google.maps.LatLngBounds();
  dict = new Map<string, infoOnMap>();
  async test() {

    var mapProp: google.maps.MapOptions = {
      center: new google.maps.LatLng(32.3215, 34.8532),
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,

    };
    if (!this.mapInit) {

      this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
      this.mapInit = true;
      await this.refreshFamilies();
      this.map.fitBounds(this.bounds);
    }


    this.mapVisible = !this.mapVisible;



  }
  statuses = new Statuses();
  selectedStatus: statusClass;
  async refreshFamilies() {
    let families = await DistributionMap.GetFamiliesLocations();
    this.statuses.statuses.forEach(element => {
      element.value = 0;
    });

    families.forEach(f => {

      let familyOnMap = this.dict.get(f.id);
      let isnew = false;
      if (!familyOnMap) {
        isnew = true;
        familyOnMap = {
          marker: new google.maps.Marker({ map: this.map, position: { lat: f.lat, lng: f.lng } })
          , prevStatus: undefined,
          prevCourier: undefined

        };
        this.dict.set(f.id, familyOnMap);
        let info: google.maps.InfoWindow;
        let family: Families;
        google.maps.event.addListener(familyOnMap.marker, 'click', async () => {
          if (!info) {
            info = new google.maps.InfoWindow({
              content: `<h4>${f.status}</h4>`
            });
            //info.open(this.map, familyOnMap.marker);
          }
          family = await this.context.for(Families).findFirst(fam => fam.id.isEqualTo(f.id));
          this.context.openDialog(UpdateFamilyDialogComponent, x=>x.args={ f: family });
        });
      }

      let status: statusClass = this.statuses.getBy(f.status, f.courier);

      if (status)
        status.value++;

      if (status != familyOnMap.prevStatus || f.courier != familyOnMap.prevCourier) {
        familyOnMap.marker.setIcon(status.icon);

        if (!isnew) {
          familyOnMap.marker.setAnimation(google.maps.Animation.DROP);
          setTimeout(() => {
            familyOnMap.marker.setAnimation(null);
          }, 1000);
        }
        familyOnMap.prevStatus = status;
        familyOnMap.prevCourier = f.courier;
      }
      familyOnMap.marker.setVisible(!this.selectedStatus || this.selectedStatus == status);
      if (familyOnMap.marker.getPosition().lat() > 0)
        this.bounds.extend(familyOnMap.marker.getPosition());

    });
    this.updateChart();
  }
  @ServerFunction({ allowed: Roles.admin })
  static async GetFamiliesLocations(onlyPotentialAsignment?: boolean, city?: string, group?: string, context?: Context, directSql?: DirectSQL) {
    let f = new Families(context);

    let sql = new SqlBuilder();
    sql.addEntity(f, "Families");
    let r = (await directSql.execute(sql.query({
      select: () => [f.id, f.addressLatitude, f.addressLongitude, f.deliverStatus, f.courier],
      from: f,
      where: () => {
        let where = [f.deliverStatus.isActiveDelivery().and(f.blockedBasket.isEqualTo(false))];
        if (onlyPotentialAsignment) {
          where.push(f.readyFilter(city, group).and(f.special.isEqualTo(YesNo.No)));
        }
        return where;
      },
      orderBy: [f.addressLatitude, f.addressLongitude]
    })));

    return r.rows.map(x => {
      return {
        id: x[r.getcolumnNameAtIndex(0)],
        lat: +x[r.getcolumnNameAtIndex(1)],
        lng: +x[r.getcolumnNameAtIndex(2)],
        status: +x[r.getcolumnNameAtIndex(3)],
        courier: x[r.getcolumnNameAtIndex(4)]
      } as familyQueryResult;

    }) as familyQueryResult[];
  }

  @ViewChild('gmap', { static: true }) gmapElement: any;
  map: google.maps.Map;
  async ngOnInit() {

    this.test();
  }
  options: chart.ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: 'right',
      onClick: (event: MouseEvent, legendItem: any) => {
        this.selectedStatus = this.statuses[legendItem.index];
        this.refreshFamilies();
        return false;
      }
    },
  };
  public chartClicked(e: any): void {
    if (e.active && e.active.length > 0) {
      this.selectedStatus = this.statuses[e.active[0]._index];
      this.refreshFamilies();
    }
  }
  updateChart() {
    this.pieChartData = [];
    this.pieChartLabels.splice(0);
    this.colors[0].backgroundColor.splice(0);


    this.statuses.statuses.forEach(s => {

      this.pieChartLabels.push(s.name + ' ' + s.value);
      this.pieChartData.push(s.value);
      this.colors[0].backgroundColor.push(s.color);

    });
  }

  public pieChartLabels: string[] = [];
  public pieChartData: number[] = [];

  public colors: Array<any> = [
    {
      backgroundColor: []

    }];

  public pieChartType: string = 'pie';


}
interface familyQueryResult {
  id: string;
  lat: number;
  lng: number;
  status: number;
  courier: string;
}
export interface infoOnMap {
  marker: google.maps.Marker;
  prevStatus: statusClass;
  prevCourier: string;

}

export class statusClass {
  constructor(public name: string, public icon: string, public color: string) {

  }
  value = 0;
}

export class Statuses {
  constructor() {
    this.statuses.push(this.ready);
    if (DeliveryStatus.usingSelfPickupModule)
      this.statuses.push(this.selfPickup);
    this.statuses.push(this.onTheWay, this.success, this.problem);
  }
  getBy(statusId: number, courierId: string): statusClass {
    switch (statusId) {
      case DeliveryStatus.ReadyForDelivery.id:
        if (courierId)
          return this.onTheWay;
        else
          return this.ready;
        break;
      case DeliveryStatus.SelfPickup.id:
        return this.selfPickup;
        break;
      case DeliveryStatus.Success.id:
      case DeliveryStatus.SuccessLeftThere.id:
      case DeliveryStatus.SuccessPickedUp.id:
        return this.success;
        break;
      case DeliveryStatus.FailedBadAddress.id:
      case DeliveryStatus.FailedNotHome.id:
      case DeliveryStatus.FailedOther.id:
        return this.problem;
        break;
    }
  }
  ready = new statusClass('טרם שויכו', 'https://maps.google.com/mapfiles/ms/micons/yellow-dot.png', colors.yellow);
  selfPickup = new statusClass('באים לקחת', 'https://maps.google.com/mapfiles/ms/micons/orange-dot.png', colors.orange);
  onTheWay = new statusClass('בדרך', 'https://maps.google.com/mapfiles/ms/micons/ltblue-dot.png', colors.blue);
  problem = new statusClass('בעיות', 'https://maps.google.com/mapfiles/ms/micons/red-pushpin.png', colors.red);
  success = new statusClass('הגיעו', 'https://maps.google.com/mapfiles/ms/micons/green-dot.png', colors.green);
  statuses: statusClass[] = [];


}