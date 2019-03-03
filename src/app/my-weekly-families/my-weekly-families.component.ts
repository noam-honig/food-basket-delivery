import { Component, OnInit, ViewChild } from '@angular/core';
import { Route } from '@angular/router';

import { HolidayDeliveryAdmin, WeeklyFamilyVoulenteerGuard } from '../auth/auth-guard';
import { WeeklyFullFamilyInfo } from '../weekly-families/weekly-families';
import { Context } from '../shared/context';

import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatus, WeeklyFamilyDeliveryProducts, Products, WeeklyFamilyDeliveryProductStats } from '../weekly-families-deliveries/weekly-families-deliveries.component';
import { ItemId } from '../events/ItemId';
import { DialogService } from '../select-popup/dialog';
import { MatCheckboxChange } from '@angular/material';
import { DateTimeColumn } from '../model-shared/types';
import { diPublic } from '@angular/core/src/render3/di';
import { platform } from 'os';
import { BusyService } from '../select-popup/busy-service';
@Component({
  selector: 'app-my-weekly-families',
  templateUrl: './my-weekly-families.component.html',
  styleUrls: ['./my-weekly-families.component.scss']
})
export class MyWeeklyFamiliesComponent implements OnInit {




  constructor(private context: Context, private dialog: DialogService, public busy: BusyService) {


  }

  async ngOnInit() {

    this.families = await this.context.for(WeeklyFullFamilyInfo).find({
      where: f => f.assignedHelper.isEqualTo(this.context.info.helperId)
    });
  }
  families: WeeklyFullFamilyInfo[];
  currentFamilly: WeeklyFullFamilyInfo;
  async selectFamiliy(f: WeeklyFullFamilyInfo) {
    this.currentFamilly = null;
    this.deliveries = await this.context.for(WeeklyFamilyDeliveries).find({
      where: wfd => wfd.familyId.isEqualTo(f.id),
      orderBy: wfd => [{ column: wfd.ordnial, descending: true }]
    });


    this.currentFamilly = f;
  }
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
  statusText(d: WeeklyFamilyDeliveries) {
    var x = d.status.displayValue;
    if (d.status.listValue == WeeklyFamilyDeliveryStatus.Delivered)
      x += ' ' + d.deliveredOn.relativeDateName();
    return x;
  }
  allowDelete(d: WeeklyFamilyDeliveries) {
    return d.status.listValue == WeeklyFamilyDeliveryStatus.Prepare;
  }
  async deleteDelivery(d: WeeklyFamilyDeliveries) {
    await this.dialog.confirmDelete("המשלוח", async () => {
      await d.delete();
      this.deliveries.splice(this.deliveries.indexOf(d), 1);

    });
  }
  loading = false;
  deliveryProducts: WeeklyFamilyDeliveryProductStats[] = []

  searchString: string = '';
  lastFilter: string = '';
  showAllProducts = false;
  shouldShowShowAllProductsCheckbox() {

    return this.currentDelivery&& this.currentDelivery.status.listValue != WeeklyFamilyDeliveryStatus.Prepare && this.searchString == '';
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



  add(p: WeeklyFamilyDeliveryProductStats, d: WeeklyFamilyDeliveries, i: number) {


    var newValue = +(p.requestQuanity.value) + i;
    if (newValue >= 0) {
      p.requestQuanity.value = newValue;
      p.saveQuantities(this.busy);
    }
  }



  static route: Route = {
    path: 'my-weekly-families',
    component: MyWeeklyFamiliesComponent,
    data: { name: 'משפחות שבועיות שלי' }, canActivate: [WeeklyFamilyVoulenteerGuard]
  }
  deliveries: WeeklyFamilyDeliveries[] = [];
  showNew() {
    let result = true;
    this.deliveries.forEach(x => {
      if (x.status.listValue != WeeklyFamilyDeliveryStatus.Delivered)
        result = false;

    });
    return result;
  }
  async preparePackage() {
    const f = this.currentFamilly;
    var wfd = this.context.for(WeeklyFamilyDeliveries).create();
    wfd.familyId.value = f.id.value;
    await wfd.save();
    this.deliveries.splice(0, 0, wfd);
    if (this.deliveries.length > 1) {
      this.dialog.YesNoQuestion('האם להעתיק את המוצרים מהמשלוח האחרון ' + this.deliveries[1].deliveredOn.relativeDateName() + '?', async () => {
        (await this.context.for(WeeklyFamilyDeliveryProducts).find({
          where: p => p.delivery.isEqualTo(this.deliveries[1].id).and(
            p.requestQuanity.IsGreaterOrEqualTo(1))
        })).forEach(async p => {
          var c = this.context.for(WeeklyFamilyDeliveryProducts).create();
          c.delivery.value = this.deliveries[0].id.value;
          c.product.value = p.product.value;
          c.requestQuanity.value = p.requestQuanity.value;
          await c.save();
        });

      });
    }


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
  displayRequestQuantity(d: WeeklyFamilyDeliveries) {
    return d.status.listValue == WeeklyFamilyDeliveryStatus.Prepare;
  }

  totalItems(d: WeeklyFamilyDeliveries) {
    let x = 0;
    this.deliveryProducts.forEach(p => x += p.requestQuanity.value);
    return x;

  }
  nextDisabled(d: WeeklyFamilyDeliveries) {
    if (!d.status.listValue.next.disabled)
      return false;
    return d.status.listValue.next.disabled({
      hasRequestItems: () => this.totalItems(d) > 0
    });

  }
  isDelivered(d: WeeklyFamilyDeliveries) {
    return d.status.listValue == WeeklyFamilyDeliveryStatus.Delivered;
  }
  saveIfNeeded(d: WeeklyFamilyDeliveries) {
    if (d.wasChanged())
      d.save();


  }

}
