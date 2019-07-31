import { DeliveryEventId } from "./DeliveryEventId";
import { changeDate, SqlBuilder } from "../model-shared/types";
import { StringColumn, DateColumn, BoolColumn, NumberColumn, IdEntity } from "radweb";
import { EventStatusColumn } from "./EventStatus";
import { HelperIdReadonly } from "../helpers/helpers";
import { FamilyDeliveryEvents } from "./FamilyDeliveryEvents";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { Families } from "../families/families";
import { Context, ServerContext, EntityClass } from "radweb";
import { Roles } from "../auth/roles";

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
    allowApiUpdate: false,
    caption: 'משפחות',
    dbName: () => {
      let fde = new FamilyDeliveryEvents(new ServerContext());
      let f = new Families(new ServerContext());

      let sql = new SqlBuilder();
      return sql.case([
        {
          when: [this.isActiveEvent],
          then: sql.columnCount(this, {
            from: f,
            where: () => [f.deliverStatus.isDifferentFrom(DeliveryStatus.NotInEvent)]
          })
        }],
        sql.columnCount(this, {
          from: fde,
          where: () => [sql.eq(fde.deliveryEvent, this.id),
          fde.deliverStatus.isDifferentFrom(DeliveryStatus.NotInEvent)]

        }));
    }
  });

  constructor(private context: Context) {
    super(new DeliveryEventId(), {
      name: 'DeliveryEvents',
      allowApiRead: Roles.deliveryAdmin,
      allowApiUpdate: Roles.deliveryAdmin,
      allowApiInsert: Roles.deliveryAdmin,
      allowApiDelete: Roles.deliveryAdmin,
      onSavingRow: async () => {
        if (context.onServer)
          if (this.isNew()) {

            this.createDate.value = new Date();
            this.createUser.value = context.user.id;
          }
      }
    });
  }
}
