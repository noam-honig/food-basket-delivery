import { FamilyDelveryEventId, FamilyDeliveryEvents } from '../delivery-events/FamilyDeliveryEvents';
import { FamilyId } from './families';
import { DeliveryStatusColumn } from "./DeliveryStatus";
import { BasketId } from "./BasketType";
import { DataProviderFactory, StringColumn } from 'radweb';
import { evilStatics } from '../auth/evil-statics';
import { HelperId } from '../helpers/helpers';
import { IdEntity, changeDate, DateTimeColumn, buildSql } from '../model-shared/types';
import { DeliveryEvents } from '../delivery-events/delivery-events';
import { entityApiSettings, LoggedInCanViewButOnlyAdminUpdatesInsertsAndDeletes, entityWithApi } from "../server/api-interfaces";
import { Context } from '../shared/context';


let fde = new FamilyDeliveryEvents(undefined);
var de = new DeliveryEvents(undefined);


export class FamilyDeliveryEventsView extends IdEntity<FamilyDelveryEventId> implements entityWithApi {

  family = new FamilyId();
  basketType = new BasketId('סוג סל');
  eventName = new StringColumn('שם אירוע');
  deliveryDate = new DateTimeColumn('תאריך החלוקה');
  courier = new HelperId(this.context,"משנע");
  courierAssingTime = new changeDate('מועד שיוך למשנע');
  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  courierComments = new StringColumn('הערות מסירה');
  constructor(private context:Context, source?: DataProviderFactory) {
    super(new FamilyDelveryEventId(), () => new FamilyDeliveryEventsView(context,source), source ? source : evilStatics.dataSource, {
      name: 'FamilyDeliveryEventsView',
      dbName: buildSql('(select ', fde, '.', fde.id, ', ', [fde.family, fde.basketType, fde.courier, fde.courierAssingTime, fde.deliverStatus, fde.deliveryStatusDate, fde.courierComments, de.deliveryDate], ', ', de, '.', de.name, ' eventName', ' from ', fde, ' inner join ', de, ' on ', de, '.', de.id, '=', fde.deliveryEvent, ' where ', de.isActiveEvent, '=false', ') as x')
    });
    this.initColumns();
  }
  getDataApiSettings(): entityApiSettings {
    return {};
  }
}