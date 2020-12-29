/// <reference types="@types/googlemaps" />
import * as chart from 'chart.js';
import { Component, OnInit, ViewChild, Sanitizer, OnDestroy } from '@angular/core';


import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { GeocodeInformation, GetGeoInformation, polygonContains, polygonGetBounds } from '../shared/googleApiHelpers';

import { DomSanitizer } from '@angular/platform-browser';
import { Route } from '@angular/router';

import { Context, SqlDatabase, DataAreaSettings, GridButton, AndFilter, StringColumn } from '@remult/core';
import { ServerFunction } from '@remult/core';
import { SqlBuilder } from '../model-shared/types';
import { DeliveryStatus } from '../families/DeliveryStatus';


import { colors } from '../families/stats-action';
import { BusyService } from '@remult/core';
import { YesNo } from '../families/YesNo';
import { Roles, AdminGuard, distCenterAdminGuard, distCenterOrOverviewOrAdmin, OverviewOrAdminGuard, OverviewGuard } from '../auth/roles';

import { Helpers, HelperId } from '../helpers/helpers';
import MarkerClusterer, { ClusterIconInfo } from "@google/markerclustererplus";
import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { getLang, Sites } from '../sites/sites';
import { DistributionCenterId, DistributionCenters, filterCenterAllowedForUser } from '../manage/distribution-centers';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';

import { delvieryActions, UpdateDistributionCenter, NewDelivery, UpdateDeliveriesStatus, UpdateCourier, DeleteDeliveries } from '../family-deliveries/family-deliveries-actions';
import { buildGridButtonFromActions, serverUpdateInfo, filterActionOnServer, actionDialogNeeds } from '../families/familyActionsWiring';
import { UpdateArea, updateGroup, bridge } from '../families/familyActions';
import { AreaColumn, Families } from '../families/families';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FamilyDeliveriesComponent } from '../family-deliveries/family-deliveries.component';
import { use } from '../translate';

@Component({
  selector: 'app-distribution-map',
  templateUrl: './distribution-map.component.html',
  styleUrls: ['./distribution-map.component.scss']
})
export class DistributionMap implements OnInit, OnDestroy {
  showChart = true;
  constructor(private context: Context, private dialog: DialogService, busy: BusyService, public settings: ApplicationSettings) {

    dialog.onStatusChange(() => {
      busy.donotWait(async () => {

        await this.refreshDeliveries();

      });
    }, this.destroyHelper);

    this.dialog.onDistCenterChange(async () => {
      this.clearMap();
      this.bounds = new google.maps.LatLngBounds();
      await this.refreshDeliveries();
      this.map.fitBounds(this.bounds);
    }, this.destroyHelper);

  }
  showHelper = false;
  private clearMap() {
    for (const f of this.dict.values()) {
      f.marker.setMap(null);
    }
    this.selectedDeliveries = [];
    this.dict = new Map<string, infoOnMap>();
    if (this.activePolygon) {
      this.activePolygon.setMap(null);
      this.activePolygon = undefined;
    }

  }
  buttons: GridButton[] = [
    ...buildGridButtonFromActions([
      bridge(UpdateArea)
      , UpdateDistributionCenter,
      UpdateCourier,
      bridge(updateGroup),
      NewDelivery,
      UpdateDeliveriesStatus,
      DeleteDeliveries], this.context, this.buttonDeliveryHelper()),
  ];


  private buttonDeliveryHelper(): actionDialogNeeds<ActiveFamilyDeliveries> {
    return {
      afterAction: async () => await this.refreshDeliveries(),
      dialog: this.dialog,
      callServer: async (info, action, args) => await FamilyDeliveriesComponent.DeliveriesActionOnServer(info, action, args),
      buildActionInfo: async (actionWhere) => {
        return {
          count: this.selectedDeliveries.length,
          where: x => x.id.isIn(this.selectedDeliveries.map(x => x.id))
        };
      },
      settings: this.settings,
      groupName: this.settings.lang.deliveries
    };
  }

