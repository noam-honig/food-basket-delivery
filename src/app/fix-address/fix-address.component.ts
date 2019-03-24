/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild, Sanitizer, OnDestroy } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families } from '../families/families';
import { DialogService } from '../select-popup/dialog';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';

import { DomSanitizer } from '@angular/platform-browser';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { Context, DirectSQL } from '../shared/context';
import { RunOnServer } from '../auth/server-action';
import { SqlBuilder } from '../model-shared/types';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-fix-address',
  templateUrl: './fix-address.component.html',
  styleUrls: ['./fix-address.component.scss']
})
export class FixAddressComponent implements OnInit, OnDestroy {
  constructor(private context: Context, private dialog: DialogService, private selectService: SelectService) {

    let y = dialog.newsUpdate.subscribe(() => {
      this.refreshFamilies();
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
    component: FixAddressComponent,
    data: { name: 'מפת הפצה', seperator: true }, canActivate: [HolidayDeliveryAdmin]
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
  async refreshFamilies() {
    console.time('load families');
    let families = await FixAddressComponent.GetFamiliesLocations();
    console.timeEnd('load families');

    console.time('load markers');
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
          this.selectService.updateFamiliy({ f: family });


        });
      }
      if (f.status != familyOnMap.prevStatus || f.courier != familyOnMap.prevCourier) {
        switch (f.status) {
          case DeliveryStatus.ReadyForDelivery.id:
            if (f.courier)
              familyOnMap.marker.setIcon('https://maps.google.com/mapfiles/ms/micons/ltblue-dot.png');
            else
              familyOnMap.marker.setIcon('https://maps.google.com/mapfiles/ms/micons/yellow-dot.png');
            break;
          case DeliveryStatus.Success.id:
            familyOnMap.marker.setIcon('https://maps.google.com/mapfiles/ms/micons/green-dot.png');
            break;
          case DeliveryStatus.FailedBadAddress.id:
          case DeliveryStatus.FailedNotHome.id:
          case DeliveryStatus.FailedOther.id:
            familyOnMap.marker.setIcon('https://maps.google.com/mapfiles/ms/micons/red-pushpin.png');
            break;
        }
        if (!isnew)
          familyOnMap.marker.setAnimation(google.maps.Animation.DROP);
        familyOnMap.prevStatus = f.status;
        familyOnMap.prevCourier = f.courier;
      }

      this.bounds.extend(familyOnMap.marker.getPosition());

    });
    console.timeEnd('load markers');
  }
  @RunOnServer({ allowed: c => c.isAdmin() })
  static async GetFamiliesLocations(context?: Context, directSql?: DirectSQL) {
    let f = new Families(context);
    let sql = new SqlBuilder();
    let r = (await directSql.execute(sql.query({
      select: () => [f.id, f.addressLatitude, f.addressLongitude, f.deliverStatus, f.courier],
      from: f,
      where: () => {
        let where = f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id).and(f.deliverStatus.IsDifferentFrom(DeliveryStatus.Frozen.id));
        return [where];
      }
    })));

    return r.rows.map(x => {
      return {
        id: x[r.fields[0].name],
        lat: +x[r.fields[1].name],
        lng: +x[r.fields[2].name],
        status: +x[r.fields[3].name],
        courier: x[r.fields[4].name]
      } as familyQueryResult;

    }) as familyQueryResult[];
  }

  @ViewChild('gmap') gmapElement: any;
  map: google.maps.Map;
  async ngOnInit() {

    this.test();
  }



}
interface familyQueryResult {
  id: string;
  lat: number;
  lng: number;
  status: number;
  courier: string;
}
interface infoOnMap {
  marker: google.maps.Marker;
  prevStatus: number;
  prevCourier: string;

}
