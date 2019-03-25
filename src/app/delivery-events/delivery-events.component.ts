import { Component, OnInit } from '@angular/core';
import { Column, DateTimeColumn } from 'radweb';
import { DeliveryEvents } from './delivery-events';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { Route } from '@angular/router';
import { Context, DirectSQL } from '../shared/context';
import { RunOnServer } from '../auth/server-action';
import { Families } from '../families/families';
import { FamilyDeliveryEvents } from './FamilyDeliveryEvents';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { CallStatus } from '../families/CallStatus';
import { DialogService } from '../select-popup/dialog';
import { SqlBuilder } from '../model-shared/types';

@Component({
  selector: 'app-delivery-events',
  templateUrl: './delivery-events.component.html',
  styleUrls: ['./delivery-events.component.scss']
})
export class DeliveryEventsComponent implements OnInit {

  static route: Route = {
    path: 'delivery-events',
    component: DeliveryEventsComponent,
    data: { name: 'אירועי חלוקה' }, canActivate: [HolidayDeliveryAdmin]
  };

  deliveryEvents = this.context.for(DeliveryEvents).gridSettings({
    allowUpdate: true,
    allowInsert: true,
    allowDelete: true,
    confirmDelete: (h, yes) => this.dialog.confirmDelete('אירוע משלוח ' + h.name.value, yes),
    columnSettings: e => [
      {
        column: e.name,
        width: '200'
      },
      {
        column: e.deliveryDate,
        width: '175'
      },
      {
        column: e.families,
        width: '75'
      },

      {
        caption: 'מצב צבירה',
        getValue: e => e.isActiveEvent.value ? "בעבודה" : "לא מוצג",
        width: '150'
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
            await DeliveryEventsComponent.setDeliveryActive(e.id.value);
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
              await DeliveryEventsComponent.copyFamiliesToActiveEvent(e.id.value);
              this.deliveryEvents.getRecords();
            });

          } catch (err) {
            alert(await err);
          }
        }
      }
    ]
  });
  @RunOnServer({ allowed: c => c.isAdmin() })
  static async setDeliveryActive(newDeliveryEventId: string, context?: Context, directSQL?: DirectSQL) {
    let sql = new SqlBuilder();
    let currentEvent = await context.for(DeliveryEvents).findFirst(f => f.isActiveEvent.isEqualTo(true));
    currentEvent.isActiveEvent.value = false;
    await currentEvent.save();
    let newEvent = await context.for(DeliveryEvents).findFirst(f => f.id.isEqualTo(newDeliveryEventId));
    newEvent.isActiveEvent.value = true;
    await newEvent.save();


    let fde = new FamilyDeliveryEvents(context);
    let f = new Families(context);

    let columns: changeActiveEventHelper[] = [];

    [
      f.basketType,
      f.callComments,
      f.callHelper,
      f.callStatus,
      f.callTime,
      f.courier,
      f.courierAssignUser,
      f.courierAssingTime,
      f.deliverStatus,
      f.deliveryStatusDate,
      f.deliveryStatusUser,
      f.courierComments,
      f.routeOrder].forEach((c: Column<any>) => {
        let emptyValue = "''";
        switch (c) {
          case f.callStatus:
            emptyValue = CallStatus.NotYet.id.toString();
            break;
          case f.deliverStatus:
            emptyValue = DeliveryStatus.NotInEvent.id.toString();
            break;
          case f.routeOrder:
            emptyValue = '0';
            break;
        }
        if (c instanceof DateTimeColumn) {
          emptyValue = 'null';
        }
        columns.push({ familyColumn: c, deliveryColumn: fde.__getColumn(c), emptyValue });

      });
    //delete old current event data from delivery event
    await directSQL.execute(sql.delete(fde, sql.eq(fde.deliveryEvent, sql.str(currentEvent.id.value))));


    //insert current event data from familes into delivery events
    await directSQL.execute(sql.insert({
      into: fde,
      from: f,
      set: () => [[fde.deliveryEvent, sql.str(currentEvent.id.value)], [fde.family, f.id], ...columns.map(c => <[Column<any>, any]>[c.familyColumn, c.deliveryColumn])],
      where:()=>[f.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id)]
    }));

    // clear families data
    await directSQL.execute(sql.update(f, {
      set: () => columns.map(c => <[Column<any>, any]>[c.familyColumn, c.emptyValue])
    }));

    // update families with new event data
    await directSQL.execute(sql.update(
      f, {
        set: () => columns.map(c => <[Column<any>, any]>[c.familyColumn, c.deliveryColumn]),
        from: fde,
        where: () => [sql.eq(fde.deliveryEvent, sql.str(newDeliveryEventId)), sql.eq(fde.family, f.id)]
      },

    ));

    Families.SendMessageToBrowsers('הוחלף אירוע פעיל ל' + newEvent.name.value);
    console.timeEnd('setdelivery event');
  }
  @RunOnServer({ allowed: c => c.isAdmin() })
  static async copyFamiliesToActiveEvent(fromDeliveryEvent: string, context?: Context) {
    await context.for(FamilyDeliveryEvents).foreach(
      fde => fde.deliveryEvent.isEqualTo(fromDeliveryEvent)
        .and(fde.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id)),
      async de => {
        let f = await context.for(Families).findFirst(f => f.id.isEqualTo(de.family));
        if (f) {
          f.deliverStatus.listValue = DeliveryStatus.ReadyForDelivery;
          f.basketType.value = de.basketType.value;
          await f.save();
        }
      });
  }
  constructor(private dialog: DialogService, private context: Context) { }


  ngOnInit() {
  }

}
export interface canRunSql {

}
interface changeActiveEventHelper {
  familyColumn: Column<any>;
  deliveryColumn: Column<any>;
  emptyValue: String;
}