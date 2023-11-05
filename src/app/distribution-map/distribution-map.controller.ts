import { EntityFilter, remult, SqlDatabase } from 'remult'
import { BackendMethod } from 'remult'
import { getDb, SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { colors } from '../families/stats-action'
import { YesNo } from '../families/YesNo'
import { Roles } from '../auth/roles'
import { Helpers } from '../helpers/helpers'

import {
  FamilyDeliveries,
  ActiveFamilyDeliveries
} from '../families/FamilyDeliveries'
import { getLang, Sites } from '../sites/sites'
import { DistributionCenters } from '../manage/distribution-centers'

import { ApplicationSettings } from '../manage/ApplicationSettings'
import { BasketType } from '../families/BasketType'

export class DistributionMapController {
  @BackendMethod({ allowed: Roles.distCenterAdmin })
  static async GetDeliveriesLocation(
    onlyPotentialAsignment?: boolean,
    city?: string,
    group?: string,
    distCenter?: DistributionCenters,
    area?: string,
    basket?: BasketType
  ) {
    let f = SqlFor(remult.repo(ActiveFamilyDeliveries))
    let h = SqlFor(remult.repo(Helpers))
    let sql = new SqlBuilder()
    sql.addEntity(f, 'FamilyDeliveries')
    let r = await getDb().execute(
      await sql.query({
        select: () => [
          f.id,
          f.addressLatitude,
          f.addressLongitude,
          f.deliverStatus,
          f.courier,
          sql.columnInnerSelect(f, {
            from: h,
            select: () => [h.name],
            where: () => [sql.eq(h.id, f.courier)]
          })
        ],
        from: f,

        where: () => {
          let where: EntityFilter<ActiveFamilyDeliveries>[] = [
            { distributionCenter: remult.context.filterDistCenter(distCenter) }
          ]
          if (
            area !== undefined &&
            area !== null &&
            area != getLang().allRegions
          ) {
            where.push({ area: area })
          }

          if (onlyPotentialAsignment) {
            where.push({
              ...FamilyDeliveries.readyFilter(city, group, area, basket),
              special: YesNo.No
            })
          }
          return [f.where({ $and: where })]
        },
        orderBy: [f.addressLatitude, f.addressLongitude]
      })
    )

    return r.rows.map((x) => {
      return {
        id: x[r.getColumnKeyInResultForIndexInSelect(0)],
        lat: +x[r.getColumnKeyInResultForIndexInSelect(1)],
        lng: +x[r.getColumnKeyInResultForIndexInSelect(2)],
        status: +x[r.getColumnKeyInResultForIndexInSelect(3)],
        courier: x[r.getColumnKeyInResultForIndexInSelect(4)],
        courierName: x[r.getColumnKeyInResultForIndexInSelect(5)]
      } as deliveryOnMap
    }) as deliveryOnMap[]
  }
  @BackendMethod({ allowed: Roles.overview })
  static async GetLocationsForOverview() {
    let result: deliveryOnMap[] = []
    let f = SqlFor(remult.repo(FamilyDeliveries))

    let sql = new SqlBuilder()
    sql.addEntity(f, 'fd')

    for (const org of Sites.schemas) {
      let dp = Sites.getDataProviderForOrg(org) as SqlDatabase
      result.push(
        ...mapSqlResult(
          await dp.execute(
            await sql.query({
              select: () => [
                f.id,
                f.addressLatitude,
                f.addressLongitude,
                f.deliverStatus
              ],
              from: f,
              where: () => {
                let where = [
                  f.where({
                    deliverStatus: DeliveryStatus.isSuccess(),
                    deliveryStatusDate: { '>=': new Date(2020, 2, 18) }
                  })
                ]
                return where
              }
            })
          )
        )
      )
    }
    return result
  }
}
export interface deliveryOnMap {
  id: string
  lat: number
  lng: number
  status: number
  courier: string
  courierName: string
}
export interface infoOnMap {
  marker: google.maps.Marker
  prevStatus: statusClass
  prevCourier: string
  id: string
}

export class statusClass {
  constructor(public name: string, public icon: string, public color: string) {}
  value = 0
}

export class Statuses {
  constructor(private settings: ApplicationSettings) {
    this.statuses.push(this.ready)
    if (DeliveryStatus.usingSelfPickupModule)
      this.statuses.push(this.selfPickup)
    this.statuses.push(this.onTheWay, this.success, this.problem)
  }
  getBy(statusId: number, courierId: string): statusClass {
    switch (statusId) {
      case DeliveryStatus.ReadyForDelivery.id:
      case DeliveryStatus.enquireDetails.id:
      case DeliveryStatus.waitingForAdmin.id:
      case DeliveryStatus.DriverPickedUp.id:
        if (courierId) return this.onTheWay
        else return this.ready
        break
      case DeliveryStatus.SelfPickup.id:
        return this.selfPickup
        break
      case DeliveryStatus.Success.id:
      case DeliveryStatus.SuccessLeftThere.id:
      case DeliveryStatus.SuccessPickedUp.id:
        return this.success
        break
      case DeliveryStatus.FailedBadAddress.id:
      case DeliveryStatus.FailedNotHome.id:
      case DeliveryStatus.FailedDoNotWant.id:

      case DeliveryStatus.FailedNotReady.id:
      case DeliveryStatus.FailedTooFar.id:

      case DeliveryStatus.FailedOther.id:
      case DeliveryStatus.Frozen.id:
        return this.problem
        break
    }
  }
  ready = new statusClass(
    this.settings.lang.unAsigned,
    '/assets/yellow2.png',
    colors.yellow
  )
  selfPickup = new statusClass(
    this.settings.lang.selfPickup,
    '/assets/orange2.png',
    colors.orange
  )
  onTheWay = new statusClass(
    this.settings.lang.onTheWay,
    '/assets/blue2.png',
    colors.blue
  )
  problem = new statusClass(
    this.settings.lang.problems,
    '/assets/red2.png',
    colors.red
  )
  success = new statusClass(
    this.settings.lang.delveriesSuccesfull,
    '/assets/green2.png',
    colors.green
  )
  statuses: statusClass[] = []
}

function mapSqlResult(r) {
  return r.rows.map((x) => {
    return {
      id: x[r.getColumnKeyInResultForIndexInSelect(0)],
      lat: +x[r.getColumnKeyInResultForIndexInSelect(1)],
      lng: +x[r.getColumnKeyInResultForIndexInSelect(2)],
      status: +x[r.getColumnKeyInResultForIndexInSelect(3)],
      courier: '',
      courierName: ''
    } as deliveryOnMap
  }) as deliveryOnMap[]
}
