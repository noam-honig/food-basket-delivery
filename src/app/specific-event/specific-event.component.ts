import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { EventInfo } from 'aws-sdk/clients/codegurureviewer'
import { RegisterToEvent } from '../event-info/RegisterToEvent'
import { EventInList } from '../events/events'
import { OrgEventsController } from '../org-events/org-events.controller'

@Component({
  selector: 'app-specific-event',
  templateUrl: './specific-event.component.html',
  styleUrls: ['./specific-event.component.scss']
})
export class SpecificEventComponent implements OnInit {
  constructor(private route: ActivatedRoute) {}
  events: EventInList
  async ngOnInit() {
    const p = this.route.snapshot.params
    
    this.events = await OrgEventsController.getAllEvents(
      RegisterToEvent.volunteerInfo.phone,
      p['site']
    )
      .then((x) => x.filter((y) => y.id === p['id']))
      .then((x) => (x.length > 0 ? x[0] : undefined))
  }
}
