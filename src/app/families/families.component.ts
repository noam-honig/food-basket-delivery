import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Helpers, CallStatus, BasketType, FamilySources } from '../models';
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
    get: { limit: 1000 ,orderBy:f=>f.name},
    hideDataArea: true,
    columnSettings: families => [

      families.name,
      families.familyMembers,
      {
        column: families.language,
        dropDown: {
          items: families.language.getOptions()
        }
      },
      {
        column: families.basketType,
        dropDown: { source: new BasketType() }
      },
      {
        column: families.familySource,
        dropDown:{source:new FamilySources()}
      },
      families.internalComment,
      families.address,
      families.floor,
      families.appartment,
      families.addressComment,
      
      families.phone1,
      families.phone1Description,
      families.phone2,
      families.phone2Description,

      {
        column: families.callStatus,
        dropDown: {
          items: families.callStatus.getOptions()
        }
      },
      families.callTime,
      families.callHelper,
      families.callComments,
      {
        column: families.courier,
        getValue: f => f.courier.lookup(new Helpers()).name,
        hideDataOnInput: true,
        click: f => this.dialog.showPopup(new Helpers(), s => f.courier.value = s.id.value, {
          columnSettings: h => [h.name, h.phone]
        })

      },
      families.courierAssingTime,
      families.courierAssignUser,

      {
        column: families.deliverStatus,
        dropDown: {
          items: families.deliverStatus.getOptions()
        }
      },
      families.deliveryStatusDate,
      families.deliveryStatusUser,
      families.deliveryComments,
      families.createDate,
      families.createUser
    ],
    /*  columnSettings: f => [
        f.name,
        f.phone1,
        f.address,
        
      
      ],*/
    onEnterRow: f => {
      if (this.map)
        this.map.panTo(f.getGeocodeInformation().location());
    }
  });
  constructor(private dialog: SelectService) { }
  showInfo() {
    console.log(this.getLocation());
  }
  test() {

    var mapProp: google.maps.MapOptions = {
      center: new google.maps.LatLng(32.3215, 34.8532),
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,

    };
    this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
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
