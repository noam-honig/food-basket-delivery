import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';


import { ItemsPerHelper } from "./ItemsPerHelper";
import { EventHelpers } from '../events/Events';
import { Context } from '../shared/entity-provider';

@Component({
  selector: 'app-event-item-helpers',
  templateUrl: './event-item-helpers.component.html',
  styleUrls: ['./event-item-helpers.component.scss']
})
export class EventItemHelpersComponent implements OnInit {

  @Input() itemId = '';
  constructor(private context:Context) { }
  items = new GridSettings(new ItemsPerHelper(), {
    columnSettings: i => [
      {
        getValue: i => i.lookup(new EventHelpers(this.context), i.eventHelperId).helper().name.value,
        caption: 'מתנדב/ת'
      },
      i.quantity
    ],
    get: {
      where: i => i.itemId.isEqualTo(this.itemId)
    }
  });
  ngOnInit() {
  }

}
