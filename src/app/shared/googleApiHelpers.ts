import {
  UrlBuilder,
  Entity,
  FieldRef,
  EntityBase,
  Controller,
  Fields,
  BackendMethod,
  ControllerBase,
  remult
} from 'remult'
import { Field } from '../translate'

import * as geometry from 'spherical-geometry-js'

import { DialogService } from '../select-popup/dialog'
import { DateTimeColumn } from '../model-shared/types'
import { isDesktop } from './utils'
import { Roles } from '../auth/roles'
import { getLang } from '../sites/sites'
import { UITools } from '../helpers/init-context'

export class GeoCodeOptions {
  static disableGeocode = false
}

var pendingRequests = new Map<string, GeocodeResult | Promise<GeocodeResult>>()
export async function GetGeoInformation(address: string) {
  if (!address || address == '' || address.trim() == '')
    return new GeocodeInformation()
  if (GeoCodeOptions.disableGeocode) {
    return new GeocodeInformation()
  }
  address = address.trim()
  let cacheEntry = await remult
    .repo(GeocodeCache)
    .findId(address, { createIfNotFound: true })
  if (!cacheEntry.isNew()) {
    //console.log('cache:' + address);
    return new GeocodeInformation(
      JSON.parse(cacheEntry.googleApiResult) as GeocodeResult
    )
  }

  let settings = await (
    await import('../manage/ApplicationSettings')
  ).ApplicationSettings.getAsync()
  let b = settings.forWho.args.bounds
  let x = pendingRequests.get(address)
  if (!x) {
    let u = new UrlBuilder('https://maps.googleapis.com/maps/api/geocode/json')

    u.addObject({
      key: process.env.GOOGLE_GECODE_API_KEY,
      address: address,
      language: settings.lang.languageCode
      //,            components: 'country:' + settings.googleMapCountry()
    })
    if (!isGpsAddress(address)) {
      u.addObject({
        bounds: b.south + ',' + b.west + '|' + b.north + ',' + b.east
      })
    }
    try {
      if (process.env.LOG_GEOCODE) console.log(u.url)
      let r = fetch(u.url)
        .then(
          async (x) =>
            await x.json().then(async (r: GeocodeResult) => {
              cacheEntry.id = address
              cacheEntry.googleApiResult = JSON.stringify(r)
              cacheEntry.createDate = new Date()
              try {
                await cacheEntry.save()
              } catch {}
              let g = new GeocodeInformation(r as GeocodeResult)
              if (!g.ok())
                console.log('api error:' + g.info.status + ' for ' + address)
              pendingRequests.set(address, g.info)
              return g.info
            })
        )
        .catch((err) => {
          const message = err?.message.replace(
            process.env.GOOGLE_GECODE_API_KEY,
            '****'
          )
          console.error('google api error', { message })
          throw { message }
        })
      pendingRequests.set(address, r)
      return new GeocodeInformation(await r)
    } catch (err) {
      pendingRequests.delete(address)
      return new GeocodeInformation({
        results: [],
        status: (await import('../select-popup/extractError')).extractError(err)
      })
    } finally {
    }
  } else {
  }
  return new GeocodeInformation(await x)
}

@Entity('geocodeCache', {
  dbName: 'GeocodeCache',
  allowApiCrud: Roles.admin
})
export class GeocodeCache extends EntityBase {
  @Fields.string()
  id: string
  @Fields.string()
  googleApiResult: string
  @DateTimeColumn()
  createDate: Date
}

