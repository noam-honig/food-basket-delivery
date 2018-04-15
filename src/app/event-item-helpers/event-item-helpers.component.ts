import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';

import { ItemsPerHelper, EventHelpers } from '../models';

@Component({
  selector: 'app-event-item-helpers',
  templateUrl: './event-item-helpers.component.html',
  styleUrls: ['./event-item-helpers.component.scss']
})
export class EventItemHelpersComponent implements OnInit {

  @Input() itemId = '';
  constructor() { }
  items = new GridSettings(new ItemsPerHelper(), {
    columnSettings: i => [
      {
        getValue: i => i.lookup(new EventHelpers(), i.eventHelperId).helper().name.value,
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
