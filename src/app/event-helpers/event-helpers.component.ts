import { Component, OnInit, Input, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { GridSettings } from 'radweb';
import {  EventHelpers, ItemsPerHelper } from '../models';
import { Helpers } from '../helpers/helpers';
import { MatDialog } from '@angular/material';

import { SelectService } from '../select-popup/select-service';
import { EventHelperItemsComponent } from '../event-helper-items/event-helper-items.component';
import { foreachSync } from '../shared/utils';

@Component({
  selector: 'app-event-helpers',
  templateUrl: './event-helpers.component.html',
  styleUrls: ['./event-helpers.component.scss']
})
export class EventHelpersComponent implements OnInit {

  constructor(private dialog: SelectService) {

  }
  @Input() eventId;
  ngOnInit() {
    this.helpers.getRecords();
  }
  helpers = new GridSettings(new EventHelpers(), {
    get: {
      where: h => h.eventId.isEqualTo(this.eventId),
      limit: 1000
    }
  });
  getName(h: EventHelpers) {
    return h.helper().name.value;
  }

  addOne() {
    this.dialog.showPopup(new Helpers(),
      h => {
        this.helpers.addNewRow();
        let newRow = this.helpers.items[this.helpers.items.length - 1];
        newRow.eventId.value = this.eventId;
        newRow.helperId.value = h.id.value;
        newRow.id.setToNewId();
      },
      {
        columnSettings: h => [h.name, h.phone]
      });
  }
  @ViewChildren(EventHelperItemsComponent) itemsPerHelperComponent: QueryList<EventHelperItemsComponent>;
  async saveAll() {
    foreachSync(this.helpers.items, async h => {
      if (h.wasChanged())
        h.save();
    });
    foreachSync(this.itemsPerHelperComponent.toArray(), async x => x.saveAll());
    
  }

  async deleteHelper(helper: EventHelpers) {

    this.dialog.confirmDelete(helper.helper().name.value + " מאירוע " + (await helper.event()).name.value,
      async () => {
        if (helper.isNew())
          helper.reset();
        await helper.delete();
      });
  }


}
