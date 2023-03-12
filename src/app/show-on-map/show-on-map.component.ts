import { Component, OnInit, ViewChild } from '@angular/core'
import { Location } from '../shared/googleApiHelpers'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { MatDialogRef } from '@angular/material/dialog'

@Component({
  selector: 'app-show-on-map',
  templateUrl: './show-on-map.component.html',
  styleUrls: ['./show-on-map.component.scss']
})
export class ShowOnMapComponent implements OnInit {
  constructor(
    public settings: ApplicationSettings,
    private ref: MatDialogRef<any>
  ) {}
  args: {
    location: Location
    save: (location: Location) => void
  }
  @ViewChild('gmap', { static: true }) gmapElement: any
  map: google.maps.Map
  marker: google.maps.Marker
  markOnMap = false
  selected: Location
  ngOnInit() {
    var mapProp: google.maps.MapOptions = {
      center: this.args.location,
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp)

    var m = new google.maps.Marker({
      map: this.map,
      position: this.args.location
    })

    this.map.addListener('click', (e) => {
      if (this.markOnMap) {
        if (!this.marker) {
          this.marker = new google.maps.Marker({
            map: this.map,
            position: e.latLng,
            icon: 'https://maps.google.com/mapfiles/ms/micons/grn-pushpin.png'
          })
        }
        this.marker.setPosition(e.latLng)
        this.selected = e.latLng.toJSON()
      }
    })
  }
  save() {
    this.args.save(this.selected)
    this.ref.close()
  }
}
