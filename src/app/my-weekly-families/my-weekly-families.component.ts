import { Component, OnInit, ViewChild } from '@angular/core';
import { Route } from '@angular/router';

import { AdminGuard } from '../auth/auth-guard';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { Context } from '../shared/context';

import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatus, WeeklyFamilyDeliveryProducts, Products } from '../weekly-families-deliveries/weekly-families-deliveries.component';
import { ItemId } from '../events/ItemId';
import { DialogService } from '../select-popup/dialog';
import { MatCheckboxChange } from '@angular/material';
@Component({
  selector: 'app-my-weekly-families',
  templateUrl: './my-weekly-families.component.html',
  styleUrls: ['./my-weekly-families.component.scss']
})
export class MyWeeklyFamiliesComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService) {


  }
  @ViewChild('myDiv') myDiv: any;
  async ngOnInit() {
    this.products = await this.context.for(Products).find();
    this.families = await this.context.for(WeeklyFamilies).find({
      //  where: f => f.assignedHelper.isEqualTo(this.context.info.helperId)
    });
  }
  families: WeeklyFamilies[];
  currentFamilly: WeeklyFamilies;
  async selectFamiliy(f: WeeklyFamilies) {
    this.currentFamilly = null;
    this.deliveries = await this.context.for(WeeklyFamilyDeliveries).find({
      where: wfd => wfd.familyId.isEqualTo(f.id),
      orderBy: wfd => [{ column: wfd.ordnial, descending: true }]
    });

    this.weeklyFamilyDeliveryProductsCache = {};
    for (let d of this.deliveries) {
      this.weeklyFamilyDeliveryProductsCache[d.id.value] = {};
      let xx = await this.context.for(WeeklyFamilyDeliveryProducts).find({ where: wfdp => wfdp.delivery.isEqualTo(d.id) });
      for (let x of xx)
        this.weeklyFamilyDeliveryProductsCache[x.delivery.value][x.product.value] = x;
    };
    this.currentFamilly = f;
  }
  loading = false;
  weeklyFamilyDeliveryProductsCache: { [deliveryId: string]: { [productId: string]: WeeklyFamilyDeliveryProducts } } = {};

  quantity(p: Products, d: WeeklyFamilyDeliveries) {
    var r: WeeklyFamilyDeliveryProducts;

    let r1 = this.weeklyFamilyDeliveryProductsCache[d.id.value];
    if (!r1) {
      this.weeklyFamilyDeliveryProductsCache[d.id.value] = {};
    }
    r = r1[p.id.value];

    if (!r) {
      r1[p.id.value] = this.context.for(WeeklyFamilyDeliveryProducts).create();
      r = r1[p.id.value];
    }
    //    const r = this.context.for(WeeklyFamilyDeliveryProducts).lookup(wfdp => wfdp.product.isEqualTo(p.id).and(wfdp.delivery.isEqualTo(d.id)));
    if (r.isNew()) {
      if (!r.requestQuanity.value)
        r.requestQuanity.value = 0;
      r.delivery.value = d.id.value;
      r.product.value = p.id.value;
    }
    return r;
  }
  add(p: Products, d: WeeklyFamilyDeliveries, i: number) {
    let q = this.quantity(p, d);
    var newValue = +(q.requestQuanity.value) + i;
    if (newValue >= 0) {
      q.requestQuanity.value = newValue;
      q.save();
    }
  }

  products: Products[];
  static route: Route = {
    path: 'my-weekly-families',
    component: MyWeeklyFamiliesComponent,
    data: { name: 'משפחות שבועיות שלי' }, canActivate: [AdminGuard]
  }
  deliveries: WeeklyFamilyDeliveries[];
  async preparePackage() {
    const f = this.currentFamilly;
    var wfd = this.context.for(WeeklyFamilyDeliveries).create();
    wfd.familyId.value = f.id.value;
    await wfd.save();
    this.deliveries.splice(0, 0, wfd);
  }
  displayProduct(p: Products, d: WeeklyFamilyDeliveries) {
    if (d.status.listValue == WeeklyFamilyDeliveryStatus.Prepare)
      return true;
    return this.quantity(p, d).requestQuanity.value > 0;
  }
  displayRequestQuantity(d: WeeklyFamilyDeliveries) {
    return d.status.listValue == WeeklyFamilyDeliveryStatus.Prepare;
  }

  totalItems(d: WeeklyFamilyDeliveries) {
    let x = 0;
    this.products.forEach(p => x += this.quantity(p, d).requestQuanity.value);
    return x;
  }
}
