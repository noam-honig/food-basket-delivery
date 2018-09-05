import { CompoundIdColumn, Entity, NumberColumn } from 'radweb';
import { evilStatics } from '../auth/evil-statics';
import { ItemId } from "../events/ItemId";
import { EventHelperId } from "../event-helpers/EventHelperId";
import { EntityClass } from '../shared/context';


@EntityClass
export class ItemsPerHelper extends Entity<string> {
  itemId = new ItemId();
  eventHelperId = new EventHelperId();
  quantity = new NumberColumn('כמות');
  private id = new CompoundIdColumn(this, this.itemId, this.eventHelperId);
  constructor() {
    super(() => new ItemsPerHelper(), evilStatics.dataSource, "ItemsPerHelper");
  }
}