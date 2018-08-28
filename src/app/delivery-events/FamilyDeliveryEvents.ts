import { FamilyId } from '../families/families';
import { DeliveryStatusColumn } from "../families/DeliveryStatus";
import { BasketId } from "../families/BasketType";
import { DataProviderFactory, NumberColumn, StringColumn } from 'radweb';
import { evilStatics } from '../auth/evil-statics';
import { HelperId, HelperIdReadonly } from '../helpers/helpers';
import { IdEntity, changeDate, Id } from '../model-shared/types';
import { CallStatusColumn } from '../families/CallStatus';
import { DeliveryEventId } from "./DeliveryEventId";
import { Context } from '../shared/context';

export class FamilyDeliveryEvents extends IdEntity<FamilyDelveryEventId> {
  deliveryEvent = new DeliveryEventId();
  family = new FamilyId();
  basketType = new BasketId(this.context,'סוג סל');
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
    super(new FamilyDelveryEventId(), FamilyDeliveryEvents, 'FamilyDeliveryEvents');
    this.initColumns();
  }
}
export class FamilyDelveryEventId extends Id { }