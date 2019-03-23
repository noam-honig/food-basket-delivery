import { FamilyId } from '../families/families';
import { DeliveryStatusColumn } from "../families/DeliveryStatus";
import { BasketId } from "../families/BasketType";
import { NumberColumn, StringColumn, CompoundIdColumn } from 'radweb';
import { HelperId, HelperIdReadonly } from '../helpers/helpers';
import { IdEntity, changeDate, Id } from '../model-shared/types';
import { CallStatusColumn } from '../families/CallStatus';
import { DeliveryEventId } from "./DeliveryEventId";
import { Context, EntityClass, ContextEntity } from '../shared/context';
@EntityClass
export class FamilyDeliveryEvents extends ContextEntity<string> {
  deliveryEvent = new DeliveryEventId();
  family = new FamilyId();
  basketType = new BasketId(this.context, 'סוג סל');
  callStatus = new CallStatusColumn('סטטוס שיחה');
  callTime = new changeDate('מועד שיחה');
  callHelper = new HelperIdReadonly(this.context, 'מי ביצעה את השיחה');
  callComments = new StringColumn('הערות שיחה');
  courier = new HelperId(this.context, "משנע");
  courierAssignUser = new HelperIdReadonly(this.context, 'מי שייכה למשנע');
  courierAssingTime = new changeDate('מועד שיוך למשנע');
  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  deliveryStatusUser = new HelperIdReadonly(this.context, 'מי עדכן את סטטוס המשלוח');
  routeOrder = new NumberColumn();
  courierComments = new StringColumn('הערות מסירה');
  constructor(private context: Context) {
    super({
      name: 'FamilyDeliveryEvents',
      allowApiRead: !!context.info.deliveryAdmin
    });
    this.initColumns(new CompoundIdColumn(this, this.family, this.deliveryEvent));
  }
}
export class FamilyDelveryEventId extends Id { }