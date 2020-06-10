import * as fetch from 'node-fetch';
import { UrlBuilder, EntityClass, IdEntity, StringColumn, Entity, DateTimeColumn, Context } from '@remult/core';
import { extractError } from '../select-popup/dialog';
import { getLang } from '../translate';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { getRtlScrollAxisType } from '@angular/cdk/platform';



export class GeoCodeOptions {
    static disableGeocode = false;
}

var pendingRequests = new Map<string, Promise<GeocodeInformation>>();
export async function GetGeoInformation(address: string, context: Context) {

    if (!address || address == '' || address.trim() == '')
        return new GeocodeInformation();
    if (GeoCodeOptions.disableGeocode) {
        return new GeocodeInformation();
    }
    address = address.trim();
    let cacheEntry = await context.for(GeocodeCache).lookupAsync(x => x.id.isEqualTo(address));
    if (!cacheEntry.isNew()) {
        //console.log('cache:' + address);
        return new GeocodeInformation(JSON.parse(cacheEntry.googleApiResult.value) as GeocodeResult);
    }
    let settings = await ApplicationSettings.getAsync(context);
    let x = pendingRequests.get(address);
    if (!x) {
        let u = new UrlBuilder('https://maps.googleapis.com/maps/api/geocode/json');
        
        
        u.addObject({
            key: process.env.GOOGLE_GECODE_API_KEY,
            address: address,
            language: settings.lang.languageCode
            //,            components: 'country:' + settings.googleMapCountry()
            // bounds:'32.196323,34.653055|32.354234,35.139650'
        });
        try {
            // console.log(u.url);
            let r = fetch.default(u.url).then(async x => await x.json().then(async (r: GeocodeResult) => {

                
                cacheEntry.id.value = address;
                cacheEntry.googleApiResult.value = JSON.stringify(r);
                cacheEntry.createDate.value = new Date();
                try {
                    await cacheEntry.save();
                } catch{
                    
                }
                let g = new GeocodeInformation(r as GeocodeResult);
                if (!g.ok())
                    console.log('api error:' + g.info.status + ' for ' + address);
                return g;

            }));
            pendingRequests.set(address, r);
            return await r;

        }
        catch (err) {
            return new GeocodeInformation({ results: [], status: extractError(err) });

        }
        finally {
        }
    }
    else {
        
    }
    return await x;




}


@EntityClass
export class GeocodeCache extends Entity<string> {
    id = new StringColumn();
    googleApiResult = new StringColumn();
    createDate = new DateTimeColumn();
    constructor() {
        super({
            name: "GeocodeCache",
            allowApiRead: false,
            allowApiCRUD: false
        });
    }
}


export class GeocodeInformation {
    constructor(public info: GeocodeResult = null) {
        if (!this.info)
            this.info = { results: [], status: 'none' };
    }
    getAddress() {
        if (!this.ok())
            return 'INVALID ADDRESS';
        return getAddress(this.info.results[0]);

    }
    public saveToString() {
        return JSON.stringify(this.info);
    }
    static fromString(s: string) {
        try {
            if (s && s.trim() != "")
                return new GeocodeInformation(JSON.parse(s));
        }
        catch (err) {
        }
        return new GeocodeInformation();
    }
    ok() {
        return this.info.status == "OK";
    }
    partialMatch() {
        if (this.whyProblem())
            return true;
        return false;
    }
    whyProblem() {
        if (!this.ok())
            return this.info.status;
        if (this.info.results.length < 1)
            return "no results";
        if (this.info.results[0].address_components.length > 0 && this.info.results[0].address_components[0].types[0] == "street_number")
            return undefined;
        if (this.info.results[0].partial_match)
            return "partial_match";
        if (this.info.results[0].types[0] != "street_address"
            && this.info.results[0].types[0] != "subpremise"
            && this.info.results[0].types[0] != "premise"
            && this.info.results[0].types[0] != "route"
            && this.info.results[0].types[0] != "intersection"
            && this.info.results[0].types[0] != "establishment")
            return this.info.results[0].types.join(',');
        return undefined;
    }
    location(): Location {
        if (!this.ok())
            return { lat: 32.0922212, lng: 34.8731951 };
        return this.info.results[0].geometry.location;
    }
    getlonglat() {
        return toLongLat(this.location());
    }
    getCity() {
        if (this.ok())
            return getCity(this.info.results[0].address_components);
    }
    static GetDistanceBetweenPoints(x: Location, center: Location) {
        return Math.abs(((x.lat - center.lat) * (x.lat - center.lat)) + Math.abs((x.lng - center.lng) * (x.lng - center.lng))) * 10000000
    }
}

