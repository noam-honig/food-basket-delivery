import { Component, OnInit } from '@angular/core';
import { GridSettings } from '../common-ui-elements/interfaces';
import { Button } from 'protractor';
import { remult } from 'remult';
import { DialogService } from '../select-popup/dialog';
import { AdjustGeocode, GeocodeCache, GeocodeInformation, toLongLat } from '../shared/googleApiHelpers';
import { getLang } from '../sites/sites';

@Component({
  selector: 'app-adjust-geocode',
  templateUrl: './adjust-geocode.component.html',
  styleUrls: ['./adjust-geocode.component.scss']
})
export class AdjustGeocodeComponent implements OnInit {

  constructor(private ui: DialogService) { }
  grid = new GridSettings(remult.repo(GeocodeCache), {
    rowCssClass: g => !GeocodeInformation.fromString(g.googleApiResult).ok() ? 'addressProblem' : '',
    rowButtons: [{
      icon: 'edit',
      textInMenu: 'ערוך',
      showInLine: true,
      click: g => {
        new AdjustGeocode(remult).edit(this.ui, g.id, () => g._.reload())
      }

    }, {
      name: 'מפה',
      showInLine: true,
      click: g => {
        GeocodeInformation.fromString(g.googleApiResult).openGoogleMaps();
      }
    }],
    columnSettings: g => [
      g.id,
      { caption: 'עיר', getValue: g => GeocodeInformation.fromString(g.googleApiResult).getCity(), width: '100' }

    ],
    orderBy: {
      createDate: "desc"
    }
  })
  ngOnInit(): void {
  }

}
