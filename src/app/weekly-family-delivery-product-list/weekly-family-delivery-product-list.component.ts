import { Component, OnInit, Input } from '@angular/core';
import { WeeklyFamilyDeliveryProductStats, WeeklyFamilyDeliveries, Products, WeeklyFamilyDeliveryStatus } from '../weekly-families-deliveries/weekly-families-deliveries';
import { BusyService } from '../select-popup/busy-service';
import { Context } from '../shared/context';
import { DateColumn, ColumnSetting } from 'radweb';
import { SelectService } from '../select-popup/select-service';
import { DialogService } from '../select-popup/dialog';
import { WeeklyFamilies } from '../weekly-families/weekly-families';

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
      orderBy: dp => [dp.productOrder, dp.productName]
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
    dc.dateValue = d.deliveredOn.dateValue;
    let cols: ColumnSetting<any>[] = [d.assignedHelper.getColumn(this.selectService, h => h.weeklyFamilyVolunteer.isEqualTo(true))];
    if (d.status.listValue == WeeklyFamilyDeliveryStatus.Delivered) {
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
        if (d.deliveredOn.getStringForInputDate() != dc.value) {
          d.deliveredOn.dateValue = new Date(dc.dateValue.getFullYear(), dc.dateValue.getMonth(), dc.dateValue.getDate(), d.deliveredOn.dateValue.getHours(), d.deliveredOn.dateValue.getMinutes());
        }

        d.save();
      },
      cancel: () => {
        d.reset();
      },
    });
  }
  shouldShowShowAllProductsCheckbox() {

    return this.currentDelivery && this.currentDelivery.status.listValue != WeeklyFamilyDeliveryStatus.Prepare && this.searchString == '';
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
    dp.requestQuanity.value = 1;
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

    if (this.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Prepare)
      return true;

    if (this.showAllProducts)
      return true;
    return p.requestQuanity.value > 0;
  }
  displayRequestQuantity() {
    return this.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Prepare;
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
    if (!this.currentDelivery.status.listValue.next.disabled)
      return false;
    return this.currentDelivery.status.listValue.next.disabled({
      hasRequestItems: () => this.totalItems() > 0
    });
  }
  allowNextStatus() {
    if (!this.currentDelivery.currentUserAllowedToUpdate())
      return this.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Pack;
    return this.currentDelivery.status.listValue.next;
  }
  allowPreviousStatus() {
    if (!this.currentDelivery.currentUserAllowedToUpdate())
      return this.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Ready;
    return this.currentDelivery.status.listValue.prev;
  }
  allowDelete() {
    return this.currentDelivery.currentUserAllowedToUpdate() && this.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Prepare;
  }
  async deleteDelivery() {
    await this.dialog.confirmDelete("המשלוח", async () => {
      await this.currentDelivery.delete();
      this.removeDelivery(this.currentDelivery);


    });
  }

}
