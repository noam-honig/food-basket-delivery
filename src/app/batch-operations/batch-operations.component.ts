import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';

import { BasketType } from '../families/BasketType';
import { Context, AuthorizedGuard, AuthorizedGuardRoute } from 'radweb';
import { Families } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DialogService } from '../select-popup/dialog';
import { RunOnServer } from 'radweb';
import { Roles } from '../auth/roles';


@Component({
  selector: 'app-batch-operations',
  templateUrl: './batch-operations.component.html',
  styleUrls: ['./batch-operations.component.scss']
})

export class BatchOperationsComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService) {

  }
  static route: AuthorizedGuardRoute = {
    path: 'batch-operations',
    component: BatchOperationsComponent,
    data: { name: 'פעולות על קבוצה',allowedRoles:[Roles.deliveryAdmin] }, canActivate: [AuthorizedGuard]
  }
  static allBasketsTokenConst = '!!!';
  group: string;
  basketTypes: BasketType[] = [];
  basketType = BatchOperationsComponent.allBasketsTokenConst;
  allBasketsToken = BatchOperationsComponent.allBasketsTokenConst;

  async ngOnInit() {
    this.basketTypes = await this.context.for(BasketType).find({});
  }
  async setNewBasket() {
    let familiesThatMatch = await this.context.for(Families).count(f => {
      return BatchOperationsComponent.createFamiliesFilterForNewBasket(f, this.basketType, this.group);
    });
    this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + ' משפחות אשר מתאימות להגדרה - האם להגדיר להן משלוח חדש?', async () => {
      await BatchOperationsComponent.setNewBasket(this.basketType, this.group);
      this.dialog.YesNoQuestion('בוצע');
    });



  }

  static createFamiliesFilterForNewBasket(f: Families, basketType: string, group: string) {
    let x = f.deliverStatus.isGreaterOrEqualTo(DeliveryStatus.Success).and(
      f.deliverStatus.isDifferentFrom(DeliveryStatus.Frozen).and(
        f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList)));
    if (basketType != BatchOperationsComponent.allBasketsTokenConst) {
      x = x.and(f.basketType.isEqualTo(basketType));
    }
    if (group)
      x = x.and(f.groups.isContains(group));
    return x;
  }

  @RunOnServer({ allowed: c => c.hasRole(Roles.deliveryAdmin) })
  static async setNewBasket(basketType: string, group: string, context?: Context) {
    let families = await context.for(Families).find({ where: f => BatchOperationsComponent.createFamiliesFilterForNewBasket(f, basketType, group) });
    for (const f of families) {
      f.setNewBasket();

      await f.save();
    }
  }
  async setAsNotInEvent() {
    let familiesThatMatch = await this.context.for(Families).count(f => {
      return BatchOperationsComponent.createFamiliesFilterForNotInEvent(f, this.basketType, this.group);
    });
    this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + ' משפחות אשר מתאימות להגדרה - האם להגדיר אותן כלא באירוע?', async () => {
      await BatchOperationsComponent.setNotInEvent(this.basketType, this.group);
      this.dialog.YesNoQuestion('בוצע');
    });
  }
  static createFamiliesFilterForNotInEvent(f: Families, basketType: string, group: string) {
    let x =
      f.deliverStatus.isDifferentFrom(DeliveryStatus.NotInEvent).and(
        f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList));
    if (basketType != BatchOperationsComponent.allBasketsTokenConst) {
      x = x.and(f.basketType.isEqualTo(basketType));
    } if (group)
      x = x.and(f.groups.isContains(group));
    return x;
  }
  @RunOnServer({ allowed: c => c.hasRole(Roles.deliveryAdmin) })
  static async setNotInEvent(basketType: string, group: string, context?: Context) {
    let families = await context.for(Families).find({ where: f => BatchOperationsComponent.createFamiliesFilterForNotInEvent(f, basketType, group) });
    for (const f of families) {
      f.deliverStatus.value = DeliveryStatus.NotInEvent;
      await f.save();
    }
  }


}
