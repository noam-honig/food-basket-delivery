import { Component, OnInit, ViewChild } from '@angular/core';
import { Families, DeliveryStatus } from '../models';
import { } from '@types/googlemaps';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }
  mapVisible = false;

  mapInit = false;
  markers: google.maps.Marker[] = [];
  hasFamilies=false;
  test(families: Families[]) {
    this.hasFamilies = families.length>0;
    var mapProp: google.maps.MapOptions = {
      center: new google.maps.LatLng(32.3215, 34.8532),
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,

    };
    if (!this.mapInit) {
      this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
      this.mapInit = true;
    }
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
    families.forEach(f => {
      let marker = new google.maps.Marker({ map: this.map, position: f.getGeocodeInformation().location() });
      switch (f.deliverStatus.listValue) {
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





  }

  @ViewChild('gmap') gmapElement: any;
  map: google.maps.Map;
}
