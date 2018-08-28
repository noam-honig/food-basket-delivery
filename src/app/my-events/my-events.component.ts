import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Events, EventHelpers } from "../events/Events";

import { AuthService } from '../auth/auth-service';
import { EventHelperItemsComponent } from '../event-helper-items/event-helper-items.component';
import { Context } from '../shared/entity-provider';

@Component({
  selector: 'app-my-events',
  templateUrl: './my-events.component.html',
  styleUrls: ['./my-events.component.scss']
})
export class MyEventsComponent implements OnInit {

  events = new GridSettings(new Events(this.context), {
    onNewRow: p => p.id.setToNewId()
  });

  constructor(private auth: AuthService,private context:Context) { }

  ngOnInit() {
    this.events.getRecords();
  }
  getEventHelper(p: Events) {
    let ph = p.lookup(new EventHelpers(this.context), ph => ph.helperId.isEqualTo(this.auth.auth.info.helperId).and(ph.eventId.isEqualTo(p.id.value)));
    if (ph.isNew()) {
      if (!ph.id.value) {
        ph.id.setToNewId();
      }
      ph.eventId.value = p.id.value;
      ph.helperId.value = this.auth.auth.info.helperId;
    }
    return ph;
  }
  saveAll( eventItems:EventHelperItemsComponent,p:Events){
    this.getEventHelper(p).save();
    eventItems.saveAll();
  }

}
