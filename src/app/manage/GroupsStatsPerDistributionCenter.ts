import { Entity, EntityBase, remult } from 'remult'
import { Roles } from '../auth/roles'
import { SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { DistributionCenters } from './distribution-centers'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { Groups } from './groups'
import { Field, Fields } from '../translate'
import { GroupsStats } from './manage.component'

@Entity<GroupsStatsPerDistributionCenter>('GroupsStatsPerDistributionCenter', {
  allowApiRead: Roles.distCenterAdmin,
  defaultOrderBy: { name: 'asc' },
  sqlExpression: async (meta) => {
    let self = SqlFor(meta)
    let f = SqlFor(remult.repo(ActiveFamilyDeliveries))
    let g = SqlFor(remult.repo(Groups))
    let d = SqlFor(remult.repo(DistributionCenters))
    let sql = new SqlBuilder()
    sql.addEntity(f, 'Families')
    sql.addEntity(g, 'groups')
    return sql.entityDbName({
      select: () => [
        g.name,
        sql.columnWithAlias(d.id, self.distCenter),
        sql.countInnerSelect(
          {
            from: f,

            where: () => [
              sql.build(f.groups, " like '%'||", g.name, "||'%'"),
              f.where(FamilyDeliveries.readyFilter()),
              sql.eq(f.distributionCenter, d.id)
            ]
          },
          self.familiesCount
        )
      ],
      from: g,
      crossJoin: () => [d]
    })
  }
})
export class GroupsStatsPerDistributionCenter
  extends EntityBase
  implements GroupsStats
{
  @Fields.string()
  name: string
  @Field(() => DistributionCenters)
  distCenter: DistributionCenters
  @Fields.number()
  familiesCount: number
}
