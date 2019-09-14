import { DeliveryStatusColumn } from "../families/DeliveryStatus";
import { changeDate, SqlBuilder } from "../model-shared/types";
import { NumberColumn, StringColumn, BoolColumn } from "radweb";
import { HelperIdReadonly, HelperId } from "../helpers/helpers";
import { Families, FamilyUpdateInfo } from "../families/families";
import { Context, Entity, ServerContext, EntityClass } from "radweb";
import { Roles } from "../auth/roles";


@EntityClass
export class NewsUpdate extends Entity<string> implements FamilyUpdateInfo {

  id = new StringColumn();
  name = new StringColumn();
  courier = new HelperId(this.context, "משנע");
  courierAssingTime = new changeDate('מועד שיוך למשנע');
  courierAssignUser = new HelperIdReadonly(this.context, 'מי שייכה למשנע');
  deliverStatus = new DeliveryStatusColumn();
  deliveryStatusDate = new changeDate('מועד סטטוס משלוח');
  deliveryStatusUser = new HelperIdReadonly(this.context, 'מי עדכן את סטטוס המשלוח');
  updateTime = new changeDate('מועד העדכון');
  updateUser = new HelperIdReadonly(this.context, 'מי עדכן');
  courierComments = new StringColumn('הערות מסירה');
  needsWork = new BoolColumn({ caption: 'צריך טיפול/מעקב' });
  updateType = new NumberColumn();
  constructor(private context: Context) {
    super({
      allowApiRead: Roles.admin,
      caption: 'חדשות',
      name: 'news',
      dbName: () => {
        let f = new Families(context);
        var sql = new SqlBuilder();
        let cols = [f.id, f.name, f.courier, f.deliverStatus, f.deliveryStatusDate, f.courierAssingTime, f.courierAssignUser, f.deliveryStatusUser, f.courierComments,f.needsWork];
        return sql.entityDbNameUnion({
          select: () => [...cols,
          sql.columnWithAlias(f.deliveryStatusDate, this.updateTime),
          sql.columnWithAlias(f.deliveryStatusUser, this.updateUser),
          sql.columnWithAlias(1, this.updateType)],
          from: f,
          where: () => [sql.notNull(f.deliveryStatusDate)]
        }, {
            select: () => [...cols,
            sql.columnWithAlias(f.courierAssingTime, this.updateTime),
            sql.columnWithAlias(f.courierAssignUser, this.updateUser),
            sql.columnWithAlias(2, this.updateType)],
            from: f,
            where: () => [sql.notNull(f.courierAssingTime)]
          })

      }
    });
  }
  describe() {
    return Families.GetUpdateMessage(this, this.updateType.value, this.courier.getValue());
  }


}