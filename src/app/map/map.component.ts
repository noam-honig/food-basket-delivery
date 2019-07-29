/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild } from '@angular/core';
import { Families } from '../families/families';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { DistributionMap, infoOnMap } from '../distribution-map/distribution-map.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Context } from 'radweb';
import { BusyService } from '../select-popup/busy-service';

//import 'googlemaps';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  async loadPotentialAsigment() {
    await this.initMap();
    let families = await DistributionMap.GetFamiliesLocations(true);
    let closeBusy = this.busy.showBusy();
    try {
      console.time('load families to map');
      families.forEach(f => {
        this.setFamilyOnMap(f.id, f.lat, f.lng);

      });
      console.timeEnd('load families to map');

      
      if (this.map.getZoom() > 13)
        this.map.setZoom(13);
    } finally {
      closeBusy();
    }

  }
  userClickedOnFamilyOnMap: (familyId: string) => void = () => { };
  setFamilyOnMap(familyId: string, lat: number, lng: number) {
    let marker = this.dict.get(familyId);
    if (!marker) {
      marker = new google.maps.Marker({ map: this.map, position: { lat: +lat, lng: +lng }, icon: 'https://maps.google.com/mapfiles/ms/micons/yellow-dot.png' })
      google.maps.event.addListener(marker, 'click', async () => {

        this.disableMapBoundsRefrest++;

        this.dict.forEach((m, id) => {
          let p1 = m.getPosition();
          let p2 = marker.getPosition();

          if (p1.lng() == p2.lng() && p1.lat() == p2.lat())
            this.userClickedOnFamilyOnMap(id);
        });



        setTimeout(() => {
          this.disableMapBoundsRefrest--;
        }, 10000);
      });
      this.dict.set(familyId, marker);
    }
    return marker;
  }
  dict = new Map<string, google.maps.Marker>();
  disableMapBoundsRefrest = 0;
  constructor(private context: Context, private busy: BusyService) {
    this.mediaMatcher.addListener((mql) => {
      if (mql.matches) {
        let x = this.gmapElement.nativeElement.offsetWidth;
        // console.log(this.map.getBounds(), this.bounds, x, this.gmapElement.nativeElement.offsetWidth);
        this.fitBounds();


      }
    });
  }
  private mediaMatcher: MediaQueryList = matchMedia('print');
  async ngOnInit() {

  }

  stam = '';
  center: google.maps.LatLng;
  fitBounds() {
    if (this.disableMapBoundsRefrest)
      return;
    if (this.bounds.isEmpty()) {
      this.map.setCenter(this.center);
    } else {
      this.map.fitBounds(this.bounds);

    }

    setTimeout(() => {
      if (this.map.getZoom() > 17)
        this.map.setZoom(17);
    }, 300);
  }
  clear() {
    this.dict.forEach(m => {
      m.setMap(null);
    });
    this.dict.clear();

  }

  mapInit = false;
  markers: google.maps.Marker[] = [];
  hasFamilies = false;
  bounds: google.maps.LatLngBounds;
  prevFamilies: Families[] = [];
  async test(families: Families[]) {
    var prevFamilies = this.prevFamilies;
    this.prevFamilies = [...families];
    this.hasFamilies = families.length > 0;


    await this.initMap();

    let i = 0;
    this.bounds = new google.maps.LatLngBounds();
    let secondaryBounds = new google.maps.LatLngBounds();
    families.forEach(f => {
      let pi = prevFamilies.findIndex(x => x.id.value == f.id.value);
      if (pi >= 0)
        prevFamilies.splice(pi, 1);
      let marker = this.setFamilyOnMap(f.id.value, f.addressLatitude.value, f.addressLongitude.value);
      try {
        if (f.deliverStatus.value == DeliveryStatus.ReadyForDelivery)
          this.bounds.extend(marker.getPosition());
        else
          secondaryBounds.extend(marker.getPosition());
      } catch (err) {
        console.log(err, marker);
      }

      marker.setLabel(f.name.value + " - " + f.address.value + '....');

      switch (f.deliverStatus.value) {
        case DeliveryStatus.ReadyForDelivery:
          i++;
          marker.setIcon('/assets/map-markers/number_' + i + '.png');
          break;
        case DeliveryStatus.Success:
        case DeliveryStatus.SuccessLeftThere:
        case DeliveryStatus.SuccessPickedUp:
          marker.setIcon('https://maps.google.com/mapfiles/ms/micons/green-dot.png');
          break;
        case DeliveryStatus.FailedBadAddress:
        case DeliveryStatus.FailedNotHome:
        case DeliveryStatus.FailedOther:
          marker.setIcon('https://maps.google.com/mapfiles/ms/micons/red-pushpin.png');
          break;
      }
    });
    for (const f of prevFamilies) {
      var m = this.dict.get(f.id.value);
      if (m) {
        m.setIcon('https://maps.google.com/mapfiles/ms/micons/yellow-dot.png');
        m.setLabel('');
      }

    }


    if (this.bounds.isEmpty())
      this.bounds = secondaryBounds;
    if (this.map && this.bounds) {
      this.fitBounds();
    }

  }

  @ViewChild('gmap') gmapElement: any;
  map: google.maps.Map;

  private async initMap() {
    if (!this.mapInit) {
      if (!this.center) {
        var x = (await ApplicationSettings.get(this.context)).getGeocodeInformation().location();
        this.center = new google.maps.LatLng(x.lat, x.lng);
      }
      var mapProp: google.maps.MapOptions = {
        center: this.center,
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
      };
      this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
      this.mapInit = true;
    }
  }
}

