import { Component, OnInit, ViewChild } from '@angular/core';
import { Route } from '@angular/router';
import { Context, DateColumn, ServerFunction, SqlDatabase } from '@remult/core';
import { toInt } from 'ngx-bootstrap/chronos/utils/type-checks';

import { distCenterAdminGuard, Roles } from '../auth/roles';
import { DateRangeComponent } from '../date-range/date-range.component';
import { BasketType } from '../families/BasketType';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Families } from '../families/families';
import { ActiveFamilyDeliveries, FamilyDeliveries, MessageStatus } from '../families/FamilyDeliveries';
import { FamilyStatus } from '../families/FamilyStatus';
import { Helpers } from '../helpers/helpers';
import { SqlBuilder } from '../model-shared/types';

@Component({
  selector: 'app-weekly-report-mlt',
  templateUrl: './weekly-report-mlt.component.html',
  styleUrls: ['./weekly-report-mlt.component.scss']
})
export class WeeklyReportMltComponent implements OnInit {
  @ViewChild(DateRangeComponent, { static: true }) dateRange;

  

  constructor(public context: Context) { }

  
  totalDonations = 0;
  addedDonations = 0;
  addedCollected = 0;
  addedReceived = 0;
//  totalPerBasket: {basketType: string, total: number, added: number, collected: number, received: number} [] = [];
  totalPerBasket = [];

  totalVolunteers = 0;
  totalDonors = 0;
  addedVolunteers = 0;
  addedDonors = 0;

  avgFamiliesPerVolunteer = '0';

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    let totals = await WeeklyReportMltComponent.getEquipmentStatusTotals(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue);
    this.totalPerBasket = totals;
    this.totalDonations = 0;
    this.addedDonations = 0;
    this.addedCollected = 0;
    this.addedReceived = 0;
  for (const b of totals) {
      this.totalDonations += b.total;
      this.addedDonations += b.added;
      this.addedCollected += b.collected;
      this.addedReceived += b.received;
    
    }

    let volData = await WeeklyReportMltComponent.getVolunteersData(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue);
    this.totalVolunteers = volData.total;
    this.addedVolunteers = volData.added;

    let donorsData = await WeeklyReportMltComponent.getDonorsData(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue);
    this.totalDonors = donorsData.total;
    this.addedDonors = donorsData.added;

    this.avgFamiliesPerVolunteer = await WeeklyReportMltComponent.getVolunteerAverage(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue);
    
  }

  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async getEquipmentStatusTotals(fromDate?: string, toDate?: string, context?: Context, db?: SqlDatabase) {
    let totalPerBasket: {basketType: string, total: number, added: number, collected: number, received: number} [] = [];
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);

      
    let f = context.for(FamilyDeliveries).create();
    let sql = new SqlBuilder();
    sql.addEntity(f,"FamilyDeliveries")
    let baskets = await db.execute(sql.build(sql.query({
        select: () => [f.basketType,
          sql.build('sum (', sql.case([{ when: [f.deliverStatus.isNotProblem()], then: f.quantity }], 0), ') total'),
          sql.build('sum (', sql.case([{ when: [f.deliverStatus.isNotProblem().and(f.createDate.isLessOrEqualTo(toDateDate)).and(f.createDate.isGreaterThan(fromDateDate))], then: f.quantity }], 0), ') added'),
          sql.build('sum (', sql.case([{ when: [f.deliverStatus.isSuccess().and(f.createDate.isLessOrEqualTo(toDateDate)).and(f.createDate.isGreaterThan(fromDateDate))], then: f.quantity }], 0), ') collected'),
          sql.build('sum (', sql.case([{ when: [f.notActive().and(f.deliverStatus.isSuccess().and(f.createDate.isLessOrEqualTo(toDateDate)).and(f.createDate.isGreaterThan(fromDateDate)))], then: f.quantity }], 0), ') received'),
        ],
        from: f,
        where: () => ['true']
    }), ' group by ', f.basketType));
    for (const r of baskets.rows) {
        let basketId = r[baskets.getColumnKeyInResultForIndexInSelect(0)];
        let b = await context.for(BasketType).lookupAsync(b=>b.id.isEqualTo(basketId));
        totalPerBasket.push({
            basketType: b.name.value,
            total: +r['total'],
            added: +r['added'],
            collected: +r['collected'],
            received: +r['received']
        });
    }

    return totalPerBasket;
    
  }


  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async getVolunteersData(fromDate?: string, toDate?: string, context?: Context, db?: SqlDatabase) {
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);
      
    let h = context.for(Helpers).create();
    let sql = new SqlBuilder();
    sql.addEntity(h,"Helpers")
    let counters = (await db.execute(sql.build(sql.query({
        select: () => [
          sql.build('count (*) total'),
          sql.build('sum (', sql.case([{ when: [h.createDate.isLessOrEqualTo(toDateDate).and(h.createDate.isGreaterThan(fromDateDate))], then: 1 }], 0), ') added'),
        ],
        from: h,
        where: () => [h.archive.isEqualTo(false)]
    })))).rows[0];

    let total = counters['total'];
    let added = counters['added'];

    return {total, added};
    
  }


  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async getDonorsData(fromDate?: string, toDate?: string, context?: Context, db?: SqlDatabase) {
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);
      
    let f = context.for(Families).create();
    let sql = new SqlBuilder();
    sql.addEntity(f,"Families")
    let counters = (await db.execute(sql.build(sql.query({
        select: () => [
          sql.build('count (*) total'),
          sql.build('sum (', sql.case([{ when: [f.createDate.isLessOrEqualTo(toDateDate).and(f.createDate.isGreaterThan(fromDateDate))], then: 1 }], 0), ') added'),
        ],
        from: f,
        where: () => [f.status.isEqualTo(FamilyStatus.Active)]
    })))).rows[0];

    let total = counters['total'];
    let added = counters['added'];

    return {total, added};
    
  }


  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async getVolunteerAverage(fromDate?: string, toDate?: string, context?: Context, db?: SqlDatabase) {
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);

      
    let f = context.for(FamilyDeliveries).create();
    let sql = new SqlBuilder();
    sql.addEntity(f,"FamilyDeliveries")
    let deliveries = await db.execute(sql.build(sql.query({
        select: () => [f.courier,
          sql.build('count (distinct ', f.family, ') total'),
        ],
        from: f,
        where: () => [f.deliverStatus.isSuccess().and(f.createDate.isLessOrEqualTo(toDateDate).and(f.createDate.isGreaterThan(fromDateDate)))]
      }), ' group by ', f.courier));

    let couriers = 0;
    let totFamilies : number = 0;
    for (const r of deliveries.rows) {
      totFamilies += +r['total'];
      couriers++;
    }

    return (totFamilies / couriers).toFixed(1);
    
  }
}
