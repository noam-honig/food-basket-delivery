import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { BusyService } from '../select-popup/busy-service';
import { Context } from '../shared/context';
import { Families } from '../families/families';
import { DeliveryStatus } from '../families/DeliveryStatus';

@Component({
  selector: 'app-self-pickup',
  templateUrl: './self-pickup.component.html',
  styleUrls: ['./self-pickup.component.scss']
})
export class SelfPickupComponent implements OnInit {


  static route: Route = {
    path: 'self-pickup-families', component: SelfPickupComponent, canActivate: [HolidayDeliveryAdmin], data: { name: 'באים לקחת', seperator: true }
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
          return r.and(f.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup.id));
        }
        return r;
      },
      orderBy: f => f.name,
      limit: this.pageSize
    });


  }
  clearHelper() {
      this.searchString='';
      this.doFilter();
  }

  showStatus(f: Families) {
    if (f.deliverStatus.listValue == DeliveryStatus.ReadyForDelivery) {
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
