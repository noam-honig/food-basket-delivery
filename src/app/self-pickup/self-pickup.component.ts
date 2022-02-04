import { Component, OnInit, OnDestroy } from '@angular/core';
import { Route } from '@angular/router';

import { BusyService } from '@remult/angular';
import { Remult } from 'remult';

import { DeliveryStatus } from '../families/DeliveryStatus';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { distCenterOrLabGuard } from '../auth/roles';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { GridSettings } from '@remult/angular/interfaces';

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
    , private remult: Remult, private dialog: DialogService, public settings: ApplicationSettings) {
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
  families = new GridSettings(this.remult.repo(ActiveFamilyDeliveries), { knowTotalRows: true });
  pageSize = 7;

  async doFilter() {
    await this.busy.donotWait(async () => this.getRows());
  }
  async getRows() {

    await this.families.get({
      where: {
        name: { $contains: this.searchString },
        distributionCenter: this.remult.filterDistCenter(this.dialog.distCenter),
        deliverStatus: !this.showAllFamilies ? DeliveryStatus.SelfPickup : undefined
      },
      orderBy: { name: "asc" },
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
