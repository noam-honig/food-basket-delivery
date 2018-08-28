import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Events } from "./Events";

import { EventItemsComponent } from '../event-items/event-items.component';
import { EventHelpersComponent } from '../event-helpers/event-helpers.component';
import { SelectService } from '../select-popup/select-service';
import { Context } from '../shared/context';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {

  constructor(
    private dialogs: SelectService
    ,private context:Context
  ) { }

  ngOnInit(): void {
    this.events.getRecords();
  }
  events = new GridSettings(new Events(this.context), {
    onNewRow: p => p.id.setToNewId()
  });
  //tab implementation becaust mat tab sucks!!!!
  tabs = ['תאור כללי', 'מה צריך', 'מתנדבות'];
  selectedTab = 0;
  //end tab implementation
  saveAll(eventsItems: EventItemsComponent, eventHelpers: EventHelpersComponent) {
    if (this.events.currentRow.wasChanged())
      this.events.currentRow.save();
    eventsItems.saveAll();
    eventHelpers.saveAll();
  }
  addEvent() {

    this.events.addNewRow();
    let p = this.events.items[this.events.items.length - 1];
    this.dialogs.displayArea({
      title: 'אירוע חדש',
      settings: {
        columnSettings: () => [p.name]
      },
      ok: () => { 
        p.save();
      },
      cancel: () => { 
        
        p.reset();
      }
    });
  }
  delete(p: Events) {
    this.dialogs.confirmDelete(p.name.value, () => {
      p.delete();
    });
  }

}
