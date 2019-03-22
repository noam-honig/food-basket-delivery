/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild, Sanitizer } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families } from '../families/families';
import { DialogService } from '../select-popup/dialog';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';

import { DomSanitizer } from '@angular/platform-browser';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { Context } from '../shared/context';

@Component({
  selector: 'app-fix-address',
  templateUrl: './fix-address.component.html',
  styleUrls: ['./fix-address.component.scss']
})
export class FixAddressComponent implements OnInit {
  constructor(private context:Context, private san: DomSanitizer) { }
  static route:Route = {
    path: 'addresses',
    component: FixAddressComponent,
    data: { name: 'טיוב כתובות',seperator:true }, canActivate: [HolidayDeliveryAdmin]
  };

  gridView = true;

  families =this.context.for(Families).gridSettings( {
    allowUpdate: true,
    get: { limit: 1000, orderBy: f => f.name },
    hideDataArea: true,
    columnSettings: families => [

      families.name,
      families.address,
      families.city,
      families.addressByGoogle(),

    ],

    onEnterRow: f => {
      if (this.map)
        this.map.panTo(f.getGeocodeInformation().location());
    },
    rowButtons: [
      {
        name: 'עדכני',
        click: f => this.gridView = !this.gridView
      }
    ]
  });
  familiesAddress = this.families.addArea({
    numberOfColumnAreas: 2,
    columnSettings: families => [
      families.address,
      {
        caption: 'כתובת גוגל',
        getValue: f => {
          let result = '';
          let g = f.getGeocodeInformation();
          if (!g.ok())
            return '!!! NOT OK!!!';
          if (g.info.results.length != 1)
            return "more results;"
          return f.getGeocodeInformation().info.results[0].formatted_address;
        }
      },
      families.city,
      families.addressComment,
      families.floor,
      families.appartment,

    ]
  });
  
  showInfo() {
    console.log(this.getLocation());
  }
  mapVisible = false;
  mapInit = false;
  test() {

    var mapProp: google.maps.MapOptions = {
      center: new google.maps.LatLng(32.3215, 34.8532),
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,

    };
    if (!this.mapInit) {
      this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
      this.mapInit = true;
      this.families.items.forEach(f => {
        let marker = new google.maps.Marker({ map: this.map, position: f.getGeocodeInformation().location() });
        let info: google.maps.InfoWindow;
        google.maps.event.addListener(marker, 'click', () => {
          if (!info)
            info = new google.maps.InfoWindow({
              content: `<h4>${f.name.value}</h4>${f.address.value}`
            });
          info.open(this.map, marker);
        });
      });
    }
    this.mapVisible = !this.mapVisible;
    


  }
  
  @ViewChild('gmap') gmapElement: any;
  map: google.maps.Map;
  ngOnInit() {

  }
  getlonglat() {
    try {
      return this.getLocation().location().lat + ',' + this.getLocation().location().lng;
    } catch (err) {
      return '';
    }
  }
  cacheFrameSrc = new myCache();
  cacheGeoFrameSrc = new myCache();
  getFrameSrc() {

    return this.cacheFrameSrc.get("https://www.google.com/maps/embed/v1/search?key=AIzaSyDNdyWkWtBzRf8UP6MDmcIv-AqwcjuW2QY&q=" + this.families.currentRow.address.value,
      x => this.san.bypassSecurityTrustResourceUrl(x));
  }
  getGeoFrameSrc() {

    return this.cacheGeoFrameSrc.get("https://www.google.com/maps/embed/v1/search?key=AIzaSyDNdyWkWtBzRf8UP6MDmcIv-AqwcjuW2QY&q=" + this.getlonglat(), x => this.san.bypassSecurityTrustResourceUrl(x));
  }
  getLocation() {
    if (this.families.currentRow) {
      try {
        return this.families.currentRow.getGeocodeInformation();
      } catch (err) { }
    }
    return new GeocodeInformation();
  }
}
class myCache {
  private cache: any = {};
  get<key, T>(key: key, getResult: (x: key) => T) {
    let r = this.cache[key];
    if (r == undefined) {
      r = this.cache[key] = getResult(key);
    }
    return r;
  }
}