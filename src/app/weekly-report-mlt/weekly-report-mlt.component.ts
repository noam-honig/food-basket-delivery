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
import { RegisterURL, urlDbOperator } from '../resgister-url/regsiter-url';

@Component({
  selector: 'app-weekly-report-mlt',
  templateUrl: './weekly-report-mlt.component.html',
  styleUrls: ['./weekly-report-mlt.component.scss']
})
export class WeeklyReportMltComponent implements OnInit {
  @ViewChild(DateRangeComponent, { static: true }) dateRange;

  

  constructor(public context: Context) { }

  
  totalPerBasket = [];
  allBaskets = new Set();
  donorsData = [];
  volData = [];

  registerUrls = new Set();
  selectedUrl = '';

  avgFamiliesPerVolunteer = '0';

  ngOnInit() {
  }
  ngAfterViewInit() {
    this.refresh();
  }

  async refresh() {
    RegisterURL.loadUrlsFromTables();
    this.totalPerBasket = await WeeklyReportMltComponent.getEquipmentStatusTotals(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue);
    this.allBaskets.clear();
    this.totalPerBasket.forEach(item=>{
      if (!this.allBaskets.has(item.baskettype) && (item.baskettype) && (item.baskettype!='')) {
        this.allBaskets.add(item.baskettype)
      }
    });

    this.volData = await WeeklyReportMltComponent.getVolunteersData(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue);
    this.donorsData = await WeeklyReportMltComponent.getDonorsData(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue);

    let mergedArray = [...this.volData, ...this.donorsData, ...this.totalPerBasket]

    mergedArray.forEach(item => {
      if (!this.registerUrls.has(item.prettyname)) {
        this.registerUrls.add(item.prettyname)
      }
    });

    this.avgFamiliesPerVolunteer = await WeeklyReportMltComponent.getVolunteerAverage(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue);
    
  }

  getDonationsSummary(key: string, basket?: string, url?: string) {
    let object = this.totalPerBasket.find(item=>{
      return ((item.URLGroup == (!url)) || (item.prettyname==url)) &&
             ((item.URLGroup == (!basket)) || (item.baskettype==basket));
    });
    if (!object) return "NONE";
    return +object[key];
  }

  getDonorsData(key:string, url?: string) {
    let object = this.donorsData.find(item=>{
      return ((item.URLGroup == (!url)) || (item.prettyname==url));
    });
    if (!object) return "NONE";
    return +object[key];
  }

  getVolData(key:string, url?: string) {
    let object = this.volData.find(item=>{
      return ((item.URLGroup == (!url)) || (item.prettyname==url));
    });
    if (!object) return "NONE";
    return +object[key];
  }

  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async getEquipmentStatusTotals(fromDate?: string, toDate?: string, context?: Context, db?: SqlDatabase) {
    let totalPerBasket: {URL: string, basketType: string, total: number, added: number, collected: number, received: number} [] = [];
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);

      
    let fd = context.for(FamilyDeliveries).create();
    let u = context.for(RegisterURL).create();

    let sql = new SqlBuilder();
    sql.addEntity(fd,"fd")

    let q = sql.build(sql.query({
        select: () => [
          sql.build('grouping(',fd.basketType,') basketGroup'),
          fd.basketType,
          sql.build('grouping(',u.prettyName,') URLGroup'),
          u.prettyName,
          sql.build('sum (', sql.case([{ when: [fd.deliverStatus.isNotProblem()], then: fd.quantity }], 0), ') total'),
          sql.build('sum (', sql.case([{ when: [fd.deliverStatus.isNotProblem().and(fd.createDate.isLessOrEqualTo(toDateDate)).and(fd.createDate.isGreaterThan(fromDateDate))], then: fd.quantity }], 0), ') added'),
          sql.build('sum (', sql.case([{ when: [fd.deliverStatus.isSuccess().and(fd.createDate.isLessOrEqualTo(toDateDate)).and(fd.createDate.isGreaterThan(fromDateDate))], then: fd.quantity }], 0), ') collected'),
          sql.build('sum (', sql.case([{ when: [fd.notActive().and(fd.deliverStatus.isSuccess().and(fd.createDate.isLessOrEqualTo(toDateDate)).and(fd.createDate.isGreaterThan(fromDateDate)))], then: fd.quantity }], 0), ') received'),
        ],
        from: fd,
        innerJoin: () => [
          { to: u, on: () => [sql.build(urlDbOperator('(select f.custom1 from Families f where fd.family=f.id limit 1)'),' like ',u.URL)] }
        ],
        where: () => ['true']
    }), ' group by cube(', fd.basketType, ', ',  u.prettyName, ')');

    let baskets = await db.execute(q);
    return baskets.rows;
  }


  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async getVolunteersData(fromDate?: string, toDate?: string, context?: Context, db?: SqlDatabase) {
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);
      
    let h = context.for(Helpers).create();
    let u = context.for(RegisterURL).create();

    let sql = new SqlBuilder();
      
    let q = sql.build(sql.query({
        select: () => [
          sql.build('grouping(',u.prettyName,') URLGroup'),
          u.prettyName,
          sql.build('count (*) total'),
          sql.build('sum (', sql.case([{ when: [h.createDate.isLessOrEqualTo(toDateDate).and(h.createDate.isGreaterThan(fromDateDate))], then: 1 }], 0), ') added'),
        ],
        from: h,
        innerJoin: () => [{ to: u, on: () => [sql.build(urlDbOperator(h.referredBy.defs.dbName), ' like ',u.URL)] }],
        where: () => [h.archive.isEqualTo(false)]
      }), ' group by cube(', u.prettyName, ')'
    );

    return (await db.execute(q)).rows;
  }


  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async getDonorsData(fromDate?: string, toDate?: string, context?: Context, db?: SqlDatabase) {
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);
      
    let u = context.for(RegisterURL).create();
    let f = context.for(Families).create();
    let sql = new SqlBuilder();
    
    let q = sql.build(sql.query({
        select: () => [
          sql.build('grouping(',u.prettyName,') URLGroup'),
          u.prettyName,
          sql.build('count (*) total'),
          sql.build('sum (', sql.case([{ when: [f.createDate.isLessOrEqualTo(toDateDate).and(f.createDate.isGreaterThan(fromDateDate))], then: 1 }], 0), ') added'),
        ],
        from: f,
        innerJoin: () => [{ to: u, on: () => [sql.build(urlDbOperator(f.custom1.defs.dbName), ' like ',u.URL)] }],
        where: () => [f.status.isEqualTo(FamilyStatus.Active)]
      }), ' group by cube(', u.prettyName, ')'
    );
  
    return (await db.execute(q)).rows;
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
