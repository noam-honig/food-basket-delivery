import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { remult, UrlBuilder } from 'remult'
import { use, ValueListFieldType } from '../translate'
import {
  Location,
  toLongLat,
  GetDistanceBetween
} from '../shared/googleApiHelpers'

import { foreachSync } from '../shared/utils'
import { Helpers } from '../helpers/helpers'
import { getLang } from '../sites/sites'

@ValueListFieldType()
export class routeStrategy {
  static endOnIsolated = new routeStrategy(
    0,
    !use ? '' : use.language.startAtDistributionCenterAndEndOnRemoteFamily,
    {
      getRouteEnd: (start, addresses) =>
        addresses[addresses.length - 1].location
    }
  )
  static endOnFar = new routeStrategy(1, !use ? '' : use.language.endOnFar, {
    getRouteEnd: (dist, addresses) => getFarthest(dist, addresses)
  })
  static circular = new routeStrategy(
    2,
    !use ? '' : use.language.circularRoute,
    {
      getRouteEnd: (x) => x,
      legsForDistance: (x) => {
        x.splice(x.length - 1, 1)
        return x
      }
    }
  )
  static endsOnDistributionCenter = new routeStrategy(
    3,
    !use ? '' : use.language.endsOnDistributionCenter,
    {
      getRouteStart: (distCenter, addresses, volunteerLocation) =>
        volunteerLocation
          ? volunteerLocation
          : getFarthest(distCenter, addresses),
      getRouteEnd: (x) => x,
      endOnDistributionCenter: true
    }
  )
  static basedOnAssignOrder = new routeStrategy(
    5,
    use.language.basedNoAssignmentOrder,
    {
      getRouteEnd: (x) => x
    }
  )
  constructor(
    public id: number,
    public caption: string,
    public args: {
      getRouteStart?: (
        distributionCenterLocation: Location,
        addresses: familiesInRoute[],
        volunteerLocation: Location
      ) => Location
      getRouteEnd: (
        distributionCenterLocation: Location,
        addresses: familiesInRoute[]
      ) => Location
      legsForDistance?: (legs: []) => []
      endOnDistributionCenter?: boolean
    }
  ) {
    if (!args.getRouteStart)
      args.getRouteStart = (x, addresses, volunteerLocation) =>
        volunteerLocation ? volunteerLocation : x
    if (!args.legsForDistance) args.legsForDistance = (x) => x
  }
}

export interface familiesInRoute {
  location: Location
  longlat: string
  families: ActiveFamilyDeliveries[]
  address: string
}
function getFarthest(fromPoint: Location, addresses: familiesInRoute[]) {
  let farthest = fromPoint
  let lastDist: number = 0
  for (const f of addresses) {
    let dist = GetDistanceBetween(fromPoint, f.location)
    if (dist > lastDist) {
      farthest = f.location
      lastDist = dist
    }
  }
  return farthest
}

