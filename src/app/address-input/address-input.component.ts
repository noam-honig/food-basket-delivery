import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  NgZone,
  AfterViewInit
} from '@angular/core'
import { ErrorStateMatcher } from '@angular/material/core'
import {
  CustomComponentArgs,
  CustomDataComponent
} from '../common-ui-elements/interfaces'

import { FieldRef } from 'remult'
import { parseAddress, parseUrlInAddress } from '../families/families'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import {
  getAddress,
  Location,
  getCity,
  GeocodeResult
} from '../shared/googleApiHelpers'

@Component({
  selector: 'app-address-input',
  templateUrl: './address-input.component.html',
  styleUrls: ['./address-input.component.scss']
})
export class AddressInputComponent
  implements AfterViewInit, CustomDataComponent
{
  @Input() field: FieldRef<any, string>
  @Input() autoInit: boolean = false
  @Input() caption: string
  constructor(private settings: ApplicationSettings, private zone: NgZone) {}
  set args(value: CustomComponentArgs) {
    this.field = value.fieldRef
    this.autoInit = true
  }
  initAddressAutoComplete = false
  destroyMe: google.maps.MapsEventListener
  checkInput() {
    var x = parseUrlInAddress(this.field.value)
    if (x != this.field.value) {
      setTimeout(() => {
        this.field.value = x
      }, 50)
    }
  }

  @ViewChild('addressInput', { static: false }) addressInput: ElementRef
  initAddress(
    consumer: (x: {
      addressByGoogle: string
      location: Location
      city: string
      autoCompleteResult: GeocodeResult
    }) => void
  ) {
    if (this.initAddressAutoComplete) return
    this.initAddressAutoComplete = true
    let b = this.settings.forWho.args.bounds
    let bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(b.west, b.south),
      new google.maps.LatLng(b.east, b.north)
    )
    const autocomplete = new google.maps.places.Autocomplete(
      this.addressInput.nativeElement,
      {
        bounds: bounds,
        fields: ['address_components', 'formatted_address', 'geometry', 'type']
      }
    )
    this.destroyMe = google.maps.event.addListener(
      autocomplete,
      'place_changed',
      () => {
        const place = autocomplete.getPlace()
        if (!place) return
        console.log(place)

        this.zone.run(() => {
          this.field.value = this.addressInput.nativeElement.value
          this.field.value = getAddress({
            formatted_address: this.field.value,
            address_components: place.address_components
          })
          consumer({
            autoCompleteResult: {
              results: [
                {
                  address_components: place.address_components,
                  formatted_address: place.formatted_address,
                  partial_match: false,
                  geometry: {
                    location_type: '',
                    location: toLocation(place.geometry.location),
                    viewport: {
                      northeast: toLocation(
                        place.geometry.viewport.getNorthEast()
                      ),
                      southwest: toLocation(
                        place.geometry.viewport.getSouthWest()
                      )
                    }
                  },
                  place_id: place.place_id,
                  types: place.types
                }
              ],
              status: 'OK'
            },
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            addressByGoogle: getAddress(place),
            city: getCity(place.address_components)
          })
        })
      }
    )
  }
  getError() {
    return this.field.error
  }

  ngAfterViewInit() {
    if (this.autoInit) {
      this.initAddress((x) => {})
    }
  }
  ngOnDestroy(): void {
    if (this.destroyMe) this.destroyMe.remove()
  }
  ngErrorStateMatches = new (class extends ErrorStateMatcher {
    constructor(public parent: AddressInputComponent) {
      super()
    }
    isErrorState() {
      return !!this.parent.field.error
    }
  })(this)
}

function toLocation(l: google.maps.LatLng): Location {
  return {
    lat: l.lat(),
    lng: l.lng()
  }
}
