import { DeliveryEventId } from "./DeliveryEventId";

import { IdEntity, changeDate, buildSql } from "../model-shared/types";
import { StringColumn, DateColumn, BoolColumn, NumberColumn, DataProviderFactory } from "radweb";
import { EventStatusColumn } from "./EventStatus";
import { HelperIdReadonly } from "../helpers/helpers";
import { myAuthInfo } from "../auth/my-auth-info";
import { evilStatics } from "../auth/evil-statics";
import { FamilyDeliveryEvents } from "./FamilyDeliveryEvents";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { Families } from "../families/families";
import { entityApiSettings, ApiAccess } from "../server/api-interfaces";
import { DataApiSettings } from "radweb/utils/server/DataApi";
import { Context, ServerContext } from "../shared/context";

let fde = new FamilyDeliveryEvents(new ServerContext(undefined));
let f = new Families(new ServerContext(undefined));

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

  async doSaveStuff(authInfo: myAuthInfo) {
    console.log(this.deliveryDate.value, this.deliveryDate.dateValue, this.deliveryDate.displayValue);
    if (this.isNew()) {
      this.createDate.dateValue = new Date();
      this.createUser.value = authInfo.helperId;
    }
  }
  constructor(private context: Context) {
    super(new DeliveryEventId(), DeliveryEvents, {
      name: 'DeliveryEvents',
      apiAccess: ApiAccess.AdminOnly,
      allowApiUpdate: true,
      allowApiInsert: true,
      onSavingRow: () => this.doSaveStuff(this.context.info)
    });
    this.initColumns();
  }
}
