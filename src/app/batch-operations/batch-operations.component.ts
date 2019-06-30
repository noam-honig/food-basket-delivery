import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { BasketType } from '../families/BasketType';
import { Context } from '../shared/context';
import { Families } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DialogService } from '../select-popup/dialog';
import { RunOnServer } from '../auth/server-action';


@Component({
  selector: 'app-batch-operations',
  templateUrl: './batch-operations.component.html',
  styleUrls: ['./batch-operations.component.scss']
})

export class BatchOperationsComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService) {

  }
  static route: Route = {
    path: 'batch-operations',
    component: BatchOperationsComponent,
    data: { name: 'פעולות על קבוצה' }, canActivate: [HolidayDeliveryAdmin]
  }
  static allBasketsTokenConst = '!!!';
  basketTypes: BasketType[] = [];
  basketType = BatchOperationsComponent.allBasketsTokenConst;
  allBasketsToken = BatchOperationsComponent.allBasketsTokenConst;

  async ngOnInit() {
    this.basketTypes = await this.context.for(BasketType).find({});
  }
  async setNewBasket() {
    let familiesThatMatch = await this.context.for(Families).count(f => {
      return BatchOperationsComponent.createFamiliesFilterForNewBasket(f, this.basketType);
    });
    this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + ' משפחות אשר מתאימות להגדרה - האם להגדיר להן משלוח חדש?', async () => {
      await BatchOperationsComponent.setNewBasket(this.basketType);
      this.dialog.YesNoQuestion('בוצע');
    });



  }
 
  static createFamiliesFilterForNewBasket(f: Families, basketType: string) {
    let x = f.deliverStatus.isGreaterOrEqualTo(DeliveryStatus.Success).and(
      f.deliverStatus.isDifferentFrom(DeliveryStatus.Frozen).and(
        f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList)));
    if (basketType != BatchOperationsComponent.allBasketsTokenConst) {
      x = x.and(f.basketType.isEqualTo(basketType));
    }
    return x;
  }

  @RunOnServer({ allowed: c => c.isAdmin() })
  static async setNewBasket(basketType: string, context?: Context) {
    let families = await context.for(Families).find({ where: f => BatchOperationsComponent.createFamiliesFilterForNewBasket(f, basketType) });
    for (const f of families) {
      f.setNewBasket();
      
      await f.save();
    }
  }
  async setAsNotInEvent() {
    let familiesThatMatch = await this.context.for(Families).count(f => {
      return BatchOperationsComponent.createFamiliesFilterForNotInEvent(f, this.basketType);
    });
    this.dialog.YesNoQuestion('ישנן ' + familiesThatMatch.toString() + ' משפחות אשר מתאימות להגדרה - האם להגדיר אותן כלא באירוע?', async () => {
      await BatchOperationsComponent.setNotInEvent(this.basketType);
      this.dialog.YesNoQuestion('בוצע');
    });
  }
  static createFamiliesFilterForNotInEvent(f: Families, basketType: string) {
    let x =
      f.deliverStatus.isDifferentFrom(DeliveryStatus.NotInEvent).and(
        f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList));
    if (basketType != BatchOperationsComponent.allBasketsTokenConst) {
      x = x.and(f.basketType.isEqualTo(basketType));
    }
    return x;
  }
  @RunOnServer({ allowed: c => c.isAdmin() })
  static async setNotInEvent(basketType: string, context?: Context) {
    let families = await context.for(Families).find({ where: f => BatchOperationsComponent.createFamiliesFilterForNotInEvent(f, basketType) });
    for (const f of families) {
      f.deliverStatus.value = DeliveryStatus.NotInEvent;
      await f.save();
    }
  }


}
