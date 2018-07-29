import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { Families, DeliveryStatus } from '../models';
import { } from '@types/googlemaps';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  constructor() {
    this.mediaMatcher.addListener((mql) => {
      if (mql.matches) {
        let x = this.gmapElement.nativeElement.offsetWidth;
        console.log(this.map.getBounds(), this.bounds, x, this.gmapElement.nativeElement.offsetWidth);
          this.fitBounds();
        

      }
    });
  }
  private mediaMatcher: MediaQueryList = matchMedia('print');
  ngOnInit() {

  }
  
  stam = '';
  center = new google.maps.LatLng(32.3215, 34.8532)
  fitBounds() {
    if (this.bounds.isEmpty()) {
      this.map.setCenter(this.center);
    } else {
      this.map.fitBounds(this.bounds);

    }
    if (this.map.getZoom() > 18)
      this.map.setZoom(18);
  }
  
  mapInit = false;
  markers: google.maps.Marker[] = [];
  hasFamilies = false;
  bounds: google.maps.LatLngBounds;
  test(families: Families[]) {
    this.hasFamilies = families.length > 0;
    var mapProp: google.maps.MapOptions = {
      center: this.center,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    };
    if (!this.mapInit) {
      this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
      this.mapInit = true;
    }
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
    let i = 0;
    this.bounds = new google.maps.LatLngBounds();
    let secondaryBounds = new google.maps.LatLngBounds();
    families.forEach(f => {
      let marker = new google.maps.Marker({
        map: this.map, position: f.getGeocodeInformation().location()
      });
      if (f.deliverStatus.listValue == DeliveryStatus.ReadyForDelivery)
        this.bounds.extend(marker.getPosition());
      else
        secondaryBounds.extend(marker.getPosition());

      marker.setLabel(f.name.value + " - " + f.address.value + '....');

      switch (f.deliverStatus.listValue) {
        case DeliveryStatus.ReadyForDelivery:
          i++;
          marker.setIcon('/assets/map-markers/number_' + i + '.png');
          break;
        case DeliveryStatus.Success:
          marker.setIcon('https://maps.google.com/mapfiles/ms/micons/green-dot.png');
          break;
        case DeliveryStatus.FailedBadAddress:
        case DeliveryStatus.FailedNotHome:
        case DeliveryStatus.FailedOther:
          marker.setIcon('https://maps.google.com/mapfiles/ms/micons/red-pushpin.png');
          break;
      }
      let info: google.maps.InfoWindow;
      this.markers.push(marker);

      google.maps.event.addListener(marker, 'click', () => {
        if (!info)
          info = new google.maps.InfoWindow({
            content: `<h4>${f.name.value}</h4>${f.address.value}`
          });
        info.open(this.map, marker);
      });
    });
    if (this.bounds.isEmpty())
      this.bounds = secondaryBounds;
    if (this.map && this.bounds ) {
      this.fitBounds();
    }

  }

  @ViewChild('gmap') gmapElement: any;
  map: google.maps.Map;
}
