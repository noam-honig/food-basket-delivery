import { Component, OnInit } from '@angular/core';
import { MatGridAvatarCssMatStyler } from '@angular/material';
import { GridSettings } from 'radweb';

import { SetDeliveryActiveAction } from './set-delivery-active-action';
import { CopyFamiliesToActiveEventAction } from './copy-families-to-active-event-action';
import { SelectService } from '../select-popup/select-service';
import { DeliveryEvents } from './delivery-events';
import { AdminGuard } from '../auth/auth-guard';
import { Route } from '@angular/router';

@Component({
  selector: 'app-delivery-events',
  templateUrl: './delivery-events.component.html',
  styleUrls: ['./delivery-events.component.scss']
})
export class DeliveryEventsComponent implements OnInit {

  static route: Route = {
    path: 'delivery-events',
    component: DeliveryEventsComponent,
    data: { name: 'אירועי חלוקה' }, canActivate: [AdminGuard]
  };

  deliveryEvents = new GridSettings(new DeliveryEvents(), {
    allowUpdate: true,
    allowInsert: true,
    columnSettings: e => [
      {
        column: e.name,
        width: '100'
      },
      e.deliveryDate,
      e.families,
      e.eventStatus.getColumn(),
      {
        caption: 'מצב צבירה',
        getValue: e => e.isActiveEvent.value ? "בעבודה" : "לא מוצג"
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
        name: 'קבע כאירוע בעבודה',
        visible: e => !e.isActiveEvent.value && !e.isNew(),
        click: async e => {
          try {
            await new SetDeliveryActiveAction().run({ newDeliveryEventId: e.id.value });
            this.deliveryEvents.getRecords();

          } catch (err) {
            alert(err);
          }
        }
      },
      {
        name: 'העתק משפחות לאירוע מוצג',
        visible: e => !e.isActiveEvent.value && !e.isNew(),
        click: async e => {
          try {
            this.dialog.YesNoQuestion("פעולה זו תעתיק את כל המשפחות שהשתתפו באירוע \"" + e.name.value + "\" לאירוע הנוכחי. האם להמשיך?", async () => {
              await new CopyFamiliesToActiveEventAction().run({ fromDeliveryEvent: e.id.value });
              this.deliveryEvents.getRecords();
            });

          } catch (err) {
            alert(err);
          }
        }
      }
    ]
  });
  constructor(private dialog: SelectService) { }

  ngOnInit() {
  }

}
