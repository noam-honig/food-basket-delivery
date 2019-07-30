import { CompoundIdColumn, Entity, NumberColumn, ContextEntity } from 'radweb';

import { ItemId } from "../events/ItemId";
import { EventHelperId } from "../event-helpers/EventHelperId";
import { EntityClass } from 'radweb';


@EntityClass
export class ItemsPerHelper extends ContextEntity<string> {
  itemId = new ItemId();
  eventHelperId = new EventHelperId();
  quantity = new NumberColumn('כמות');
  private id = new CompoundIdColumn(this, this.itemId, this.eventHelperId);
  constructor() {
    super( "ItemsPerHelper");
    
  }
}