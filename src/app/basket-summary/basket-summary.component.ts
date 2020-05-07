import { Component, OnInit } from '@angular/core';
import { UserFamiliesList } from '../my-families/user-families';
import { BasketType } from '../families/BasketType';
import { Context } from '@remult/core';

@Component({
  selector: 'app-basket-summary',
  templateUrl: './basket-summary.component.html',
  styleUrls: ['./basket-summary.component.scss']
})
export class BasketSummaryComponent implements OnInit {

  constructor(private context: Context) { }
  families: UserFamiliesList;
  boxes1Name = BasketType.boxes1Name;
  boxes2Name = BasketType.boxes2Name;
  boxes1 = 0;
  boxes2 = 0;
  async ngOnInit() {
    let hash = new Map<string, basketStats>();
    for (const delivery of this.families.toDeliver) {
      let b = await this.context.for(BasketType).lookupAsync(delivery.basketType);
      let b1 = b.boxes.value * delivery.quantity.value;
      let b2 = b.boxes2.value * delivery.quantity.value;
      this.boxes1 += b1;
      this.boxes2 += b2;
      let s = hash.get(delivery.basketType.value);
      if (!s) {
        s = {
          name: b.name.value,
          boxes1: 0,
          boxes2: 0
        };
        this.totals.push(s);
        hash.set(delivery.basketType.value, s);
      }
      s.boxes1 += b1;
      s.boxes2 += b2;
    }
  }
  totals: basketStats[] = [];

}

export interface basketStats {
  name: string;
  boxes1: number;
  boxes2: number;
}