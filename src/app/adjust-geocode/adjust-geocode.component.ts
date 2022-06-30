import { Component, OnInit } from '@angular/core';
import { GridSettings } from '@remult/angular/interfaces';
import { Button } from 'protractor';
import { Remult } from 'remult';
import { DialogService } from '../select-popup/dialog';
import { AdjustGeocode, GeocodeCache, GeocodeInformation, toLongLat } from '../shared/googleApiHelpers';
import { getLang } from '../sites/sites';

@Component({
  selector: 'app-adjust-geocode',
  templateUrl: './adjust-geocode.component.html',
  styleUrls: ['./adjust-geocode.component.scss']
})
export class AdjustGeocodeComponent implements OnInit {

  constructor(private remult: Remult, private ui: DialogService) { }
  grid = new GridSettings(this.remult.repo(GeocodeCache), {
    rowCssClass: g => !GeocodeInformation.fromString(g.googleApiResult).ok() ? 'addressProblem' : '',
    rowButtons: [{
      icon: 'edit',
      textInMenu: 'ערוך',
      showInLine: true,
      click: g => {
        new AdjustGeocode(this.remult).edit(this.ui, g.id, () => g._.reload())
      }

    }, {
      name: 'מפה',
      showInLine: true,
      click: g => {
        GeocodeInformation.fromString(g.googleApiResult).openGoogleMaps(this.remult);
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