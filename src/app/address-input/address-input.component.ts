import { Component, OnInit, Input, ElementRef, ViewChild, NgZone, AfterViewInit } from '@angular/core';
import { ErrorStateMatcher } from '@angular/material/core';

import { Column } from '@remult/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { getAddress, Location, getCity, GeocodeInformation, GeocodeResult } from '../shared/googleApiHelpers';

@Component({
  selector: 'app-address-input',
  templateUrl: './address-input.component.html',
  styleUrls: ['./address-input.component.scss']
})
export class AddressInputComponent implements AfterViewInit {

  @Input() column: Column;
  @Input() autoInit: boolean = false;
  constructor(private settings: ApplicationSettings, private zone: NgZone) { }
  initAddressAutoComplete = false;
  destroyMe: google.maps.MapsEventListener;
  @ViewChild('addressInput', { static: false }) addressInput: ElementRef;
  initAddress(consumer: (x: {
    addressByGoogle: string,
    location: Location,
    city: string,
    autoCompleteResult: GeocodeResult
  }) => void) {
    if (this.initAddressAutoComplete)
      return;
    this.initAddressAutoComplete = true;
    let b = this.settings.forWho.value.args.bounds;
    let bounds = new google.maps.LatLngBounds(new google.maps.LatLng(b.west, b.south), new google.maps.LatLng(b.east, b.north));
    const autocomplete = new google.maps.places.SearchBox(this.addressInput.nativeElement, { bounds: bounds }
    );
    this.destroyMe = google.maps.event.addListener(autocomplete, 'places_changed', () => {
      if (autocomplete.getPlaces().length == 0)
        return;
      const place = autocomplete.getPlaces()[0];

      
      this.zone.run(() => {
        this.column.value = this.addressInput.nativeElement.value;
        this.column.value = getAddress({
          formatted_address: this.column.value,
          address_components: place.address_components
        });
        consumer({
          autoCompleteResult: {
            results: [{
              address_components: place.address_components,
              formatted_address: place.formatted_address,
              partial_match: false,
              geometry: {
                location_type: '',
                location: toLocation(place.geometry.location),
                viewport: {
                  northeast: toLocation(place.geometry.viewport.getNorthEast()),
                  southwest: toLocation(place.geometry.viewport.getSouthWest())
                }
              },
              place_id: place.place_id,
              types: place.types
            }],
            status: "OK"
          },
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          addressByGoogle: getAddress(place),
          city: getCity(place.address_components)
        });
      });

    });

  }
  getError(){
    return this.column.validationError;
  }

  ngAfterViewInit() {
    if (this.autoInit) {
      this.initAddress(x => { });
    }
  }
  ngOnDestroy(): void {
    if (this.destroyMe)
      this.destroyMe.remove();

  }
  ngErrorStateMatches = new class extends ErrorStateMatcher {
    constructor(public parent: AddressInputComponent) {
      super();
    }
    isErrorState() {
      return !!this.parent.column.validationError;
    }
  }(this);

}

function toLocation(l: google.maps.LatLng): Location {
  return {
    lat: l.lat(),
    lng: l.lng()
  }
}
