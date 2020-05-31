import { Component, OnInit, ViewChild } from '@angular/core';
import { Location } from '../shared/googleApiHelpers';

@Component({
  selector: 'app-show-on-map',
  templateUrl: './show-on-map.component.html',
  styleUrls: ['./show-on-map.component.scss']
})
export class ShowOnMapComponent implements OnInit {

  constructor() { }
  args: {
    location: Location
  };
  @ViewChild('gmap', { static: true }) gmapElement: any;
  map: google.maps.Map;
  ngOnInit() {

    var mapProp: google.maps.MapOptions = {
      center: this.args.location,
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    };
    this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
    var m = new google.maps.Marker({
      map: this.map,
      position: this.args.location
      
    });
  }

}
