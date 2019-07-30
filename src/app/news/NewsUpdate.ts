import { DeliveryStatusColumn } from "../families/DeliveryStatus";
import { changeDate,  SqlBuilder } from "../model-shared/types";
import { NumberColumn, StringColumn } from "radweb";
import { HelperIdReadonly, HelperId } from "../helpers/helpers";
import { Families, FamilyUpdateInfo } from "../families/families";
import { Context, ContextEntity, ServerContext, EntityClass } from "radweb";
import { Roles } from "../auth/roles";


@EntityClass
export class NewsUpdate extends ContextEntity<string> implements FamilyUpdateInfo {

  id = new StringColumn();
  name = new StringColumn();
  courier = new HelperId(this.context, "משנע");
  courierAssingTime = new changeDate('מועד שיוך למשנע');
  courierAssignUser = new HelperIdReadonly(this.context, 'מי שייכה למשנע');
  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  deliveryStatusUser = new HelperIdReadonly(this.context, 'מי עדכן את סטטוס המשלוח');
  updateTime = new changeDate('מועד העדכון');
  updateUser = new HelperIdReadonly(this.context, 'מי עדכן');
  courierComments = new StringColumn('הערות מסירה');
  updateType = new NumberColumn();
  constructor(private context: Context) {
    super({
      allowApiRead: Roles.deliveryAdmin,
      caption: 'חדשות',
      name: 'news',
      dbName: () => {
        let f = new Families(context);
        var sql = new SqlBuilder();
        let cols = [f.id, f.name, f.courier, f.deliverStatus, f.deliveryStatusDate, f.courierAssingTime, f.courierAssignUser, f.deliveryStatusUser, f.courierComments];
        return sql.entityDbNameUnion({
          select: () => [...cols, 
            sql.columnWithAlias(f.deliveryStatusDate, this.updateTime), 
            sql.columnWithAlias(f.deliveryStatusUser, this.updateUser), 
            sql.columnWithAlias(1, this.updateType)],
          from: f,
          where:()=>[sql.notNull(f.deliveryStatusDate)]
        },{
          select: () => [...cols, 
            sql.columnWithAlias(f.courierAssingTime, this.updateTime),
            sql.columnWithAlias(f.courierAssignUser, this.updateUser), 
             sql.columnWithAlias(2, this.updateType)],
          from: f,
          where:()=>[sql.notNull(f.courierAssingTime)]
        })
        
      }
    });
  }
  describe() {
    return Families.GetUpdateMessage(this, this.updateType.value, this.courier.getValue());
  }

}