export class GeocodeInformation {
  constructor(public info: GeocodeResult = null) {
    if (!this.info) this.info = { results: [], status: 'none' }
  }
  openGoogleMaps() {
    window.open(
      'https://maps.google.com/maps?q=' +
        toLongLat(this.location()) +
        '&hl=' +
        getLang().languageCode,
      '_blank'
    )
  }
  getAddress() {
    if (!this.ok()) return 'INVALID ADDRESS'
    return getAddress(this.info.results[0])
  }
  public saveToString() {
    return JSON.stringify(this.info)
  }
  static fromString(s: string) {
    try {
      if (s && s.trim() != '') return new GeocodeInformation(JSON.parse(s))
    } catch (err) {}
    return new GeocodeInformation()
  }
  ok() {
    return this.info.status == 'OK'
  }
  partialMatch() {
    if (this.whyProblem()) return true
    return false
  }
  whyProblem() {
    if (!this.ok()) return this.info.status
    if (this.info.results.length < 1) return 'no results'
    if (
      this.info.results[0].address_components.length > 0 &&
      this.info.results[0].address_components[0].types[0] == 'street_number'
    )
      return undefined
    if (this.info.results[0].partial_match) return 'partial_match'
    if (
      this.info.results[0].types[0] != 'street_address' &&
      this.info.results[0].types[0] != 'subpremise' &&
      this.info.results[0].types[0] != 'premise' &&
      this.info.results[0].types[0] != 'route' &&
      this.info.results[0].types[0] != 'intersection' &&
      this.info.results[0].types[0] != 'establishment'
    )
      return this.info.results[0].types.join(',')
    return undefined
  }
  location(): Location {
    if (!this.ok()) return { lat: 32.0922212, lng: 34.8731951 }
    return this.info.results[0].geometry.location
  }

  getCity() {
    if (this.ok()) return getCity(this.info.results[0].address_components)
  }
}

export function getAddress(result: {
  formatted_address?: string
  address_components?: AddressComponent[]
}) {
  let r = result.formatted_address
  if (!r) return 'UNKNOWN'
  if (result.address_components)
    for (
      let index = result.address_components.length - 1;
      index >= 0;
      index--
    ) {
      const x = result.address_components[index]
      if (x.types[0] == 'country' || x.types[0] == 'postal_code') {
        let i = r.lastIndexOf(', ' + x.long_name)
        if (i > 0)
          r = r.substring(0, i) + r.substring(i + x.long_name.length + 2)
      }
      if (
        x.types[0] == 'administrative_area_level_2' &&
        x.short_name.length == 2
      ) {
        let i = r.lastIndexOf(' ' + x.short_name)
        if (i > 0)
          r = r.substring(0, i) + r.substring(i + x.long_name.length + 1)
      }
    }

  r = r.trim()
  if (r.endsWith(',')) {
    r = r.substring(0, r.length - 1)
  }
  return r
}
export function getCity(address_component: AddressComponent[]) {
  let r = undefined
  address_component.forEach((x) => {
    if (x.types[0] == 'locality') r = x.long_name
  })
  if (!r)
    address_component.forEach((x) => {
      if (x.types[0] == 'postal_town') r = x.long_name
    })
  if (!r) return 'UNKNOWN'
  return r
}
// Polygon getBounds extension - google-maps-extensions
// https://github.com/tparkin/Google-Maps-Point-in-Polygon
// http://code.google.com/p/google-maps-extensions/source/browse/google.maps.Polygon.getBounds.js

export function polygonGetBounds(thePolygon: google.maps.Polygon) {
  var bounds = new google.maps.LatLngBounds(),
    paths = thePolygon.getPaths(),
    path,
    p,
    i

  for (p = 0; p < paths.getLength(); p++) {
    path = paths.getAt(p)
    for (i = 0; i < path.getLength(); i++) {
      bounds.extend(path.getAt(i))
    }
  }

  return bounds
}

// Polygon containsLatLng - method to determine if a latLng is within a polygon
export function polygonContains(
  thePolygon: google.maps.Polygon,
  latLng: google.maps.LatLng
) {
  // Exclude points outside of bounds as there is no way they are in the poly

  var inPoly = false,
    bounds,
    lat,
    lng,
    numPaths,
    p,
    path,
    numPoints,
    i,
    j,
    vertex1,
    vertex2

  bounds = polygonGetBounds(thePolygon)

  if (!bounds && !bounds.contains(latLng)) {
    return false
  }
  lat = latLng.lat()
  lng = latLng.lng()

  // Raycast point in polygon method

  numPaths = thePolygon.getPaths().getLength()
  for (p = 0; p < numPaths; p++) {
    path = thePolygon.getPaths().getAt(p)
    numPoints = path.getLength()
    j = numPoints - 1

    for (i = 0; i < numPoints; i++) {
      vertex1 = path.getAt(i)
      vertex2 = path.getAt(j)

      if (
        (vertex1.lng() < lng && vertex2.lng() >= lng) ||
        (vertex2.lng() < lng && vertex1.lng() >= lng)
      ) {
        if (
          vertex1.lat() +
            ((lng - vertex1.lng()) / (vertex2.lng() - vertex1.lng())) *
              (vertex2.lat() - vertex1.lat()) <
          lat
        ) {
          inPoly = !inPoly
        }
      }

      j = i
    }
  }

  return inPoly
}

export interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

export interface Location {
  lat: number
  lng: number
}

export interface Viewport {
  northeast: Location
  southwest: Location
}

export interface Geometry {
  location: Location
  location_type: string
  viewport: Viewport
}

export interface Result {
  address_components: AddressComponent[]
  formatted_address: string
  geometry: Geometry
  partial_match: boolean
  place_id: string
  types: string[]
}

export interface GeocodeResult {
  results: Result[]
  status: string
}

export function toLongLat(l: Location) {
  return l.lat + ',' + l.lng
}
export function isGpsAddress(address: string) {
  if (!address) return false
  let x = leaveOnlyNumericChars(address)
  if (x == address && x.indexOf(',') > 5) return true
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
        break
      default:
        return x.substring(0, index)
    }
  }
  return x
}
export function GetDistanceBetween(a: Location, b: Location) {
  return geometry.computeDistanceBetween(a, b) / 1000
}

export class AddressHelper {
  get getAddress() {
    return this.addressColumn().value
  }
  get getCity() {
    return this.getGeocodeInformation.getCity()
  }
  get getlonglat() {
    return toLongLat(this.location)
  }

  constructor(
    private addressColumn: () => FieldRef<any, string>,
    private apiResultColumn: () => FieldRef<any, string>,
    private cityColumn: () => FieldRef<any, string> = undefined
  ) {}
  async updateApiResultIfChanged() {
    if (this.addressColumn().valueChanged() || !this.ok) {
      await this.updateApiResult()
    }
  }
  private _lastString: string
  private _lastGeo: GeocodeInformation
  async updateApiResult() {
    let geo = await GetGeoInformation(this.addressColumn().value)
    this.apiResultColumn().value = geo.saveToString()
    this.updateCityColumn(geo)
  }

  updateCityColumn(geo?: GeocodeInformation) {
    if (!geo) geo = this.getGeocodeInformation
    if (this.cityColumn) this.cityColumn().value = geo.getCity() || ''
  }

  openWaze() {
    openWaze(this.getlonglat, this.addressColumn().value)
  }

  get getGeocodeInformation() {
    if (this._lastString == this.apiResultColumn().value)
      return this._lastGeo ? this._lastGeo : new GeocodeInformation()
    this._lastString = this.apiResultColumn().value
    return (this._lastGeo = GeocodeInformation.fromString(
      this.apiResultColumn().value
    ))
  }
  get ok() {
    return this.getGeocodeInformation.ok()
  }
  get location() {
    if (isGpsAddress(this.addressColumn().value)) {
      var j = this.addressColumn().value.split(',')
      return {
        lat: +j[0],
        lng: +j[1]
      } as Location
    }
    return this.getGeocodeInformation.location()
  }
}
export async function getCurrentLocation(
  useCurrentLocation: boolean,
  dialog: DialogService
) {
  let result: Location = undefined
  if (useCurrentLocation) {
    await new Promise((res, rej) => {
      navigator.geolocation.getCurrentPosition(
        (x) => {
          result = {
            lat: x.coords.latitude,
            lng: x.coords.longitude
          }
          res({})
        },
        (error) => {
          if (this.platform.ANDROID)
            dialog.Error(`
		          יש לאפשר גישה למיקום -',
		          <a href="https://support.google.com/android/answer/3467281?hl=iw">לינק הדרכה</a>`)
          else if (this.platform.IOS)
            dialog.Error(`
		          יש לאפשר גישה למיקום -
		          <a href="https://support.apple.com/he-il/HT203033">לינק הדרכה</a>`)
          else dialog.exception('שליפת מיקום נכשלה', error)
        }
      )
    })
  }
  return result
}
export function openWaze(longLat: string, address: string) {
  if (isDesktop())
    window.open(
      'https://waze.com/ul?ll=' +
        longLat +
        '&q=' +
        encodeURI(address) +
        '&navigate=yes',
      '_blank'
    )
  else
    try {
      location.href =
        'waze://?ll=' +
        longLat +
        /*"&q=" + encodeURI(this.address) +*/ '&navigate=yes'
    } catch (err) {
      console.log(err)
    }
}

