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

let fde = new FamilyDeliveryEvents();
let f = new Families();

export class DeliveryEvents extends IdEntity<DeliveryEventId>{
    name = new StringColumn('שם');
    deliveryDate = new DateColumn('תאריך החלוקה');
    isActiveEvent = new BoolColumn();
    createDate = new changeDate('מועד הוספה');
    eventStatus = new EventStatusColumn('סטטוס');
    createUser = new HelperIdReadonly('משתמש מוסיף');
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
    constructor(source?: DataProviderFactory) {
      super(new DeliveryEventId(), () => new DeliveryEvents(source), source ? source : evilStatics.dataSource, 'DeliveryEvents');
      this.initColumns();
    }
  }
