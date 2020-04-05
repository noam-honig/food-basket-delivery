import { DeliveryStatusColumn } from "../families/DeliveryStatus";
import { changeDate, SqlBuilder } from "../model-shared/types";
import { NumberColumn, StringColumn, BoolColumn } from '@remult/core';
import { HelperIdReadonly, HelperId } from "../helpers/helpers";
import { Families, FamilyUpdateInfo } from "../families/families";
import { Context, Entity, ServerContext, EntityClass } from '@remult/core';
import { Roles } from "../auth/roles";
import { FamilySourceId } from "../families/FamilySources";
import { DistributionCenterId } from "../manage/distribution-centers";


@EntityClass
export class NewsUpdate extends Entity<string> implements FamilyUpdateInfo {

  id = new StringColumn();
  name = new StringColumn();
  distributionCenter = new DistributionCenterId(this.context);
  courier = new HelperId(this.context, () => this.distributionCenter.value, "משנע");
  courierAssingTime = new changeDate('מועד שיוך למשנע');
  courierAssignUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, 'מי שייכה למשנע');
  deliverStatus = new DeliveryStatusColumn();
  deliveryStatusDate = new changeDate('מועד סטטוס משלוח');
  deliveryStatusUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, 'מי עדכן את סטטוס המשלוח');
  updateTime = new changeDate('מועד העדכון');
  updateUser = new HelperIdReadonly(this.context, () => this.distributionCenter.value, 'מי עדכן');
  courierComments = new StringColumn('הערות מסירה');
  needsWork = new BoolColumn({ caption: 'צריך טיפול/מעקב' });
  familySource = new FamilySourceId(this.context, { caption: 'גורם מפנה' });
  updateType = new NumberColumn();
  constructor(private context: Context) {
    super({
      allowApiRead: Roles.admin,
      caption: 'חדשות',
      name: 'news',
      dbName: () => {
        let f = context.for(Families).create();
        var sql = new SqlBuilder();
        let cols = [f.id, f.name, f.courier, f.deliverStatus, f.deliveryStatusDate, f.courierAssingTime, f.courierAssignUser, f.deliveryStatusUser, f.courierComments, f.needsWork, f.familySource];
        return sql.entityDbNameUnion({
          select: () => [...cols,
          sql.columnWithAlias(f.deliveryStatusDate, this.updateTime),
          sql.columnWithAlias(f.deliveryStatusUser, this.updateUser),
          sql.columnWithAlias(f.distributionCenter,this.distributionCenter),
          sql.columnWithAlias(1, this.updateType)],
          from: f,
          where: () => [sql.notNull(f.deliveryStatusDate)]
        }, {
          select: () => [...cols,
          sql.columnWithAlias(f.courierAssingTime, this.updateTime),
          sql.columnWithAlias(f.courierAssignUser, this.updateUser),
          sql.columnWithAlias(f.distributionCenter,this.distributionCenter),
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