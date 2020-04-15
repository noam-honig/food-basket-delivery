/// <reference types="@types/googlemaps" />
import * as chart from 'chart.js';
import { Component, OnInit, ViewChild, Sanitizer, OnDestroy } from '@angular/core';

import { Families } from '../families/families';
import { DialogService } from '../select-popup/dialog';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';

import { DomSanitizer } from '@angular/platform-browser';
import { Route } from '@angular/router';

import { Context, SqlDatabase, DataAreaSettings } from '@remult/core';
import { ServerFunction } from '@remult/core';
import { SqlBuilder } from '../model-shared/types';
import { DeliveryStatus } from '../families/DeliveryStatus';


import { colors } from '../families/stats-action';
import { BusyService } from '@remult/core';
import { YesNo } from '../families/YesNo';
import { Roles, AdminGuard, distCenterAdminGuard, distCenterOrOverviewOrAdmin, OverviewOrAdminGuard, OverviewGuard } from '../auth/roles';
import { UpdateFamilyDialogComponent } from '../update-family-dialog/update-family-dialog.component';
import { Helpers, HelperId } from '../helpers/helpers';
import MarkerClusterer, { ClusterIconInfo } from "@google/markerclustererplus";
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { Sites } from '../sites/sites';

@Component({
  selector: 'app-distribution-map',
  templateUrl: './distribution-map.component.html',
  styleUrls: ['./distribution-map.component.scss']
})
export class DistributionMap implements OnInit, OnDestroy {
  constructor(private context: Context, private dialog: DialogService, busy: BusyService) {

    let y = dialog.refreshStatusStats.subscribe(() => {
      busy.donotWait(async () => {

        await this.refreshFamilies();

      });
    });
    this.onDestroy = () => {
      y.unsubscribe();
    };
    this.dialog.onDistCenterChange(async () => {
      for (const f of this.dict.values()) {
        f.marker.setMap(null);
      }
      this.dict = new Map<string, infoOnMap>();
      this.bounds = new google.maps.LatLngBounds();
      await this.refreshFamilies();
      this.map.fitBounds(this.bounds);
    }, this);

  }
  showHelper = false;
  ngOnDestroy(): void {
    this.onDestroy();
  }
  onDestroy = () => { };
  static route: Route = {
    path: 'addresses',
    component: DistributionMap,
    data: { name: 'מפת הפצה' }, canActivate: [distCenterOrOverviewOrAdmin]
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
      this.dict = new Map<string, infoOnMap>();
      this.bounds = new google.maps.LatLngBounds();
      this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
      this.mapInit = true;
      await this.refreshFamilies();
      this.map.fitBounds(this.bounds);
    }


