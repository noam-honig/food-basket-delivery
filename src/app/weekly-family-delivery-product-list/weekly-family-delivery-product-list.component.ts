import { Component, OnInit, Input } from '@angular/core';
import { WeeklyFamilyDeliveryProductStats, WeeklyFamilyDeliveries, Products, WeeklyFamilyDeliveryStatus } from '../weekly-families-deliveries/weekly-families-deliveries';
import { BusyService } from '../select-popup/busy-service';
import { Context } from '../shared/context';

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
  constructor(private context: Context, public busy: BusyService) {

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
  test(){
    return true;
  }
  totalItems(d: WeeklyFamilyDeliveries) {
    let x = 0;
    this.deliveryProducts.forEach(p => x += p.requestQuanity.value);
    return x;
  }

}
