import { BackendMethod, EntityFilter, remult } from 'remult'
import { Filter } from 'remult'
import { Families } from './families'
import { BasketInfo } from '../asign-family/asign-family.controller'

import { Roles } from '../auth/roles'
import { Groups } from '../manage/groups'

import { FamilyStatus } from './FamilyStatus'
import { getLang } from '../sites/sites'
import { DistributionCenters } from '../manage/distribution-centers'

export interface OutArgs {
  data: any
  baskets: BasketInfo[]
}
export const colors = {
  yellow: '#FDE098', //yello
  orange: '#FAC090', //orange
  blue: '#84C5F1', //blue
  green: '#91D7D7', //green
  red: '#FD9FB3', //red
  gray: 'gray'
}
export class Stats {
  outOfList = new FaimilyStatistics(
    getLang().removedFromList,
    { status: FamilyStatus.RemovedFromList },
    colors.gray
  )
  frozen = new FaimilyStatistics(
    getLang().frozen,
    { status: FamilyStatus.Frozen },
    colors.orange
  )
  toDelete = new FaimilyStatistics(
    getLang().toDelete,
    { status: FamilyStatus.ToDelete },
    colors.red
  )
  active = new FaimilyStatistics(
    getLang().active,
    { status: FamilyStatus.Active },
    colors.green
  )
  problem = new FaimilyStatistics(
    getLang().adderssProblems,
    { status: FamilyStatus.Active, addressOk: false, defaultSelfPickup: false },
    colors.orange
  )

  async getData(distCenter: DistributionCenters) {
    let r = await Stats.getFamilyStats(distCenter?.id)
    for (let s in this) {
      let x: any = this[s]
      if (x instanceof FaimilyStatistics) {
        x.loadFrom(r.data)
      }
    }
    return r
  }
  @BackendMethod({ allowed: Roles.familyAdmin })
  static async getFamilyStats(distCenter: string) {
    let result = { data: {}, groups: [] as groupStats[] }
    let stats = new Stats()
    let pendingStats = []
    for (let s in stats) {
      let x = stats[s]
      if (x instanceof FaimilyStatistics) {
        pendingStats.push(x.saveTo(distCenter, result.data))
      }
    }

    await remult
      .repo(Groups)
      .find({
        limit: 1000,
        orderBy: { name: 'asc' }
      })
      .then((groups) => {
        for (const g of groups) {
          let x: groupStats = {
            name: g.name,
            total: 0
          }
          result.groups.push(x)
          pendingStats.push(
            remult
              .repo(Families)
              .count({
                groups: { $contains: x.name },
                status: FamilyStatus.Active
              })
              .then((r) => (x.total = r))
          )
        }
      })

    await Promise.all(pendingStats)

    return result
  }
}

export class FaimilyStatistics {
  constructor(
    public name: string,
    public rule: EntityFilter<Families>,
    public color?: string,
    value?: number
  ) {
    this.value = value
  }

  value = 0
  async saveTo(distCenter: string, data: any) {
    data[this.name] = await remult
      .repo(Families)
      .count(this.rule)
      .then((c) => (this.value = c))
  }
  async loadFrom(data: any) {
    this.value = data[this.name]
  }
}
interface groupStats {
  name: string
  total: number
}