    this.mapVisible = !this.mapVisible;



  }
  statuses = new Statuses();
  selectedStatus: statusClass;
  filterCourier = new HelperId(this.context, () => this.dialog.distCenter.value, {
    caption: 'משנע לסינון',
    valueChange: () => this.refreshFamilies()
  }, h => h.allFamilies.isGreaterThan(0));

  overviewMap = false;
  async refreshFamilies() {
    let allInAlll = false;
    let families: familyQueryResult[];
    if (this.context.isAllowed(Roles.overview)) {
      this.overviewMap = true;
      families = await DistributionMap.GetLocationsForOverview();
      allInAlll = true;
    }
    else
      families = await DistributionMap.GetFamiliesLocations(false, undefined, undefined, this.dialog.distCenter.value);
    this.statuses.statuses.forEach(element => {
      element.value = 0;
    });
    let markers: google.maps.Marker[] = []

    families.forEach(f => {

      let familyOnMap = this.dict.get(f.id);
      let isnew = false;
      if (!familyOnMap) {
        isnew = true;
        familyOnMap = {
          marker: new google.maps.Marker({ position: { lat: f.lat, lng: f.lng } })
          , prevStatus: undefined,
          prevCourier: undefined

        };
        this.dict.set(f.id, familyOnMap);
        markers.push(familyOnMap.marker);

        let family: Families;
        if (!allInAlll)
          google.maps.event.addListener(familyOnMap.marker, 'click', async () => {
            family = await this.context.for(Families).findFirst(fam => fam.id.isEqualTo(f.id));
            this.context.openDialog(UpdateFamilyDialogComponent, x => x.args = {
              f: family, onSave: () => {
                familyOnMap.marker.setMap(null);
                this.dict.delete(f.id);
                this.refreshFamilies()
              }
            });
          });
      }
      else
        familyOnMap.marker.setPosition({ lat: f.lat, lng: f.lng });

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
      familyOnMap.marker.setVisible((!this.selectedStatus || this.selectedStatus == status) && (!this.filterCourier.value || this.filterCourier.value == familyOnMap.prevCourier));


      familyOnMap.marker.setLabel(this.showHelper && f.courierName ? f.courierName + '...' : '');



      if (familyOnMap.marker.getPosition().lat() > 0)
        this.bounds.extend(familyOnMap.marker.getPosition());

    });
    if (allInAlll || markers.length > 5000)
      var x = new MarkerClusterer(this.map, markers, {
        //imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        imagePath: 'http://localhost:4200/assets/test',
        clusterClass: 'map-cluster',
        minimumClusterSize: 13,
        averageCenter: true,
        styles: [{
          textColor: 'black',
          //  url: '/assets/test0.png',
          height: 17,
          width: 50,

          anchorText: [2, 0]

        }],
        calculator: (m, x) => ({ index: 2, text: m.length.toString(), title: m.length.toString() + 'title' }),
        gridSize: 40
      });

    else {
      for (const m of markers) {
        m.setMap(this.map);
      }
    }
    this.updateChart();
  }
  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async GetFamiliesLocations(onlyPotentialAsignment?: boolean, city?: string, group?: string, distCenter?: string, context?: Context, db?: SqlDatabase) {
    if (!distCenter)
      distCenter = '';
    let f = context.for(Families).create();
    let h = context.for(Helpers).create();
    let sql = new SqlBuilder();
    sql.addEntity(f, "Families");
    let r = (await db.execute(sql.query({
      select: () => [f.id, f.addressLatitude, f.addressLongitude, f.deliverStatus, f.courier,
      sql.columnInnerSelect(f, {
        from: h,
        select: () => [h.name],
        where: () => [sql.eq(h.id, f.courier)]
      })
      ],
      from: f,

      where: () => {
        let where: any[] = [f.deliverStatus.isActiveDelivery().and(f.distributionCenter.isAllowedForUser())];
        if (distCenter !== undefined)
          where.push(f.filterDistCenter(distCenter));

        if (onlyPotentialAsignment) {
          where.push(f.readyFilter(city, group).and(f.special.isEqualTo(YesNo.No)));
        }
        return where;
      },
      orderBy: [f.addressLatitude, f.addressLongitude]
    })));

    return r.rows.map(x => {
      return {
        id: x[r.getColumnKeyInResultForIndexInSelect(0)],
        lat: +x[r.getColumnKeyInResultForIndexInSelect(1)],
        lng: +x[r.getColumnKeyInResultForIndexInSelect(2)],
        status: +x[r.getColumnKeyInResultForIndexInSelect(3)],
        courier: x[r.getColumnKeyInResultForIndexInSelect(4)],
        courierName: x[r.getColumnKeyInResultForIndexInSelect(5)]
      } as familyQueryResult;

    }) as familyQueryResult[];
  }
  @ServerFunction({ allowed: Roles.overview })
  static async GetLocationsForOverview(context?: Context, db?: SqlDatabase) {

    let result: familyQueryResult[] = []
    let f = context.for(Families).create();
    let fd = context.for(FamilyDeliveries).create();
    let sql = new SqlBuilder();
    sql.addEntity(f, "Families");
    sql.addEntity(fd, "FamiliesDeliveries");

    for (const org of Sites.schemas) {
      let dp = Sites.getDataProviderForOrg(org) as SqlDatabase;
      result.push(...mapSqlResult((await dp.execute(sql.query({
        select: () => [f.id, f.addressLatitude, f.addressLongitude, f.deliverStatus],
        from: f,
        where: () => {
          let where = [f.deliverStatus.isSuccess().and(f.deliveryStatusDate.isGreaterOrEqualTo(new Date(2020, 2, 18)))];
          return where;
        }

      })))));
      result.push(...mapSqlResult((await dp.execute(sql.query({
        select: () => [fd.id, fd.archive_addressLatitude, fd.archive_addressLongitude, fd.deliverStatus],
        from: fd,
        where: () => {
          let where = [fd.deliverStatus.isSuccess().and(fd.deliveryStatusDate.isGreaterOrEqualTo(new Date(2020, 2, 18)))];
          return where;
        }

      })))));
    }
    return result;

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
        this.selectedStatus = this.statuses.statuses[legendItem.index];
        this.refreshFamilies();
        return false;
      }
    },
  };
  public chartClicked(e: any): void {
    if (e.active && e.active.length > 0) {
      this.selectedStatus = this.statuses.statuses[e.active[0]._index];
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
  courierName: string;
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

function mapSqlResult(r) {
  return r.rows.map(x => {
    return {
      id: x[r.getColumnKeyInResultForIndexInSelect(0)],
      lat: +x[r.getColumnKeyInResultForIndexInSelect(1)],
      lng: +x[r.getColumnKeyInResultForIndexInSelect(2)],
      status: +x[r.getColumnKeyInResultForIndexInSelect(3)],
      courier: '',
      courierName: ''
    } as familyQueryResult;
  }) as familyQueryResult[];
}
/*update haderamoadonit.families  set deliverstatus=11 where addresslongitude >(select x.addresslongitude from haderamoadonit.families x
  where name like '%גרובש%')
  and addresslongitude<= (select x.addresslongitude from haderamoadonit.families x
  where name like '%וולנץ%')*/