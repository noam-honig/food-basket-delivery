import { Component, OnInit, OnDestroy } from '@angular/core'
import { Route } from '@angular/router'

import { BusyService } from '../common-ui-elements'
import { remult } from 'remult'

import { DeliveryStatus } from '../families/DeliveryStatus'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { distCenterOrLabGuard } from '../auth/guards'
import { DialogService, DestroyHelper } from '../select-popup/dialog'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { GridSettings } from '../common-ui-elements/interfaces'

@Component({
  selector: 'app-self-pickup',
  templateUrl: './self-pickup.component.html',
  styleUrls: ['./self-pickup.component.scss']
})
export class SelfPickupComponent implements OnInit, OnDestroy {
  static route: Route = {
    path: 'self-pickup-families',
    component: SelfPickupComponent,
    canActivate: [distCenterOrLabGuard],
    data: {
      name: 'באים לקחת',
      seperator: true
    }
  }

  constructor(
    private busy: BusyService,
    private dialog: DialogService,
    public settings: ApplicationSettings
  ) {
    this.dialog.onDistCenterChange(async () => {
      this.getRows()
    }, this.destroyHelper)
  }
  destroyHelper = new DestroyHelper()
  ngOnDestroy(): void {
    this.destroyHelper.destroy()
  }
  searchString: string = ''
  showAllFamilies = false
  families: ActiveFamilyDeliveries[] = []
  totalRows = 0
  pageSize = 7

  async doFilter() {
    await this.busy.donotWait(async () => this.getRows())
  }
  async getRows() {
    const q = remult.repo(ActiveFamilyDeliveries).query({
      where: {
        name: { $contains: this.searchString },
        distributionCenter: remult.context.filterDistCenter(
          this.dialog.distCenter
        ),
        deliverStatus: !this.showAllFamilies
          ? DeliveryStatus.SelfPickup
          : undefined
      },
      orderBy: { name: 'asc' },
      pageSize: this.pageSize
    })
    return Promise.all([
      q.count().then((rows) => (this.totalRows = rows)),
      q.getPage(0).then((rows) => (this.families = rows))
    ])
  }
  clearHelper() {
    this.searchString = ''
    this.doFilter()
  }

  showStatus(f: ActiveFamilyDeliveries) {
    if (f.deliverStatus == DeliveryStatus.ReadyForDelivery) {
      if (f.courier) {
        return 'משוייך למתנדב'
      } else {
        return ''
      }
    }
    return f.deliverStatus.caption
  }
  async ngOnInit() {
    this.busy.donotWait(async () => await this.getRows())
  }
  moreFamilies() {
    this.pageSize += 7
    this.getRows()
  }
}
