/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { DeliveryStatus } from "../families/DeliveryStatus";
import { DistributionMap, infoOnMap } from '../distribution-map/distribution-map.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Context } from '@remult/core';
import { BusyService } from '@remult/core';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import MarkerClusterer from '@google/markerclustererplus';

//import 'googlemaps';

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy {
    async loadPotentialAsigment(city: string, group: string, distCenter: string, area: string) {
        await this.initMap();
        let families = await DistributionMap.GetDeliveriesLocation(true, city, group, distCenter, area);
        let closeBusy = this.busy.showBusy();
        try {
            // console.time('load families to map');
            families.forEach(f => {
                let marker = this.setFamilyOnMap(f.id, f.lat, f.lng);
                    this.bounds.extend(marker.getPosition());
            });
            // console.timeEnd('load families to map');

            this.fitBounds();
            if (this.map.getZoom() > 13)
                this.map.setZoom(13);
        } finally {
            closeBusy();
        }

    }
    userClickedOnFamilyOnMap: (familyId: string[]) => void = () => { };
    setFamilyOnMap(familyId: string, lat: number, lng: number) {
        let marker = this.dict.get(familyId);
        if (marker && marker.getMap() == null)
            marker = undefined;
        if (!marker) {
            marker = new google.maps.Marker({ map: this.map, position: { lat: +lat, lng: +lng }, icon: 'https://maps.google.com/mapfiles/ms/micons/yellow-dot.png' })
            google.maps.event.addListener(marker, 'click', async () => {

                this.disableMapBoundsRefrest++;
                let families = [];

                this.dict.forEach((m, id) => {
                    let p1 = m.getPosition();
                    let p2 = marker.getPosition();

                    if (p1.lng() == p2.lng() && p1.lat() == p2.lat()) {
                        families.push(id);

                    }

                });
                if (families.length > 0)
                    this.userClickedOnFamilyOnMap(families);



                setTimeout(() => {
                    this.disableMapBoundsRefrest--;
                }, 10000);
            });
            this.dict.set(familyId, marker);
        }
        return marker;
    }
    dict = new Map<string, google.maps.Marker>();
    disableMapBoundsRefrest = 0;
    constructor(private context: Context, private busy: BusyService) {
        this.mediaMatcher.addListener((mql) => {
            if (mql.matches) {
                let x = this.gmapElement.nativeElement.offsetWidth;
                // console.log(this.map.getBounds(), this.bounds, x, this.gmapElement.nativeElement.offsetWidth);
                this.fitBounds();


            }
        });
    }
    ngOnDestroy(): void {
        this.clear();
    }
    private mediaMatcher: MediaQueryList = matchMedia('print');
    async ngOnInit() {

    }

    stam = '';
    center: google.maps.LatLng;

    fitBounds() {
        if (this.disableMapBoundsRefrest)
            return;
        let x = JSON.stringify(this.bounds.toJSON());
        if (x == this.lastBounds)
            return;
        this.lastBounds = x;
        if (this.map&& this.bounds.isEmpty()) {
            this.map.setCenter(this.center);
        } else {
            this.map.fitBounds(this.bounds);
        }



        setTimeout(() => {
            if (this.map.getZoom() > 17)
                this.map.setZoom(17);
        }, 300);
    }
    clear() {
        this.dict.forEach(m => {
            m.setMap(null);
        });
        this.dict.clear();

    }

    mapInit = false;
    markers: google.maps.Marker[] = [];
    hasFamilies = false;
    bounds: google.maps.LatLngBounds = new google.maps.LatLngBounds();
    lastBounds: string;
    prevFamilies: ActiveFamilyDeliveries[] = [];
    async test(families: ActiveFamilyDeliveries[]) {
        var prevFamilies = this.prevFamilies;
        this.prevFamilies = [...families];
        this.hasFamilies = families.length > 0;


        await this.initMap();

        let i = 0;
        this.bounds = new google.maps.LatLngBounds();
        let secondaryBounds = new google.maps.LatLngBounds();
        let prevMarker: google.maps.Marker;
        let prevIndex: number;
        
        families.forEach(f => {
            let pi = prevFamilies.findIndex(x => x.id.value == f.id.value);
            if (pi >= 0)
                prevFamilies.splice(pi, 1);
            let marker = this.setFamilyOnMap(f.id.value, f.addressLatitude.value, f.addressLongitude.value);
            try {
                if (f.deliverStatus.value == DeliveryStatus.ReadyForDelivery)
                    this.bounds.extend(marker.getPosition());
                else
                    secondaryBounds.extend(marker.getPosition());
            } catch (err) {
                console.log(err, marker);
            }



            switch (f.deliverStatus.value) {
                case DeliveryStatus.ReadyForDelivery:
                    let currentIndex = ++i;
                    if (prevMarker == undefined || JSON.stringify(prevMarker.getPosition()) != JSON.stringify(marker.getPosition())) {
                        marker.setLabel((currentIndex).toString());
                        marker.setIcon('/assets/map-markers/number.png');
                        prevMarker = marker;
                        prevIndex = currentIndex;
                        // console.log(i.toString() + ' ' + f.address.value);
                    }
                    else {
                        prevMarker.setLabel(prevIndex + '-' + currentIndex);
                        // console.log(prevIndex + '-' + i.toString() + ' ' + f.address.value);
                        prevMarker.setIcon('/assets/map-markers/number_long.png');
                        marker.setMap(null);
                    }

                    break;
                case DeliveryStatus.Success:
                case DeliveryStatus.SuccessLeftThere:
                case DeliveryStatus.SuccessPickedUp:
                    marker.setIcon('https://maps.google.com/mapfiles/ms/micons/green-dot.png');
                    break;
                case DeliveryStatus.FailedBadAddress:
                case DeliveryStatus.FailedNotHome:
                case DeliveryStatus.FailedOther:
                    marker.setIcon('https://maps.google.com/mapfiles/ms/micons/red-pushpin.png');
                    break;
            }
        });
        for (const f of prevFamilies) {
            var m = this.dict.get(f.id.value);
            if (m) {
                m.setIcon('https://maps.google.com/mapfiles/ms/micons/yellow-dot.png');
                m.setLabel('');
            }

        }


        if (this.bounds.isEmpty())
            this.bounds = secondaryBounds;
        if (this.map && this.bounds) {
            this.fitBounds();
        }

    }

    @ViewChild('gmap', { static: true }) gmapElement: any;
    map: google.maps.Map;

    private async initMap() {
        if (!this.mapInit) {
            if (!this.center) {
                var x = (await ApplicationSettings.get(this.context)).getGeocodeInformation().location();
                this.center = new google.maps.LatLng(x.lat, x.lng);
            }
            var mapProp: google.maps.MapOptions = {
                center: this.center,
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
            };
            this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
            this.mapInit = true;
        }
    }
}

