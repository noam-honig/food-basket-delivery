import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';

import { BusyService } from '@remult/core';
import { Context } from '@remult/core';
import { Families } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Roles, AdminGuard } from '../auth/roles';

@Component({
  selector: 'app-self-pickup',
  templateUrl: './self-pickup.component.html',
  styleUrls: ['./self-pickup.component.scss']
})
export class SelfPickupComponent implements OnInit {


  static route: Route = {
    path: 'self-pickup-families', component: SelfPickupComponent, canActivate: [AdminGuard], data: {
      name: 'באים לקחת',
      seperator: true
    }
  };

  constructor(private busy: BusyService
    , private context: Context) { }
  searchString: string = '';
  showAllFamilies = false;
  families = this.context.for(Families).gridSettings({ knowTotalRows: true });
  pageSize = 7;

  async doFilter() {
    await this.busy.donotWait(async () => this.getRows());
  }
  async getRows() {

    await this.families.get({
      where: f => {
        let r = f.name.isContains(this.searchString);
        if (!this.showAllFamilies) {
          return r.and(f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup));
        }
        return r;
      },
      orderBy: f => f.name,
      limit: this.pageSize
    });


  }
  clearHelper() {
    this.searchString = '';
    this.doFilter();
  }

  showStatus(f: Families) {
    if (f.deliverStatus.value == DeliveryStatus.ReadyForDelivery) {
      if (f.courier.value) {
        return 'משוייך למשנע';
      } else {
        return '';
      }
    }
    return f.deliverStatus.displayValue;
  }
  async ngOnInit() {
    this.busy.donotWait(async () =>
      await this.getRows());

  }
  moreFamilies() {
    this.pageSize += 7;
    this.getRows();
  }


}
