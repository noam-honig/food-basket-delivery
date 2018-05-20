import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Helpers } from '../models';
import { SelectService } from '../select-popup/select-service';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';
import { } from '@types/googlemaps';

@Component({
  selector: 'app-families',
  templateUrl: './families.component.html',
  styleUrls: ['./families.component.scss']
})
export class FamiliesComponent implements OnInit {



  families = new GridSettings(new Families(), {
    allowDelete: true,
    allowUpdate: true,
    allowInsert: true,
    get: { limit: 1000 },
    columnSettings: f => [
      f.name,
      f.phone,
      f.address,
      {
        column: f.courier,
        getValue: f => f.lookup(new Helpers(), f.courier).name,
        click: f => this.dialog.showPopup(new Helpers(), s => f.courier.value = s.id.value, {
          columnSettings: h => [h.name, h.phone]
        })

      },
      {
        caption: 'ok',
        getValue: f => f.getGeocodeInformation().ok()
      }
    ]
  });
  constructor(private dialog: SelectService) { }
  test() {

    var mapProp: google.maps.MapOptions = {
      center: new google.maps.LatLng(32.3215, 34.8532),
      zoom: 2,
      mapTypeId: google.maps.MapTypeId.ROADMAP,

    };
    this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
    this.families.items.forEach(f => {
      let marker = new google.maps.Marker({ map: this.map, position: f.getGeocodeInformation().location() });
      let info = new google.maps.InfoWindow({
        content: `<h4>${f.name.value}</h4>${f.address.value}`
      });
      google.maps.event.addListener(marker,'click',()=>{
        info.open(this.map,marker);
      });
    });
    
    this.mapDivDisplay = 'box';


  }
  mapDivDisplay: string = 'none';
  @ViewChild('gmap') gmapElement: any;
  map: google.maps.Map;
  ngOnInit() {

  }
  getLocation() {
    if (this.families.currentRow) {
      try {
        return this.families.currentRow.getGeocodeInformation();
      } catch{ }
    }
    return new GeocodeInformation();
  }

}
