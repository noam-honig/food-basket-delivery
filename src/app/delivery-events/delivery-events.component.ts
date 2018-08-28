import { Component, OnInit } from '@angular/core';
import { GridSettings, Column } from 'radweb';
import { SelectService } from '../select-popup/select-service';
import { DeliveryEvents } from './delivery-events';
import { AdminGuard } from '../auth/auth-guard';
import { Route } from '@angular/router';
import { Context } from '../shared/context';
import { PostgresDataProvider } from 'radweb/server';
import { ServerContext, RunOnServer } from '../auth/server-action';
import { evilStatics } from '../auth/evil-statics';
import { Families } from '../families/families';
import { FamilyDeliveryEvents } from './FamilyDeliveryEvents';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { CallStatus } from '../families/CallStatus';

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

  deliveryEvents =this.context.for(DeliveryEvents).gridSettings( {
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
            alert(err);
          }
        }
      }
    ]
  });
  @RunOnServer
  static async setDeliveryActive(newDeliveryEventId: string, cont?: Context) {
    await (<PostgresDataProvider>evilStatics.dataSource).doInTransaction(async ds => {
      let context = new ServerContext(cont.info, ds);

      let currentEvent = await context.for(DeliveryEvents).findFirst(f => f.isActiveEvent.isEqualTo(true));
      currentEvent.isActiveEvent.value = false;
      await currentEvent.save();
      let newEvent = await context.for(DeliveryEvents).findFirst(f => f.id.isEqualTo(newDeliveryEventId));
      newEvent.isActiveEvent.value = true;
      await newEvent.save();
      await context.for(Families).foreach(undefined,
        async f => {
          let cols: Column<any>[] = [
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
            f.routeOrder];

          {
            let currentFamilyEvent =
              await context.for(FamilyDeliveryEvents).findFirst(fe =>
                fe.family.isEqualTo(f.id).and(
                  fe.deliveryEvent.isEqualTo(currentEvent.id))
              );
            if (!currentFamilyEvent)
              currentFamilyEvent = context.for(FamilyDeliveryEvents).create();


            if (!currentFamilyEvent.isNew() || f.deliverStatus.listValue != DeliveryStatus.NotInEvent) {
              currentFamilyEvent.family.value = f.id.value;
              currentFamilyEvent.deliveryEvent.value = currentEvent.id.value;
              cols.forEach(c => {
                currentFamilyEvent.__getColumn(c).value = f.__getColumn(c).value;
              });
              await currentFamilyEvent.save();
            }
          }
          {

            f.callComments.value = '';
            f.callHelper.value = '';
            f.callStatus.listValue = CallStatus.NotYet;
            f.callTime.value = '';
            f.courier.value = '';
            f.courierAssignUser.value = '';
            f.courierAssingTime.value = '';
            f.deliverStatus.listValue = DeliveryStatus.NotInEvent;
            f.deliveryStatusDate.value = '';
            f.deliveryStatusUser.value = '';
            f.courierComments.value = '';
            f.routeOrder.value = 0;
            let newFamilyEvent = await context.for(FamilyDeliveryEvents).findFirst(fe => fe.family.isEqualTo(f.id).and(
              fe.deliveryEvent.isEqualTo(newEvent.id)));
            if (newFamilyEvent)
              cols.forEach(c => {
                f.__getColumn(c).value = newFamilyEvent.__getColumn(c).value;
              });
          }


          await f.save();
        });
      Families.SendMessageToBrowsers('הוחלף אירוע פעיל ל' + newEvent.name.value);
    });

  }
  @RunOnServer
  static async copyFamiliesToActiveEvent(fromDeliveryEvent: string, c?: Context) {
    await (<PostgresDataProvider>evilStatics.dataSource).doInTransaction(async ds => {
      let context = new ServerContext(c.info, ds);
      await context.for(FamilyDeliveryEvents).foreach(
        fde => fde.deliveryEvent.isEqualTo(fromDeliveryEvent)
          .and(fde.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id)),
        async de => {
          let f = await context.for(Families).findFirst(f => f.id.isEqualTo(de.family));
          if (f) {
            f.deliverStatus.listValue = DeliveryStatus.ReadyForDelivery;
            f.basketType.value = de.basketType.value;
            await f.doSave(context.info);
          }
        });
    });
  }
  constructor(private dialog: SelectService, private context: Context) { }

  ngOnInit() {
  }

}
