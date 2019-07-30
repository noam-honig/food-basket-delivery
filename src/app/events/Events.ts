import { foreachEntityItem } from '../shared/utils';
import { IdEntity, IdColumn } from 'radweb';
import { StringColumn, NumberColumn, Entity } from 'radweb';
import { EventHelperId } from '../event-helpers/EventHelperId';
import { HelperId, Helpers } from '../helpers/helpers';
import { ItemsPerHelper } from '../event-item-helpers/ItemsPerHelper';
import { ItemId } from './ItemId';
import { Context, EntityClass } from 'radweb';
import { Roles } from '../auth/roles';

@EntityClass
export class Events extends IdEntity<EventId> {
  name = new StringColumn('שם אירוע');
  description = new StringColumn();
  constructor(private context: Context) {
    super(new EventId(), { name: "events", allowApiRead: Roles.superAdmin });
  }
  async delete() {
    await foreachEntityItem(new Items(this.context), hi => hi.eventId.isEqualTo(this.id), item => item.delete());
    await foreachEntityItem(new EventHelpers(this.context), hi => hi.eventId.isEqualTo(this.id), item => item.delete());
    return super.delete();
  }
}

export class EventId extends IdColumn { }

@EntityClass
export class EventHelpers extends IdEntity<EventHelperId> {
  helperId = new HelperId(this.context);
  eventId = new EventId();
  constructor(private context: Context) {
    super(new EventHelperId(), { name: 'EventHelpers', allowApiRead: Roles.superAdmin });
  }
  async delete() {
    foreachEntityItem(new ItemsPerHelper(), hi => hi.eventHelperId.isEqualTo(this.id), item => item.delete());
    return super.delete();
  }

  helper() {
    return this.context.for(Helpers).lookup(this.helperId);
  }
  event() {
    return this.lookupAsync(new Events(this.context), this.eventId);
  }
}
@EntityClass
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
  constructor(context: Context) {
    super(new ItemId(), { name: "items", allowApiRead: Roles.superAdmin });
  }
  async delete() {
    foreachEntityItem(new ItemsPerHelper(), hi => hi.itemId.isEqualTo(this.id), item => item.delete());
    return super.delete();
  }
}

