import { DeliveryStatusColumn } from "../families/DeliveryStatus";
import { changeDate, buildSql, StringColumn } from "../model-shared/types";
import { NumberColumn } from "radweb";
import { HelperIdReadonly, HelperId } from "../helpers/helpers";
import { Families, FamilyUpdateInfo } from "../families/families";
import { Context, ContextEntity, ServerContext } from "../shared/context";



export let f = new Families(new ServerContext());
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
    super(NewsUpdate, {
      allowApiRead: context.isAdmin(),
      caption: 'חדשות',
      name: 'news',
      dbName: buildSql("(select ", [f.id, f.name, f.courier, f.deliverStatus, f.deliveryStatusDate, f.courierAssingTime, f.courierAssignUser, f.deliveryStatusUser, f.courierComments], ", ", f.deliveryStatusDate, " updateTime, ", f.deliveryStatusUser, " updateUser, 1 updateType from ", f, " where ", f.deliveryStatusDate, " is not null ", "union select ", [f.id, f.name, f.courier, f.deliverStatus, f.deliveryStatusDate, f.courierAssingTime, f.courierAssignUser, f.deliveryStatusUser, f.courierComments], ", ", f.courierAssingTime, " updateTime, ", f.courierAssignUser, " updateUser, 2 updateType from ", f, " where ", f.courierAssingTime, " is not null", ") x")
    });
    this.initColumns();
  }
  describe() {
    return Families.GetUpdateMessage(this, this.updateType.value, this.courier.getValue());
  }

}