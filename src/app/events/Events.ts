

import { foreachEntityItem } from '../shared/utils';
import { evilStatics } from '../auth/evil-statics';
import { IdEntity, Id } from '../model-shared/types';
import { StringColumn, NumberColumn } from 'radweb';
import { EventHelperId } from '../event-helpers/EventHelperId';
import { HelperId, Helpers } from '../helpers/helpers';
import { ItemsPerHelper } from '../event-item-helpers/ItemsPerHelper';
import { ItemId } from './ItemId';

export class Events extends IdEntity<EventId> {
  name = new StringColumn('שם אירוע');
  description = new StringColumn();
  constructor() {
    super(new EventId(), () => new Events(), evilStatics.dataSource, "events");
    this.initColumns();
  }
  async delete() {
    await foreachEntityItem(new Items(), hi => hi.eventId.isEqualTo(this.id), item => item.delete());
    await foreachEntityItem(new EventHelpers(), hi => hi.eventId.isEqualTo(this.id), item => item.delete());
    return super.delete();
  }
}

export class EventId extends Id { }

export class EventHelpers extends IdEntity<EventHelperId> {
  helperId = new HelperId();
  eventId = new EventId();
  constructor() {
    super(new EventHelperId(), () => new EventHelpers(), evilStatics.dataSource, 'EventHelpers');
    this.initColumns();
  }
  async delete() {
    foreachEntityItem(new ItemsPerHelper(), hi => hi.eventHelperId.isEqualTo(this.id), item => item.delete());
    return super.delete();
  }
  helper() {
    return this.lookup(new Helpers(), this.helperId);
  }
  event() {
    return this.lookupAsync(new Events(), this.eventId);
  }
}

export class Items extends IdEntity<ItemId> {
  eventId = new EventId();
  quantity = new NumberColumn("יח'");
  item = new StringColumn('מה צריך');
  totalSoFar = new NumberColumn({
    caption: 'נאסף',
    virtualData: async () => {
      let total = 0;
      await foreachEntityItem(new ItemsPerHelper(), i => i.itemId.isEqualTo(this.id), async (i) => {
        total += i.quantity.value;
      });
      return total;
    }
  });
  constructor() {
    super(new ItemId(), () => new Items(), evilStatics.dataSource, "items");
    this.initColumns();
  }
  async delete() {
    foreachEntityItem(new ItemsPerHelper(), hi => hi.itemId.isEqualTo(this.id), item => item.delete());
    return super.delete();
  }
}

