import { FamilyDelveryEventId, FamilyDeliveryEvents } from '../delivery-events/FamilyDeliveryEvents';
import { FamilyId } from './families';
import { DeliveryStatusColumn } from "./DeliveryStatus";
import { BasketId } from "./BasketType";
import { StringColumn } from 'radweb';
import { HelperId } from '../helpers/helpers';
import { IdEntity, changeDate, DateTimeColumn,  SqlBuilder } from '../model-shared/types';
import { DeliveryEvents } from '../delivery-events/delivery-events';
import { Context, ServerContext, EntityClass } from '../shared/context';




@EntityClass
export class FamilyDeliveryEventsView extends IdEntity<FamilyDelveryEventId>  {

  family = new FamilyId();
  basketType = new BasketId(this.context, 'סוג סל');
  eventName = new StringColumn('שם אירוע');
  deliveryDate = new DateTimeColumn('תאריך החלוקה');
  courier = new HelperId(this.context, "משנע");
  courierAssingTime = new changeDate('מועד שיוך למשנע');
  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  courierComments = new StringColumn('הערות מסירה');
  constructor(private context: Context) {
    super(new FamilyDelveryEventId(), {
      name: 'FamilyDeliveryEventsView',
      allowApiRead: context.isAdmin(),
      dbName: () => {
        let fde = new FamilyDeliveryEvents(new ServerContext());
        var de = new DeliveryEvents(new ServerContext());
        let sql = new SqlBuilder();
        return sql.entityDbName({
          select: () => [fde.id, fde.family, fde.basketType, fde.courier, fde.courierAssingTime, fde.deliverStatus, fde.deliveryStatusDate, fde.courierComments, de.deliveryDate,
          sql.columnWithAlias(de.name, this.eventName)],
          from: fde,
          innerJoin: () => [{ to: de, on: () => [sql.eq(de.id, fde.deliveryEvent)] }],
          where: () => [sql.eq(de.isActiveEvent, false)]
        });
      }
    });
  }

}