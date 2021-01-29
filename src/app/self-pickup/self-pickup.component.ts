import { Component, OnInit, OnDestroy } from '@angular/core';
import { Route } from '@angular/router';

import { BusyService } from '@remult/angular';
import { Context } from '@remult/core';

import { DeliveryStatus } from '../families/DeliveryStatus';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Roles, AdminGuard, distCenterAdminGuard, distCenterOrLabGuard } from '../auth/roles';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-self-pickup',
  templateUrl: './self-pickup.component.html',
  styleUrls: ['./self-pickup.component.scss']
})
export class SelfPickupComponent implements OnInit, OnDestroy {


  static route: Route = {
    path: 'self-pickup-families', component: SelfPickupComponent, canActivate: [distCenterOrLabGuard], data: {
      name: 'באים לקחת',
      seperator: true
    }
  };

  constructor(private busy: BusyService
    , private context: Context, private dialog: DialogService, public   settings: ApplicationSettings) {
    this.dialog.onDistCenterChange(async () => {
      this.families.getRecords();
    }, this.destroyHelper);
  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }
  searchString: string = '';
  showAllFamilies = false;
  families = this.context.for(ActiveFamilyDeliveries).gridSettings({ knowTotalRows: true });
  pageSize = 7;

  async doFilter() {
    await this.busy.donotWait(async () => this.getRows());
  }
  async getRows() {

    await this.families.get({
      where: f => {
        let r = f.name.isContains(this.searchString).and(f.distributionCenter.filter(this.dialog.distCenter.value));
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

  showStatus(f: ActiveFamilyDeliveries) {
    if (f.deliverStatus.value == DeliveryStatus.ReadyForDelivery) {
      if (f.courier.value) {
        return 'משוייך למתנדב';
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
