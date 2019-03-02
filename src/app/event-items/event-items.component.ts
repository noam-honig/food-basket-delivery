import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';
import { ItemsPerHelper } from "../event-item-helpers/ItemsPerHelper";

import { foreachSync, foreachEntityItem } from '../shared/utils';
import { DialogService } from '../select-popup/dialog';
import { Items } from '../events/Events';
import { Context } from '../shared/context';

@Component({
  selector: 'app-event-items',
  templateUrl: './event-items.component.html',
  styleUrls: ['./event-items.component.scss']
})
export class EventItemsComponent implements OnInit {

  constructor
    (
    private dialog: DialogService,private context:Context
    ) { }
  @Input() eventId: string;
  ngOnInit() {
    this.items.getRecords();
  }
  items = new GridSettings(new Items(this.context), {
    allowDelete: true,
    allowUpdate: true,
    allowInsert: true,
    numOfColumnsInGrid: 0,
    columnSettings: items => [
      items.item,
      { column: items.quantity }
    ],
    get: {
      where: items => items.eventId.isEqualTo(this.eventId)
    },
    onNewRow: items => items.eventId.value = this.eventId

  });

  delete(item: Items) {
    if (item)
      this.dialog.confirmDelete(item.item.value, () => {
        if (item.isNew())
          item.reset();
        else
          item.delete();
      });
  }

  //tab implementation becaust mat tab sucks!!!!
  selectedTab = 0;
  tabs = ["פרטים", "מי מביאה?"];
  //end tab implementation
  async saveAll() {
    foreachSync(this.items.items, async item => {
      if (item.wasChanged())
        item.save();
    });

  }
  addNew() {
    this.items.addNewRow();
    let i = this.items.items[this.items.items.length - 1];
    this.dialog.displayArea({
      title: 'מוצר חדש',
      settings: { columnSettings: () => [i.item, i.quantity] },
      ok: () => { },
      cancel: () => {
        i.reset();
      }
    });
  }
}