  hasVisibleButtons() {
    return this.buttons.find(x => !x.visible || x.visible());
  }

  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }
  static route: Route = {
    path: 'addresses', component: DistributionMap, canActivate: [distCenterAdminGuard]
  };

  gridView = true;
  drawing = false;
  selectedDeliveries: infoOnMap[] = [];
  calcSelectedDeliveries() {
    this.selectedDeliveries = [];
    if (!this.activePolygon)
      return;
    for (const f of this.dict.values()) {
      if (f.marker.getVisible() && f.marker.getMap()) {
        if (polygonContains(this.activePolygon, f.marker.getPosition())) {
          this.selectedDeliveries.push(f);
        }
      }
    };
  }
  selectDeliveries() {
    this.drawing = true;
    if (this.activePolygon) {
      this.activePolygon.setMap(null);
    }
    let dm = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,
      polygonOptions: {
        editable: true

      }
    });


    google.maps.event.addListener(dm, 'polygoncomplete', (polygon: google.maps.Polygon) => {
      this.activePolygon = polygon;
      // let bounds = polygonGetBounds(polygon);
      // let j = bounds.toJSON();
      // console.log(j, bounds);


      this.drawing = false;

      this.calcSelectedDeliveries();
      polygon.addListener('mouseup', () => {
        this.calcSelectedDeliveries();
      })

      dm.setDrawingMode(null);

    });
    dm.setMap(this.map);
  }
  activePolygon: google.maps.Polygon;



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
      // var r = new google.maps.Rectangle({
      //   map: this.map,
      //   fillColor: '#FF0000',
      //   fillOpacity: 0.35,
      //   bounds: {
      //     west: 34.2654333839,
      //     south: 29.5013261988,
      //     east: 35.8363969256,
      //     north: 33.2774264593
      //   }
      // });
      this.mapInit = true;
      await this.refreshDeliveries();
      this.map.fitBounds(this.bounds);

    }


    this.mapVisible = !this.mapVisible;



  }
  statuses = new Statuses(this.settings);
  selectedStatus: statusClass;
  filterCourier = new HelperId(this.context, {
    caption: this.settings.lang.volunteer,
    valueChange: () => this.refreshDeliveries()
  }, { filter: h => h.allDeliveires.isGreaterThan(0) });

  filterArea = new StringColumn({
    caption: use.language.filterRegion,
    defaultValue: use.language.allRegions,
    valueChange: () => this.refreshDeliveries(),
    dataControlSettings: () => ({
      valueList: async () => await AreaColumn.getAreas().then(areas => [{ caption: use.language.allRegions, id: use.language.allRegions }, ...areas.map(x => ({ caption: x.area + ' - ' + x.count, id: x.area }))])
    })
  });
  area = new DataAreaSettings();
  overviewMap = false;

  async refreshDeliveries() {
    let allInAlll = false;
    let deliveries: deliveryOnMap[];
    if (this.context.isAllowed(Roles.overview)) {
      this.overviewMap = true;
      deliveries = await DistributionMap.GetLocationsForOverview();
      allInAlll = true;
    }
    else
      deliveries = await DistributionMap.GetDeliveriesLocation(false, undefined, undefined, this.dialog.distCenter.value, this.filterArea.value != use.language.allRegions ? this.filterArea.value : undefined);
    this.statuses.statuses.forEach(element => {
      element.value = 0;
    });
    this.area = new DataAreaSettings({ columnSettings: () => [[this.filterCourier, this.filterArea]] });
    let markers: google.maps.Marker[] = []
    let newIds = new Map<string, boolean>();
    deliveries.forEach(f => {
      newIds.set(f.id, true);
      let familyOnMap = this.dict.get(f.id);
      let isnew = false;
      if (!familyOnMap) {
        isnew = true;
        familyOnMap = {
          marker: new google.maps.Marker({ position: { lat: f.lat, lng: f.lng } })
          , prevStatus: undefined,
          prevCourier: undefined,
          id: f.id

        };
        this.dict.set(f.id, familyOnMap);
        markers.push(familyOnMap.marker);


        if (!allInAlll)
          google.maps.event.addListener(familyOnMap.marker, 'click', async () => {
            let fd = await this.context.for(ActiveFamilyDeliveries).findId(familyOnMap.id);
            await fd.showDetailsDialog({
              onSave: async () => {
                familyOnMap.marker.setMap(null);
                this.dict.delete(f.id);
                this.refreshDeliveries()
              }
              , dialog: this.dialog
            });

          });
      }
      else {
        familyOnMap.marker.setPosition({ lat: f.lat, lng: f.lng });
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
      familyOnMap.marker.setVisible((!this.selectedStatus || this.selectedStatus == status) && (!this.filterCourier.value || this.filterCourier.value == familyOnMap.prevCourier));


      familyOnMap.marker.setLabel(this.showHelper && f.courierName ? f.courierName + '...' : '');




      this.bounds.extend(familyOnMap.marker.getPosition());

    });
    for (const id of this.dict.keys()) {
      if (!newIds.get(id)) {
        let f = this.dict.get(id);
        f.marker.setMap(null);
        this.dict.delete(id);
      }
    }
    if (allInAlll || markers.length > 10000)
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
    this.calcSelectedDeliveries();
  }
  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async GetDeliveriesLocation(onlyPotentialAsignment?: boolean, city?: string, group?: string, distCenter?: string, area?: string, basket?: string, context?: Context, db?: SqlDatabase) {
    if (!distCenter)
      distCenter = '';
    let f = context.for(ActiveFamilyDeliveries).create();
    let h = context.for(Helpers).create();
    let sql = new SqlBuilder();
    sql.addEntity(f, "FamilyDeliveries");
    let r = (await db.execute(log(sql.query({
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
          where.push(f.filterDistCenterAndAllowed(distCenter));
        if (area!==undefined &&area!=getLang( context).allRegions) {
          where.push(f.area.isEqualTo(area));
        }

        if (onlyPotentialAsignment) {
          where.push(f.readyFilter(city, group, area, basket).and(f.special.isEqualTo(YesNo.No)));
        }
        return where;
      },
      orderBy: [f.addressLatitude, f.addressLongitude]
    }))));

    return r.rows.map(x => {
      return {
        id: x[r.getColumnKeyInResultForIndexInSelect(0)],
        lat: +x[r.getColumnKeyInResultForIndexInSelect(1)],
        lng: +x[r.getColumnKeyInResultForIndexInSelect(2)],
        status: +x[r.getColumnKeyInResultForIndexInSelect(3)],
        courier: x[r.getColumnKeyInResultForIndexInSelect(4)],
        courierName: x[r.getColumnKeyInResultForIndexInSelect(5)]
      } as deliveryOnMap;

    }) as deliveryOnMap[];
  }
  @ServerFunction({ allowed: Roles.overview })
  static async GetLocationsForOverview(context?: Context, db?: SqlDatabase) {

    let result: deliveryOnMap[] = []
    let f = context.for(FamilyDeliveries).create();

    let sql = new SqlBuilder();
    sql.addEntity(f, "fd");


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
        this.refreshDeliveries();
        return false;
      }
    },
  };
  public chartClicked(e: any): void {
    if (e.active && e.active.length > 0) {
      this.selectedStatus = this.statuses.statuses[e.active[0]._index];
      this.refreshDeliveries();
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
interface deliveryOnMap {
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
  id: string;

}

export class statusClass {
  constructor(public name: string, public icon: string, public color: string) {

  }
  value = 0;
}

export class Statuses {
  constructor(private settings: ApplicationSettings) {
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
      case DeliveryStatus.FailedDoNotWant.id:
      case DeliveryStatus.FailedOther.id:
      case DeliveryStatus.Frozen.id:
        return this.problem;
        break;
    }
  }
  ready = new statusClass(this.settings.lang.unAsigned, '/assets/yellow2.png', colors.yellow);
  selfPickup = new statusClass(this.settings.lang.selfPickup, '/assets/orange2.png', colors.orange);
  onTheWay = new statusClass(this.settings.lang.onTheWay, '/assets/blue2.png', colors.blue);
  problem = new statusClass(this.settings.lang.problems, '/assets/red2.png', colors.red);
  success = new statusClass(this.settings.lang.delveriesSuccesfull, '/assets/green2.png', colors.green);
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
    } as deliveryOnMap;
  }) as deliveryOnMap[];
}

