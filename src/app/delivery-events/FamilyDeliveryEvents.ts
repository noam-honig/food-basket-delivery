import { FamilyId } from '../families/families';
import { DeliveryStatusColumn } from "../families/DeliveryStatus";
import { BasketId } from "../families/BasketType";
import { NumberColumn, StringColumn, CompoundIdColumn, IdColumn } from '@remult/core';
import { HelperId, HelperIdReadonly } from '../helpers/helpers';
import {  changeDate } from '../model-shared/types';
import { CallStatusColumn } from '../families/CallStatus';

import { Context, EntityClass, Entity } from '@remult/core';
import { Roles } from '../auth/roles';
@EntityClass
export class FamilyDeliveryEvents extends Entity<string> {
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
  deliverStatus = new DeliveryStatusColumn();
  deliveryStatusDate = new changeDate('מועד סטטוס משלוח');
  deliveryStatusUser = new HelperIdReadonly(this.context, 'מי עדכן את סטטוס המשלוח');
  routeOrder = new NumberColumn();
  courierComments = new StringColumn('הערות מסירה');
  constructor(private context: Context) {
    super({
      name: 'FamilyDeliveryEvents',
      allowApiRead: Roles.admin 
    });
    this.__initColumns(new CompoundIdColumn(this, this.family, this.deliveryEvent));
  }
}
export class FamilyDelveryEventId extends IdColumn { }
export class DeliveryEventId extends IdColumn {
}