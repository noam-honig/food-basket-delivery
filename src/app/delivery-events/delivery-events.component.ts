import { Component, OnInit } from '@angular/core';
import { MatGridAvatarCssMatStyler } from '../../../node_modules/@angular/material';
import { GridSettings } from '../../../node_modules/radweb';
import { DeliveryEvents } from '../models';
import { SetDeliveryActiveAction } from './set-delivery-active-action';

@Component({
  selector: 'app-delivery-events',
  templateUrl: './delivery-events.component.html',
  styleUrls: ['./delivery-events.component.scss']
})
export class DeliveryEventsComponent implements OnInit {
  deliveryEvents = new GridSettings(new DeliveryEvents(), {
    allowUpdate: true,
    allowInsert: true,
    columnSettings: e => [
      e.name,
      e.deliveryDate,
      e.families,
      {
        caption: 'סטטוס',
        getValue: e => e.isActiveEvent.value ? "פעיל" : "ארכיון"
      }
    ],
    get: {
      orderBy: e => [
        { column: e.isActiveEvent, descending: true },
        { column: e.deliveryDate, descending: true }
      ]
    },
    rowButtons: [
      {
        name: 'קבע כפעיל',
        visible: e => !e.isActiveEvent.value && !e.isNew(),
        click: async e => {
          try {
            await new SetDeliveryActiveAction().run({ newDeliveryEventId: e.id.value });
            this.deliveryEvents.getRecords();

          } catch (err) {
            alert(err);
          }
        }
      }
    ]
  });
  constructor() { }

  ngOnInit() {
  }

}
