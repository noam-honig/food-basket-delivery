import { Component, OnInit, ViewChild } from '@angular/core';
import { Route } from '@angular/router';

import { HolidayDeliveryAdmin, WeeklyFamilyVoulenteerGuard } from '../auth/auth-guard';
import { WeeklyFullFamilyInfo, WeeklyFamilies } from '../weekly-families/weekly-families';
import { Context } from '../shared/context';

import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatus, WeeklyFamilyDeliveryProducts, Products, WeeklyFamilyDeliveryProductStats, WeeklyDeliveryStats } from '../weekly-families-deliveries/weekly-families-deliveries';
import { DialogService } from '../select-popup/dialog';
import { BusyService } from '../select-popup/busy-service';
import { WeeklyFamilyDeliveryList } from '../weekly-family-delivery-product-list/weekly-family-delivery-product-list.component';
import { DataAreaSettings, ColumnSetting, DateColumn } from 'radweb';
import { SelectService } from '../select-popup/select-service';
import { RunOnServer } from '../auth/server-action';

@Component({
  selector: 'app-my-weekly-families',
  templateUrl: './my-weekly-families.component.html',
  styleUrls: ['./my-weekly-families.component.scss']
})
export class MyWeeklyFamiliesComponent implements OnInit {
  constructor(public context: Context, private dialog: DialogService, public busy: BusyService, private selectService: SelectService) {
  }
  lastStatus(f: WeeklyFullFamilyInfo) {
    let r = f.lastDeliveryStatus.displayValue;

    if (f.lastDeliveryStatus.listValue == WeeklyFamilyDeliveryStatus.Delivered)
      r += ' ' + f.lastDelivery.relativeDateName();
    return r;

  }
  onlyMyFamilies = true;
  searchString = '';
  clearSearch() {
    this.searchString = '';
  }



  showFamily(f: WeeklyFullFamilyInfo) {
    if (this.onlyMyFamilies && f.assignedHelper.value != this.context.info.helperId)
      return false;
    if (this.searchString)
      return f.name.value.indexOf(this.searchString) >= 0 || f.codeName.value.indexOf(this.searchString) >= 0
    return true;
  }
  deleteFamily(f: WeeklyFullFamilyInfo) {
    this.dialog.confirmDelete('משפחת ' + f.name.value, async () => {
      await f.delete();
      this.families.splice(this.families.indexOf(f), 1);
    });
  }
  newFamily() {
    let f = this.context.for(WeeklyFullFamilyInfo).create();
    f.assignedHelper.value = this.context.info.helperId;
    this.dialog.displayArea({
      title: 'משפחה חדשה',
      settings: {
        columnSettings: () => [
          f.name,
          f.codeName,
          f.assignedHelper.getColumn(this.selectService, h => h.weeklyFamilyVolunteer.isEqualTo(true)),
          f.packingComment,
        ]
      },
      ok: async () => {
        await f.save();
        this.families = [f, ...this.families];
      },
      cancel: () => {

      },
    });
  }
  countFamilies() {
    if (!this.families)
      return 0;
    return this.families.filter(f => this.showFamily(f)).length;
  }
  updateFamily(f: WeeklyFullFamilyInfo) {

    this.dialog.displayArea({
      title: 'עדכון פרטי משפחה',
      settings: {
        columnSettings: () => [
          f.name,
          f.codeName,
          f.assignedHelper.getColumn(this.selectService, h => h.weeklyFamilyVolunteer.isEqualTo(true)),
          f.packingComment,
        ]
      },
      ok: async () => {
        await f.save();
      },
      cancel: () => {
        f.reset();
      },
    });
  }

  stats: WeeklyDeliveryStats;
  async ngOnInit() {

    this.families = await this.context.for(WeeklyFullFamilyInfo).find({ orderBy: f => f.name, limit: 1000 });
    this.stats = await this.context.for(WeeklyDeliveryStats).findFirst();
  }
  families: WeeklyFullFamilyInfo[];
  currentFamilly: WeeklyFullFamilyInfo;
  async selectFamiliy(f: WeeklyFullFamilyInfo) {
    this.currentFamilly = null;
    this.deliveries = await this.context.for(WeeklyFamilyDeliveries).find({
      limit: 1000,
      where: wfd => wfd.familyId.isEqualTo(f.id),
      orderBy: wfd => [{ column: wfd.ordnial, descending: true }]
    });


    this.currentFamilly = f;
  }


  deliveryList = new WeeklyFamilyDeliveryList(this.context, this.busy, this.selectService, this.dialog, d => {
    this.deliveries.splice(this.deliveries.indexOf(d), 1);
  }, () => { });
  statusText(d: WeeklyFamilyDeliveries) {
    var x = d.status.displayValue;
    if (d.status.listValue == WeeklyFamilyDeliveryStatus.Delivered)
      x += ' ' + d.deliveredOn.relativeDateName();
    return x;
  }

  loading = false;






  static route: Route = {
    path: 'my-weekly-families',
    component: MyWeeklyFamiliesComponent,
    data: { name: 'משפחות שבועיות' }, canActivate: [WeeklyFamilyVoulenteerGuard]
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
    wfd.assignedHelper.value = f.assignedHelper.value;
    await wfd.save();
    this.deliveries.splice(0, 0, wfd);
    if (this.deliveries.length > 1) {
      this.dialog.YesNoQuestion('האם להעתיק את המוצרים מהמשלוח האחרון ' + this.deliveries[1].deliveredOn.relativeDateName() + '?', async () => {
        (await this.context.for(WeeklyFamilyDeliveryProducts).find({
          limit: 1000,
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



  isDelivered(d: WeeklyFamilyDeliveries) {
    return d.status.listValue == WeeklyFamilyDeliveryStatus.Delivered;
  }
  saveIfNeeded(d: WeeklyFamilyDeliveries) {
    if (d.wasChanged())
      d.save();


  }

}
