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
      where: dp => dp.delivery.isEqualTo(d.id)
    });
  }
  loading = false;
  deliveryProducts: WeeklyFamilyDeliveryProductStats[] = []
  


  add(p: WeeklyFamilyDeliveryProductStats, d: WeeklyFamilyDeliveries, i: number) {


    var newValue = +(p.requestQuanity.value) + i;
    if (newValue >= 0) {
      p.requestQuanity.value = newValue;
      p.saveQuantities();
    }
  }



  static route: Route = {
    path: 'my-weekly-families',
    component: MyWeeklyFamiliesComponent,
    data: { name: 'משפחות שבועיות שלי' }, canActivate: [WeeklyFamilyVoulenteerGuard]
  }
  deliveries: WeeklyFamilyDeliveries[];
  async preparePackage() {
    const f = this.currentFamilly;
    var wfd = this.context.for(WeeklyFamilyDeliveries).create();
    wfd.familyId.value = f.id.value;
    await wfd.save();
    this.deliveries.splice(0, 0, wfd);
  }
  displayProduct(p: WeeklyFamilyDeliveryProductStats) {
    if (this.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Prepare)
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
