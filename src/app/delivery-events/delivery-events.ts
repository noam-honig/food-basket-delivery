import { DeliveryEventId } from "./DeliveryEventId";
import { IdEntity, changeDate, buildSql } from "../model-shared/types";
import { StringColumn, DateColumn, BoolColumn, NumberColumn } from "radweb";
import { EventStatusColumn } from "./EventStatus";
import { HelperIdReadonly } from "../helpers/helpers";
import { FamilyDeliveryEvents } from "./FamilyDeliveryEvents";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { Families } from "../families/families";
import { Context, ServerContext, EntityClass } from "../shared/context";

let fde = new FamilyDeliveryEvents(new ServerContext());
let f = new Families(new ServerContext());
@EntityClass
export class DeliveryEvents extends IdEntity<DeliveryEventId>  {

  name = new StringColumn('שם');
  deliveryDate = new DateColumn('תאריך החלוקה');
  isActiveEvent = new BoolColumn();
  createDate = new changeDate('מועד הוספה');
  eventStatus = new EventStatusColumn('סטטוס');
  createUser = new HelperIdReadonly(this.context, 'משתמש מוסיף');
  families = new NumberColumn({
    dbReadOnly: true,
    caption: 'משפחות',
    dbName: buildSql('case when ', 'isActiveEvent', ' then ', '(select count(*) from ', f, ' where ', f.deliverStatus, '<>', DeliveryStatus.NotInEvent.id,
      ') else (select count(*) from ', fde, ' where ', fde.deliveryEvent, '=', this, '.id', ' and ', fde.deliverStatus, '<>', DeliveryStatus.NotInEvent.id, ') end'),
    readonly: true
  });

  constructor(private context: Context) {
    super(new DeliveryEventId(), {
      name: 'DeliveryEvents',
      allowApiRead: context.isAdmin(),
      allowApiUpdate: context.isAdmin(),
      allowApiInsert: context.isAdmin(),
      onSavingRow: async () => {
        if (context.onServer)
          if (this.isNew()) {

            this.createDate.dateValue = new Date();
            this.createUser.value = context.info.helperId;
          }
      }
    });
  }
}