export async function getRouteInfo(
  families: familiesInRoute[],
  optimize: boolean,
  startLongLat: string,
  destinationLongLat: string
) {
  if (families.length > 25) return {}
  let u = new UrlBuilder('https://maps.googleapis.com/maps/api/directions/json')

  let waypoints = 'optimize:' + (optimize ? 'true' : 'false')
  let addresses = []
  families.forEach((f) => {
    if (f.location) waypoints += '|' + toLongLat(f.location)
    addresses.push(f.address)
  })
  let args = {
    origin: startLongLat,
    destination: destinationLongLat,
    waypoints: waypoints,
    language: getLang().languageCode,
    key: process.env.GOOGLE_GECODE_API_KEY
  }
  u.addObject(args)

  let r = await (await fetch(u.url)).json()
  if (!r || r.status != 'OK') {
    let status = 'no response'
    if (r && r.status) {
      status = r.status
    }
    console.error('error in google route api', status, r, u.url)
  }
  return r
}
export async function optimizeRoute(
  helper: Helpers,
  families: ActiveFamilyDeliveries[],
  useGoogle: boolean,
  strategy: routeStrategy,
  volunteerLocation: Location
) {
  let result: {
    stats: {
      totalKm: number
      totalTime: number
    }
    ok: boolean
  } = {
    stats: {
      totalKm: 0,
      totalTime: 0
    },
    families: [],
    ok: false
  } as optimizeRouteResult
  if (families.length < 1) return result
  if (strategy == routeStrategy.basedOnAssignOrder) {
    families.sort(
      (a, b) => a.courierAssingTime.valueOf() - b.courierAssingTime.valueOf()
    )
    let i = 0
    for (const f of families) {
      i++
      f.routeOrder = i
      await f.save()
    }
    result.ok = true
    return result
  }
  var addresses: familiesInRoute[] = []
  {
    var map = new Map<string, familiesInRoute>()
    for (const f of families) {
      let location = f.getDrivingLocation()
      let longlat = toLongLat(location)
      let loc: familiesInRoute = map.get(longlat)
      if (!loc) {
        loc = {
          families: [],
          location: location,
          longlat: longlat,
          address: f.address
        }
        map.set(longlat, loc)
        addresses.push(loc)
      }
      loc.families.push(f)
    }
  }
  for (const f of addresses) {
    if (f.families.length > 0)
      f.families.sort((a, b) => {
        let ent = a.entrance.localeCompare(b.entrance)
        if (ent != 0) return ent
        if (a.floor == b.floor) {
          return +b.appartment - +a.appartment
        }
        let r = +b.floor - +a.floor
        if (r != 0) return r
        return b.floor.localeCompare(a.floor)
      })
  }
  let distCenterLocation =
    await families[0].distributionCenter.getRouteStartLocation()
  let routeStart = strategy.args.getRouteStart(
    distCenterLocation,
    addresses,
    volunteerLocation
  )

  //manual sorting of the list from closest to farthest
  {
    let temp = addresses
    let sorted = []
    let lastLoc = routeStart

    let total = temp.length
    for (let i = 0; i < total; i++) {
      let closest = temp[0]
      let closestIndex = 0
      let closestDist = GetDistanceBetween(lastLoc, closest.location)
      for (let j = 0; j < temp.length; j++) {
        let dist = GetDistanceBetween(lastLoc, temp[j].location)
        if (dist < closestDist) {
          closestDist = dist
          closestIndex = j
          closest = temp[j]
        }
      }
      lastLoc = closest.location
      sorted.push(temp.splice(closestIndex, 1)[0])
    }

    addresses = sorted
  }

  let destination = strategy.args.getRouteEnd(distCenterLocation, addresses)
  if (
    !(await remult.context.getSettings()).isSytemForMlt &&
    helper.preferredFinishAddressHelper.ok
  ) {
    destination = helper.preferredFinishAddressHelper.location
  }

  let r = await getRouteInfo(
    addresses,
    useGoogle,
    toLongLat(routeStart),
    toLongLat(destination)
  )
  if (
    r.status == 'OK' &&
    r.routes &&
    r.routes.length > 0 &&
    r.routes[0].waypoint_order
  ) {
    result.ok = true
    let i = 1

    await foreachSync(r.routes[0].waypoint_order, async (p: number) => {
      let waypoint = addresses[p]
      for (const f of waypoint.families) {
        if (f.routeOrder != i) {
          f.routeOrder = i
          await f.save()
        }
        i++
      }
    })
    var legs: any[] = strategy.args.legsForDistance(r.routes[0].legs)
    for (let i = 0; i < legs.length; i++) {
      let l = legs[i]
      result.stats.totalKm += l.distance.value
      result.stats.totalTime += l.duration.value
    }
    result.stats.totalKm = Math.round(result.stats.totalKm / 1000)
    result.stats.totalTime = Math.round(result.stats.totalTime / 60)
    helper.totalKm = result.stats.totalKm
    helper.totalTime = result.stats.totalTime
  } else {
    result.ok = true
    let i = 1
    for (const addre of addresses) {
      for (const f of addre.families) {
        f.routeOrder = i++
        if (f.$.routeOrder.valueChanged()) await f.save()
      }
    }
  }
  await helper.save()
  return result
}
export interface optimizeRouteResult {
  stats: routeStats
  families: ActiveFamilyDeliveries[]
  ok: boolean
}
export interface routeStats {
  totalKm: number
  totalTime: number
}
