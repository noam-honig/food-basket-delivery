import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Events, EventHelpers } from "../events/Events";
import { EventHelperItemsComponent } from '../event-helper-items/event-helper-items.component';
import { Context } from '../shared/context';

@Component({
  selector: 'app-my-events',
  templateUrl: './my-events.component.html',
  styleUrls: ['./my-events.component.scss']
})
export class MyEventsComponent implements OnInit {

  events = new GridSettings(new Events(this.context), {
    onNewRow: p => p.id.setToNewId()
  });

  constructor(private context:Context) { }

  ngOnInit() {
    this.events.getRecords();
  }
  getEventHelper(p: Events) {
    let ph = p.lookup(new EventHelpers(this.context), ph => ph.helperId.isEqualTo(this.context.info.helperId).and(ph.eventId.isEqualTo(p.id.value)));
    if (ph.isNew()) {
      if (!ph.id.value) {
        ph.id.setToNewId();
      }
      ph.eventId.value = p.id.value;
      ph.helperId.value = this.context.info.helperId;
    }
    return ph;
  }
  saveAll( eventItems:EventHelperItemsComponent,p:Events){
    this.getEventHelper(p).save();
    eventItems.saveAll();
  }

}
