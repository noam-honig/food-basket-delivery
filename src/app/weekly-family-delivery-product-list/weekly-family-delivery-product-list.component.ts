import { Component, OnInit, Input } from '@angular/core';
import { WeeklyFamilyDeliveryProductStats, WeeklyFamilyDeliveries, Products, WeeklyFamilyDeliveryStatus } from '../weekly-families-deliveries/weekly-families-deliveries';

import { Context } from 'radweb';
import { DateColumn, ColumnSetting } from 'radweb';
import { SelectService } from '../select-popup/select-service';
import { DialogService } from '../select-popup/dialog';
import { BusyService } from 'radweb';

@Component({
  selector: 'app-weekly-family-delivery-product-list',
  templateUrl: './weekly-family-delivery-product-list.component.html',
  styleUrls: ['./weekly-family-delivery-product-list.component.scss']
})
export class WeeklyFamilyDeliveryProductListComponent implements OnInit {

  constructor() { }
  @Input() list: WeeklyFamilyDeliveryList;
  ngOnInit() {
  }

}

export class WeeklyFamilyDeliveryList {
  constructor(public context: Context, public busy: BusyService, private selectService: SelectService, private dialog: DialogService,
    private removeDelivery: (d: WeeklyFamilyDeliveries) => void, private onStatusChange: () => void) {

  }
  markAll() {
    for (const products of this.deliveryProducts) {
      if (products.Quantity.value == 0 && products.requestQuanity.value > 0) {
        products.Quantity.value = products.requestQuanity.value;
        products.saveQuantities(this.busy);
      }
    }
  }
  showMarkAll() {
    return this.currentDelivery.status.value != WeeklyFamilyDeliveryStatus.Prepare;
  }
  canUpdateDelivery() {
    return this.currentDelivery.currentUserAllowedToUpdate();
  }
  deliveryProducts: WeeklyFamilyDeliveryProductStats[] = [];
  searchString: string = '';
  lastFilter: string = '';
  showAllProducts = false;
  currentDelivery: WeeklyFamilyDeliveries;
  async selectDelivery(d: WeeklyFamilyDeliveries) {
    this.currentDelivery = d;
    this.deliveryProducts = await this.context.for(WeeklyFamilyDeliveryProductStats).find({
      where: dp => dp.delivery.isEqualTo(d.id),
      orderBy: dp => [dp.productOrder, dp.productName],
      limit: 1000
    });

    this.searchString = '';
    this.showAllProducts = false;
  }

  async changeStatus(s: WeeklyFamilyDeliveryStatus) {
    await this.currentDelivery.changeStatus(s);
    this.onStatusChange();
  }
  updateDelivery() {
    let d = this.currentDelivery;
    let dc = new DateColumn('נמסר בתאריך');
    dc.value = d.deliveredOn.value;
    let cols: ColumnSetting<any>[] = [d.assignedHelper.getColumn(this.selectService, h => h.weeklyFamilyVolunteer.isEqualTo(true))];
    if (d.status.value == WeeklyFamilyDeliveryStatus.Delivered) {
      cols.push(dc),
        cols.push(d.deliveredBy.getColumn(this.selectService, h => h.weeklyFamilyVolunteer.isEqualTo(true)));
    }
    this.dialog.displayArea({
      title: 'עדכון פרטי משלוח',
      settings: {
        columnSettings: () => [...cols
        ]
      },
      ok: () => {
        if (d.deliveredOn.getStringForInputDate() != dc.rawValue) {
          d.deliveredOn.value = new Date(dc.value.getFullYear(), dc.value.getMonth(), dc.value.getDate(), d.deliveredOn.value.getHours(), d.deliveredOn.value.getMinutes());
        }

        d.save();
      },
      cancel: () => {
        d.reset();
      },
    });
  }
  shouldShowShowAllProductsCheckbox() {

    return this.currentDelivery && this.currentDelivery.status.value != WeeklyFamilyDeliveryStatus.Prepare && this.searchString == '';
  }
  clearSearch() {
    this.searchString = '';

  }
  async addProduct() {
    let p = this.context.for(Products).create();
    p.name.value = this.searchString;
    p.order.value = 50;
    await p.save();
    let dp = new WeeklyFamilyDeliveryProductStats(this.context);
    dp.product.value = p.id.value;
    dp.productName.value = p.name.value;
    dp.delivery.value = this.currentDelivery.id.value;
    if (this.currentDelivery.status.value == WeeklyFamilyDeliveryStatus.Prepare)
      dp.requestQuanity.value = 1;
    else
      dp.Quantity.value = 1;
    this.deliveryProducts.splice(0, 0, dp);

    await dp.saveQuantities(this.busy);
    this.clearSearch();
  }



  add(p: WeeklyFamilyDeliveryProductStats, i: number) {


    var newValue = +(p.requestQuanity.value) + i;
    if (newValue >= 0) {
      p.requestQuanity.value = newValue;
      p.saveQuantities(this.busy);
    }
  }
  noSuchProduct() {
    return this.searchString && !this.deliveryProducts.find(p => p.productName.value.indexOf(this.searchString) >= 0);
  }
  displayProduct(p: WeeklyFamilyDeliveryProductStats) {
    if (this.searchString)
      return p.productName.value.indexOf(this.searchString) >= 0;

    if (this.currentDelivery.status.value == WeeklyFamilyDeliveryStatus.Prepare)
      return true;

    if (this.showAllProducts)
      return true;
    return p.requestQuanity.value > 0;
  }
  displayRequestQuantity() {
    return this.currentDelivery.status.value == WeeklyFamilyDeliveryStatus.Prepare;
  }
  test() {
    return true;
  }
  totalItems() {
    let x = 0;
    this.deliveryProducts.forEach(p => x += p.requestQuanity.value);
    return x;
  }
  nextDisabled() {
    if (!this.currentDelivery.status.value.next.disabled)
      return false;
    return this.currentDelivery.status.value.next.disabled({
      hasRequestItems: () => this.totalItems() > 0
    });
  }
  allowNextStatus() {
    if (!this.currentDelivery.currentUserAllowedToUpdate())
      return this.currentDelivery.status.value == WeeklyFamilyDeliveryStatus.Pack;
    return this.currentDelivery.status.value.next;
  }
  allowPreviousStatus() {
    if (!this.currentDelivery.currentUserAllowedToUpdate())
      return this.currentDelivery.status.value == WeeklyFamilyDeliveryStatus.Ready;
    return this.currentDelivery.status.value.prev;
  }
  allowDelete() {
    return this.currentDelivery.currentUserAllowedToUpdate() && this.currentDelivery.status.value == WeeklyFamilyDeliveryStatus.Prepare;
  }
  async deleteDelivery() {
    await this.dialog.confirmDelete("המשלוח", async () => {
      await this.currentDelivery.delete();
      this.removeDelivery(this.currentDelivery);


    });
  }

}
