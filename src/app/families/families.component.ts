import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Helpers } from '../models';
import { SelectService } from '../select-popup/select-service';
import { GeocodeInformation, GetGeoInformation } from '../shared/googleApiHelpers';

@Component({
  selector: 'app-families',
  templateUrl: './families.component.html',
  styleUrls: ['./families.component.scss']
})
export class FamiliesComponent implements OnInit {

  lat: number = 32.3215;
  lng: number = 34.8532;


  families = new GridSettings(new Families(), {
    allowDelete: true,
    allowUpdate: true,
    allowInsert: true,
    get:{limit:1000},
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
        caption:'ok',
        getValue:f=>f.getGeocodeInformation().ok()
      }
    ]
  });
  constructor(private dialog: SelectService) { }
test(){
  console.log(this.getLocation());
  console.log(this.getLocation())
}
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
