import { Component, OnInit } from '@angular/core';
import { UserFamiliesList } from '../my-families/user-families';
import { BasketType } from '../families/BasketType';
import { Context } from '@remult/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-basket-summary',
  templateUrl: './basket-summary.component.html',
  styleUrls: ['./basket-summary.component.scss']
})
export class BasketSummaryComponent implements OnInit {

  constructor(private context: Context, public settings: ApplicationSettings) { }
  families: UserFamiliesList;
  boxes1Name = BasketType.boxes1Name;
  boxes2Name = BasketType.boxes2Name;
  boxes1 = 0;
  boxes2 = 0;
  comments: { comment: string, family: string }[] = [];
  async ngOnInit() {
    let hash = new Map<BasketType, basketStats>();
    for (const delivery of this.families.toDeliver) {
      let b = await delivery.$.basketType.load();
      let b1 = b.boxes * delivery.quantity;
      let b2 = b.boxes2 * delivery.quantity;
      this.boxes1 += b1;
      this.boxes2 += b2;
      if (delivery.deliveryComments) {
        this.comments.push({ comment: delivery.deliveryComments, family: delivery.name });
      }
      let s = hash.get(delivery.basketType);
      if (!s) {
        s = {
          name: b.name,
          boxes1: 0,
          boxes2: 0
        };
        this.totals.push(s);
        hash.set(delivery.basketType, s);
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