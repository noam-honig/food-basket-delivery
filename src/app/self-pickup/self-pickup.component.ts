import { Component, OnInit, OnDestroy } from '@angular/core';
import { Route } from '@angular/router';

import { BusyService, GridSettings } from '@remult/angular';
import { Context } from '@remult/core';

import { DeliveryStatus } from '../families/DeliveryStatus';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { distCenterOrLabGuard } from '../auth/roles';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { u } from '../model-shared/UberContext';


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
    , private context: Context, private dialog: DialogService, public settings: ApplicationSettings) {
    this.dialog.onDistCenterChange(async () => {
      this.families.reloadData();
    }, this.destroyHelper);
  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }
  searchString: string = '';
  showAllFamilies = false;
  families = new GridSettings(this.context.for(ActiveFamilyDeliveries), { knowTotalRows: true });
  pageSize = 7;

  async doFilter() {
    await this.busy.donotWait(async () => this.getRows());
  }
  async getRows() {

    await this.families.get({
      where: f => {
        let r = f.name.contains(this.searchString).and(u(this.context). filterDistCenter(f.distributionCenter, this.dialog.distCenter));
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
    if (f.deliverStatus == DeliveryStatus.ReadyForDelivery) {
      if (f.courier) {
        return 'משוייך למתנדב';
      } else {
        return '';
      }
    }
    return f.deliverStatus.caption;
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