export function getAddress(result: { formatted_address?: string, address_components?: AddressComponent[] }) {
    let r = result.formatted_address;
    if (!r)
        return "UNKNOWN";
    if (result.address_components)
        for (let index = result.address_components.length - 1; index >= 0; index--) {
            const x = result.address_components[index];
            if (x.types[0] == "country" || x.types[0] == "postal_code") {
                let i = r.lastIndexOf(', ' + x.long_name);
                if (i > 0)
                    r = r.substring(0, i) + r.substring(i + x.long_name.length + 2);
            }
            if (x.types[0] == "administrative_area_level_2" && x.short_name.length == 2) {
                let i = r.lastIndexOf(' ' + x.short_name);
                if (i > 0)
                    r = r.substring(0, i) + r.substring(i + x.long_name.length + 1);

            }
        };

    r = r.trim();
    if (r.endsWith(',')) {
        r = r.substring(0, r.length - 1);
    }
    return r;
}
export function getCity(address_component: AddressComponent[]) {
    let r = 'UNKNOWN';
    address_component.forEach(x => {
        if (x.types[0] == "locality")
            r = x.long_name;
    });
    return r;
}
// Polygon getBounds extension - google-maps-extensions
// https://github.com/tparkin/Google-Maps-Point-in-Polygon
// http://code.google.com/p/google-maps-extensions/source/browse/google.maps.Polygon.getBounds.js

export function polygonGetBounds(thePolygon: google.maps.Polygon) {
    var bounds = new google.maps.LatLngBounds(),
        paths = thePolygon.getPaths(),
        path,
        p, i;

    for (p = 0; p < paths.getLength(); p++) {
        path = paths.getAt(p);
        for (i = 0; i < path.getLength(); i++) {
            bounds.extend(path.getAt(i));
        }
    }

    return bounds;
};


// Polygon containsLatLng - method to determine if a latLng is within a polygon
export function polygonContains(thePolygon: google.maps.Polygon, latLng: google.maps.LatLng) {
    // Exclude points outside of bounds as there is no way they are in the poly

    var inPoly = false,
        bounds, lat, lng,
        numPaths, p, path, numPoints,
        i, j, vertex1, vertex2;


    bounds = polygonGetBounds(thePolygon);

    if (!bounds && !bounds.contains(latLng)) {
        return false;
    }
    lat = latLng.lat();
    lng = latLng.lng();


    // Raycast point in polygon method

    numPaths = thePolygon.getPaths().getLength();
    for (p = 0; p < numPaths; p++) {
        path = thePolygon.getPaths().getAt(p);
        numPoints = path.getLength();
        j = numPoints - 1;

        for (i = 0; i < numPoints; i++) {
            vertex1 = path.getAt(i);
            vertex2 = path.getAt(j);

            if (
                vertex1.lng() < lng &&
                vertex2.lng() >= lng ||
                vertex2.lng() < lng &&
                vertex1.lng() >= lng
            ) {
                if (
                    vertex1.lat() +
                    (lng - vertex1.lng()) /
                    (vertex2.lng() - vertex1.lng()) *
                    (vertex2.lat() - vertex1.lat()) <
                    lat
                ) {
                    inPoly = !inPoly;
                }
            }

            j = i;
        }
    }

    return inPoly;
};

export interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

export interface Location {
    lat: number;
    lng: number;
}



export interface Viewport {
    northeast: Location;
    southwest: Location;
}

export interface Geometry {
    location: Location;
    location_type: string;
    viewport: Viewport;
}

export interface Result {
    address_components: AddressComponent[];
    formatted_address: string;
    geometry: Geometry;
    partial_match: boolean;
    place_id: string;
    types: string[];
}

export interface GeocodeResult {
    results: Result[];
    status: string;
}

export function toLongLat(l: Location) {
    return l.lat + ',' + l.lng;
}
export function isGpsAddress(address: string) {
    if (!address)
        return false;
    let x = leaveOnlyNumericChars(address);
    if (x == address && x.indexOf(',') > 5)
        return true;
}
export function leaveOnlyNumericChars(x: string) {
    for (let index = 0; index < x.length; index++) {
        switch (x[index]) {
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '0':
            case '.':
            case ',':
            case ' ':
                break;
            default:
                return x.substring(0, index);
        }
    }
    return x;
}