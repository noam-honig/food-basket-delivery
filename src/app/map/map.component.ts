/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { DeliveryStatus } from "../families/DeliveryStatus";
import { DistributionMap } from '../distribution-map/distribution-map.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Remult } from 'remult';
import { BusyService } from '@remult/angular';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { DialogService } from '../select-popup/dialog';
import { Location } from '../shared/googleApiHelpers';
import { DistributionCenters } from '../manage/distribution-centers';
import { BasketType } from '../families/BasketType';
import { DistributionMapController } from '../distribution-map/distribution-map.controller';

//import 'googlemaps';

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy {
    loadedPotentialFamilies: string[] = [];
    async loadPotentialAsigment(city: string, group: string, distCenter: DistributionCenters, area: string, basketType: BasketType) {

        this.initMap();

        let families = await DistributionMapController.GetDeliveriesLocation(true, city, group, distCenter, area, basketType);
        for (const f of this.loadedPotentialFamilies) {
            let fi = this.dict.get(f);
            if (fi && fi.getIcon().toString().includes('yellow-dot.png')) {
                fi.setMap(null);
            }

        }
        this.loadedPotentialFamilies = [];
        let closeBusy = this.busy.showBusy();
        try {
            // console.time('load families to map');
            families.forEach(f => {
                this.loadedPotentialFamilies.push(f.id);
                let marker = this.setFamilyOnMap(f.id, f.lat, f.lng);
                this.bounds.extend(marker.getPosition());
            });
            // console.timeEnd('load families to map');
            if (!this.hasFamilies && this.helper) {
                if (this.helper.preferredDistributionAreaAddressHelper.ok)
                    this.map.setCenter(this.helper.preferredDistributionAreaAddressHelper.location)
                else if (this.helper.preferredFinishAddressHelper.ok)
                    this.map.setCenter(this.helper.preferredFinishAddressHelper.location)
                else
                    this.fitBounds();
            }
            if (this.map.getZoom() > 14)
                this.map.setZoom(14);
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
                    if (m.getMap() != null) {
                        let p1 = m.getPosition();
                        let p2 = marker.getPosition();

                        if (p1.lng() == p2.lng() && p1.lat() == p2.lat()) {
                            families.push(id);

                        }
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
    constructor(private remult: Remult, private busy: BusyService, private settings: ApplicationSettings, private dialog: DialogService) {
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
        if (!this.map)
            return;
        let x = JSON.stringify(this.bounds.toJSON());
        if (x == this.lastBounds)
            return;
        this.lastBounds = x;
        if (this.map && this.bounds.isEmpty()) {
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
    helper: Helpers;
    helperMarkers: google.maps.Marker[] = [];
    async test(families: ActiveFamilyDeliveries[], h: HelpersBase) {
        let helper = await h.getHelper();
        var prevFamilies = this.prevFamilies;
        this.prevFamilies = [...families];
        this.hasFamilies = families.length > 0;

        this.initMap();
        if (this.helper != helper) {
            for (const m of this.helperMarkers) {
                m.setMap(null);
            }
            let start: Location;
            if (families.length > 0)
                start = (await families[0].distributionCenter.getRouteStartGeo()).location();
            else if (this.dialog.distCenter)
                start = (await this.dialog.distCenter.getRouteStartGeo()).location();
            else start = this.settings.addressHelper.location;
            this.helperMarkers = [];

            this.helperMarkers.push(new google.maps.Marker({ map: this.map, position: start, icon: 'https://labs.google.com/ridefinder/images/mm_20_purple.png' }));
            this.helper = helper;
            if (helper.preferredDistributionAreaAddressHelper.ok) {
                this.helperMarkers.push(new google.maps.Marker({ map: this.map, position: helper.preferredDistributionAreaAddressHelper.location, icon: 'https://maps.google.com/mapfiles/arrow.png' }));
            }
            if (helper.preferredFinishAddressHelper.ok) {
                this.helperMarkers.push(new google.maps.Marker({ map: this.map, position: helper.preferredFinishAddressHelper.location, icon: 'https://maps.google.com/mapfiles/arrow.png' }))
            }
        }

        let i = 0;
        this.bounds = new google.maps.LatLngBounds();
        let secondaryBounds = new google.maps.LatLngBounds();
        let prevMarker: google.maps.Marker;
        let prevIndex: number;

        families.forEach(f => {
            let pi = prevFamilies.findIndex(x => x.id == f.id);
            if (pi >= 0)
                prevFamilies.splice(pi, 1);
            let marker = this.setFamilyOnMap(f.id, f.addressLatitude, f.addressLongitude);
            try {
                if (f.deliverStatus == DeliveryStatus.ReadyForDelivery)
                    this.bounds.extend(marker.getPosition());
                else
                    secondaryBounds.extend(marker.getPosition());
            } catch (err) {
                console.log(err, marker);
            }



            switch (f.deliverStatus) {
                case DeliveryStatus.ReadyForDelivery:
                    let currentIndex = ++i;
                    if (prevMarker == undefined || JSON.stringify(prevMarker.getPosition()) != JSON.stringify(marker.getPosition())) {
                        marker.setLabel({ text: (currentIndex).toString(), color: 'blue' });
                        marker.setIcon('/assets/map-markers/number.png');
                        marker.set
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
                case DeliveryStatus.FailedDoNotWant:
                case DeliveryStatus.FailedNotReady:
                case DeliveryStatus.FailedTooFar:
                case DeliveryStatus.FailedOther:
                    marker.setIcon('https://maps.google.com/mapfiles/ms/micons/red-pushpin.png');
                    break;
            }
        });
        for (const f of prevFamilies) {
            var m = this.dict.get(f.id);
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

    private initMap() {
        if (!this.mapInit) {
            if (!this.center && this.prevFamilies) {
                let bounds = new google.maps.LatLngBounds();
                for (const f of this.prevFamilies) {
                    bounds.extend(f.getDrivingLocation());
                }
                this.center = bounds.getCenter();
            }
            if (!this.center) {
                var x = this.settings.addressHelper.location;
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

