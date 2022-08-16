import { Remult, Entity, EntityBase, remult } from 'remult';
import { Roles } from '../auth/roles';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { Groups } from './groups';
import { Field } from '../translate';
import { GroupsStats } from './manage.component';

@Entity<GroupsStatsForAllDeliveryCenters>('GroupsStatsForAllDeliveryCenters', {
  allowApiRead: Roles.distCenterAdmin,
  defaultOrderBy: { name: "asc" },
  sqlExpression: async (self) => {
    let f = SqlFor(remult.repo(ActiveFamilyDeliveries));
    let g = SqlFor(remult.repo(Groups));

    let sql = new SqlBuilder(remult);
    sql.addEntity(f, 'Families');
    sql.addEntity(g, 'groups');
    return sql.entityDbName(
      {
        select: async () => [g.name, await sql.countInnerSelect({
          from: f,
          where: () => [
            sql.build(f.groups, ' like \'%\'||', g.name, '||\'%\''),
            f.where(FamilyDeliveries.readyFilter())
          ]
        }, self.familiesCount)],
        from: g
      });
  }
})
export class GroupsStatsForAllDeliveryCenters extends EntityBase implements GroupsStats {
  @Field()
  name: string;
  @Field()
  familiesCount: number;

  constructor(private remult: Remult) {
    super();
  }
}