@Controller('adjust-geocode')
export class AdjustGeocode extends ControllerBase {
  @Fields.string()
  originalAddress = ''
  @Fields.string({ caption: 'עיר' })
  city = ''
  @Fields.string({ caption: 'כתובת' })
  address = ''
  @Fields.string({ caption: 'מיקום' })
  location = ''
  @BackendMethod({ allowed: Roles.admin })
  async updateGeocode() {
    const g = await remult.repo(GeocodeCache).findId(this.originalAddress)
    var geo = GeocodeInformation.fromString(g.googleApiResult)
    let r = geo.info.results[0]
    if (!r) {
      geo.info.results.push(
        (r = {
          types: [],
          address_components: [],
          formatted_address: '',
          geometry: {
            location: { lat: 0, lng: 0 },
            location_type: '',
            viewport: undefined
          },
          partial_match: false,
          place_id: ''
        })
      )
    }
    r.types[0] = 'establishment'
    r.partial_match = false
    r.formatted_address = this.address
    let sp = this.location.toString().split(',')
    r.geometry.location.lat = +sp[0]
    r.geometry.location.lng = +sp[1]

    let c = r.address_components.find(
      (x) => x.types[0] == 'locality' || x.types[0] == 'postal_town'
    )
    if (!c) {
      r.address_components.push(
        (c = {
          long_name: '',
          short_name: '',
          types: ['locality']
        })
      )
    }
    c.long_name = this.city
    geo.info.status = 'OK'
    geo.info['manual_adjustment'] = true

    g.googleApiResult = geo.saveToString()

    await g.save()

    let i = 0
    for await (const f of remult
      .repo((await import('../families/families')).Families)
      .query({ where: { address: this.originalAddress } })) {
      await f.reloadGeoCoding()
      await f.save()
      i++
    }
    for await (const f of remult
      .repo((await import('../events/events')).Event)
      .query({ where: { address: this.originalAddress } })) {
      await f.addressHelper.updateApiResult()
      await f.save()
      i++
    }
    for await (const f of remult
      .repo(
        (await import('../manage/distribution-centers')).DistributionCenters
      )
      .query({ where: { address: this.originalAddress } })) {
      await f.addressHelper.updateApiResult()
      await f.save()
      i++
    }
    for await (const f of remult
      .repo((await import('../helpers/helpers')).Helpers)
      .query({
        where: { preferredDistributionAreaAddress: this.originalAddress }
      })) {
      await f.preferredDistributionAreaAddressHelper.updateApiResult()
      await f.save()
      i++
    }
    for await (const f of remult
      .repo((await import('../helpers/helpers')).Helpers)
      .query({ where: { preferredFinishAddress: this.originalAddress } })) {
      await f.preferredFinishAddressHelper.updateApiResult()
      await f.save()
      i++
    }

    return i
  }

  async edit(ui: UITools, address: string, onSave: VoidFunction) {
    this.originalAddress = address.trim()
    const g = await remult.repo(GeocodeCache).findId(address)
    var geo = GeocodeInformation.fromString(g.googleApiResult)
    this.address = geo.getAddress()
    this.city = geo.getCity()
    this.location = toLongLat(geo.location())

    await ui.inputAreaDialog({
      buttons: [{ text: 'מפה', click: () => geo.openGoogleMaps() }],
      fields: [
        { field: this.$.originalAddress, readonly: true },
        this.$.location,
        this.$.city,
        this.$.address
      ],
      ok: async () => {
        ui.Info('עודכנו ' + (await this.updateGeocode()) + ' כתובות')
        onSave()
      },
      cancel: () => {}
    })
  }
}
export function openGoogleMaps(addressByGoogle: string) {
  window.open(
    'https://www.google.com/maps/search/?api=1&hl=' +
      getLang().languageCode +
      '&query=' +
      addressByGoogle,
    '_blank'
  )
}
