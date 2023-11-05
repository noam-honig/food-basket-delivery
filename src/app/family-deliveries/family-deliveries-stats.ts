import {
  BackendMethod,
  Entity,
  SqlDatabase,
  EntityBase,
  EntityFilter,
  remult
} from 'remult'
import { Roles } from '../auth/roles'
import { YesNo } from '../families/YesNo'
import { BasketType } from '../families/BasketType'
import {
  FamilyDeliveries,
  ActiveFamilyDeliveries,
  MessageStatus
} from '../families/FamilyDeliveries'

import { getDb, SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { DistributionCenters } from '../manage/distribution-centers'

import { colors } from '../families/stats-action'
import { getLang } from '../sites/sites'
import { Field } from '../translate'

export class FamilyDeliveryStats {
  enquireDetails = new FamilyDeliveresStatistics(
    getLang().enquireDetails,
    { deliverStatus: DeliveryStatus.enquireDetails },
    colors.orange
  )
  waitForAdmin = new FamilyDeliveresStatistics(
    getLang().waitingForAdmin,
    { deliverStatus: DeliveryStatus.waitingForAdmin },
    colors.orange
  )
  ready = new FamilyDeliveresStatistics(
    getLang().unAsigned,
    {
      special: { '!=': YesNo.Yes },
      $and: [FamilyDeliveries.readyFilter()]
    },
    colors.yellow
  )
  selfPickup = new FamilyDeliveresStatistics(
    getLang().selfPickup,
    { deliverStatus: DeliveryStatus.SelfPickup },
    colors.orange
  )
  special = new FamilyDeliveresStatistics(
    getLang().specialUnasigned,
    {
      special: YesNo.Yes,
      $and: [FamilyDeliveries.readyFilter()]
    },
    colors.orange
  )
  driverPickedUp = new FamilyDeliveresStatistics(
    'נאסף על ידי הנהג',
    { deliverStatus: DeliveryStatus.DriverPickedUp },
    colors.blue
  )
  onTheWay = new FamilyDeliveresStatistics(
    getLang().onTheWay,
    FamilyDeliveries.onTheWayFilter(),
    colors.blue
  )
  delivered = new FamilyDeliveresStatistics(
    getLang().delveriesSuccesfull,
    { deliverStatus: DeliveryStatus.isSuccess() },
    colors.green
  )
  problem = new FamilyDeliveresStatistics(
    getLang().problems,
    { deliverStatus: DeliveryStatus.isProblem() },
    colors.red
  )
  frozen = new FamilyDeliveresStatistics(
    getLang().frozens,
    { deliverStatus: DeliveryStatus.Frozen },
    colors.gray
  )
  needWork = new FamilyDeliveresStatistics(
    getLang().requireFollowUp,
    { needsWork: true },
    colors.yellow
  )

  async getData(distCenter: DistributionCenters) {
    let r = await FamilyDeliveryStats.getFamilyDeliveryStatsFromServer(
      distCenter
    )
    for (let s in this) {
      let x: any = this[s]
      if (x instanceof FamilyDeliveresStatistics) {
        x.loadFrom(r.data)
      }
    }
    await Promise.all(
      r.baskets.map(async (b) => {
        b.basket = await remult.repo(BasketType).findId(b.id)
      })
    )
    return r
  }
  @BackendMethod({ allowed: Roles.distCenterAdmin })
  static async getFamilyDeliveryStatsFromServer(
    distCenter: DistributionCenters
  ) {
    let result = {
      data: {},
      baskets: [] as {
        id: string
        basket: BasketType
        name: string
        boxes: number
        boxes2: number
        unassignedDeliveries: number
        inEventDeliveries: number
        successDeliveries: number
        smsNotSent: number

        selfPickup: number
      }[],
      cities: []
    }
    let stats = new FamilyDeliveryStats()
    let pendingStats = []
    for (let s in stats) {
      let x = stats[s]
      if (x instanceof FamilyDeliveresStatistics) {
        pendingStats.push(x.saveTo(distCenter, result.data))
      }
    }

    let f = SqlFor(remult.repo(ActiveFamilyDeliveries))

    let sql = new SqlBuilder()
    sql.addEntity(f, 'FamilyDeliveries')
    let baskets = await getDb().execute(
      await sql.build(
        sql.query({
          select: () => [
            f.basketType,
            sql.build(
              'sum (',
              sql.case(
                [
                  {
                    when: [f.where(FamilyDeliveries.readyAndSelfPickup())],
                    then: f.quantity
                  }
                ],
                0
              ),
              ') a'
            ),
            sql.build('sum (', f.quantity, ') b'),
            sql.build(
              'sum (',
              sql.case(
                [
                  {
                    when: [
                      f.where({ deliverStatus: DeliveryStatus.isSuccess() })
                    ],
                    then: f.quantity
                  }
                ],
                0
              ),
              ') c'
            ),
            sql.build(
              'sum (',
              sql.case(
                [
                  {
                    when: [
                      f.where({ deliverStatus: DeliveryStatus.SelfPickup })
                    ],
                    then: f.quantity
                  }
                ],
                0
              ),
              ') d'
            ),
            sql.build(
              'sum (',
              sql.case(
                [
                  {
                    when: [
                      f.where({
                        messageStatus: MessageStatus.notSent,
                        $and: [FamilyDeliveries.onTheWayFilter()]
                      })
                    ],
                    then: f.quantity
                  }
                ],
                0
              ),
              ') e'
            )
          ],
          from: f,
          where: () => [
            f.where({
              distributionCenter: remult.context.filterDistCenter(distCenter)
            })
          ]
        }),
        ' group by ',
        f.basketType
      )
    )
    for (const r of baskets.rows) {
      let basketId = r[baskets.getColumnKeyInResultForIndexInSelect(0)]
      let b = await remult
        .repo(BasketType)
        .findId(basketId, { createIfNotFound: true })
      result.baskets.push({
        id: basketId,
        name: b.name,
        boxes: b.boxes,
        boxes2: b.boxes2,
        unassignedDeliveries: +r['a'],
        inEventDeliveries: +r['b'],
        successDeliveries: +r['c'],
        selfPickup: +r['d'],
        smsNotSent: +r['e'],
        basket: undefined
      })
    }

    if (distCenter == null)
      pendingStats.push(
        remult
          .repo(CitiesStats)
          .find({
            orderBy: { deliveries: 'desc' }
          })
          .then((cities) => {
            result.cities = cities.map((x) => {
              return {
                name: x.city,
                count: x.deliveries
              }
            })
          })
      )
    else
      pendingStats.push(
        remult
          .repo(CitiesStatsPerDistCenter)
          .find({
            orderBy: { families: 'desc' },
            where: {
              distributionCenter: remult.context.filterDistCenter(distCenter)
            }
          })
          .then((cities) => {
            result.cities = cities.map((x) => {
              return {
                name: x.city,
                count: x.families
              }
            })
          })
      )

    await Promise.all(pendingStats)

    return result
  }
}

export class FamilyDeliveresStatistics {
  constructor(
    public name: string,
    public rule: EntityFilter<ActiveFamilyDeliveries>,
    public color?: string,
    value?: number
  ) {
    this.value = value
  }

  value = 0
  async saveTo(distCenter: DistributionCenters, data: any) {
    try {
      data[this.name] = await remult
        .repo(ActiveFamilyDeliveries)
        .count({
          distributionCenter: remult.context.filterDistCenter(distCenter),
          $and: [this.rule]
        })
        .then((c) => (this.value = c))
    } catch (err) {
      console.error(this.name, err)
    }
  }
  async loadFrom(data: any) {
    this.value = data[this.name]
  }
}
export interface groupStats {
  name: string
  totalReady: number
}

@Entity<CitiesStats>(undefined, {
  sqlExpression: async (meta) => {
    const self = SqlFor(meta)
    let f = SqlFor(remult.repo(ActiveFamilyDeliveries))
    let sql = new SqlBuilder()

    return sql.build(
      '(',
      (
        await sql.query({
          select: () => [
            f.city,
            sql.columnWithAlias('count(*)', self.deliveries)
          ],
          from: f,
          where: () => [
            f.where({
              deliverStatus: DeliveryStatus.ReadyForDelivery,
              distributionCenter: remult.context.filterCenterAllowedForUser()
            }),
            sql.eq(f.courier, "''")
          ]
        })
      ).replace('as result', 'as '),
      ' group by ',
      f.city,
      ') as result'
    )
  }
})
export class CitiesStats {
  @Field()
  city: string
  @Field()
  deliveries: number
}
@Entity<CitiesStatsPerDistCenter>('citiesStatsPerDistCenter', {
  allowApiRead: false,
  sqlExpression: async (meta) => {
    const self = SqlFor(meta)
    let f = SqlFor(remult.repo(ActiveFamilyDeliveries))
    let sql = new SqlBuilder()

    return sql.build(
      '(',
      (
        await sql.query({
          select: () => [
            f.city,
            f.distributionCenter,
            sql.columnWithAlias('count(*)', self.families)
          ],
          from: f,
          where: () => [
            f.where({
              deliverStatus: DeliveryStatus.ReadyForDelivery,
              distributionCenter: remult.context.filterCenterAllowedForUser()
            }),
            sql.eq(f.courier, "''")
          ]
        })
      ).replace('as result', 'as '),
      ' group by ',
      [f.city, f.distributionCenter],
      ') as result'
    )
  }
})
export class CitiesStatsPerDistCenter extends EntityBase {
  @Field()
  city: string
  @Field()
  distributionCenter: DistributionCenters
  @Field()
  families: number
}
