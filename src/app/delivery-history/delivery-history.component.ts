import { Component, OnInit, ViewChild } from '@angular/core';
import { EntityClass, Context, StringColumn, IdColumn, SpecificEntityHelper, SqlDatabase, Column, DataControlInfo } from '@remult/core';
import { FamilyId } from '../families/families';
import { changeDate, SqlBuilder, PhoneColumn } from '../model-shared/types';
import { BasketId } from '../families/BasketType';
import { DeliveryStatusColumn } from '../families/DeliveryStatus';
import { HelperId, HelperIdReadonly, Helpers, CompanyColumn } from '../helpers/helpers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { CompoundIdColumn, DateColumn, DataAreaSettings, InMemoryDataProvider, Entity, GridSettings, NumberColumn } from '@remult/core';

import { Route } from '@angular/router';


import { saveToExcel } from '../shared/saveToExcel';
import { BusyService } from '@remult/core';
import { FamilySourceId } from '../families/FamilySources';
import { ServerFunction } from '@remult/core';
import { Roles, AdminGuard } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DistributionCenterId } from '../manage/distribution-centers';
import {  getLang } from '../translate'
import { DateRangeComponent } from '../date-range/date-range.component';



@Component({
  selector: 'app-delivery-history',
  templateUrl: './delivery-history.component.html',
  styleUrls: ['./delivery-history.component.scss']
})
export class DeliveryHistoryComponent implements OnInit {


  helperInfo: GridSettings<helperHistoryInfo>;


  @ViewChild(DateRangeComponent, { static: true }) dateRange;

  async refresh() {
    this.deliveries.getRecords();
    await this.refreshHelpers();
  }
  static route: Route = {
    path: 'history',
    component: DeliveryHistoryComponent,
     canActivate: [AdminGuard]
  }
  helperStorage: InMemoryDataProvider;
  constructor(private context: Context, private busy: BusyService,public settings:ApplicationSettings) {
    this.helperStorage = new InMemoryDataProvider();


    this.helperInfo = context.for(helperHistoryInfo, this.helperStorage).gridSettings({
      hideDataArea: true,
      numOfColumnsInGrid: 6,
      gridButton: [{
        name: this.settings.lang.exportToExcel,
        visible: () => this.context.isAllowed(Roles.admin),
        click: async () => {
          await saveToExcel(this.context.for(helperHistoryInfo), this.helperInfo, this.settings.lang.volunteers, this.busy, (d: helperHistoryInfo, c) => c == d.courier);
        }
      }],
      columnSettings: h => [
        {
          column: h.name,
          width: '150'
        },
        {
          column: h.phone,
          width: '140'
        },
        {
          column: h.company,
          width: '150'
        },
        {
          column: h.deliveries,
          width: '75'
        },
        {
          column: h.families,
          
          width: '75'
        },
        {
          column: h.dates,
          width: '75'
        }
      ],
      get: {
        limit: 100,
        orderBy: h => [{ column: h.deliveries, descending: true }]
      },
      knowTotalRows: true
    });


  }
  private async refreshHelpers() {

    var x = await DeliveryHistoryComponent.getHelperHistoryInfo(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue);
    let rows: any[] = this.helperStorage.rows[this.context.for(helperHistoryInfo).create().defs.dbName];
    x = x.map(x => {
      x.deliveries = +x.deliveries;
      x.dates = +x.dates;
      x.families = +x.families;
      return x;
    });
    rows.splice(0, rows.length, ...x);
    this.helperInfo.getRecords();
  }




  deliveries = this.context.for(FamilyDeliveries).gridSettings({
    gridButton: [{
      name: this.settings.lang.exportToExcel,
      click: async () => {
        await saveToExcel(this.context.for(FamilyDeliveries), this.deliveries, this.settings.lang.deliveries, this.busy, (d: FamilyDeliveries, c) => c == d.id || c == d.family, undefined,
          async (f, addColumn) => {
            await f.basketType.addBasketTypes(f.quantity, addColumn);
            f.addStatusExcelColumn(addColumn);
          });
      }, visible: () => this.context.isAllowed(Roles.admin)
    }],
    columnSettings: d => {
      let r: DataControlInfo<FamilyDeliveries>[] = [
        d.name,
        {
          caption: this.settings.lang.deliverySummary,
          column: d.deliverStatus,
          readOnly: true,
          valueList: d.deliverStatus.getOptions()
          ,
          getValue: f => f.getShortDeliveryDescription(),
          width: '300'
        },
        d.basketType,
        d.quantity,
        d.city,
        d.familySource,
        d.courierComments,
        d.courierAssignUser,
        d.courierAssingTime,
        d.deliveryStatusUser
      ]
      for (const c of d.columns) {
        if (!r.includes(c) && c != d.id && c != d.family)
          r.push(c);
      }
      return r;
    },

    hideDataArea: true,
    numOfColumnsInGrid: 6,
    knowTotalRows: true,
    get: {
      limit: 50,
      where: d => {
        var toDate = this.dateRange.toDate.value;
        toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
        return d.deliveryStatusDate.isGreaterOrEqualTo(this.dateRange.fromDate.value).and(d.deliveryStatusDate.isLessThan(toDate))
      }
    }
  });
  async ngOnInit() {

    this.refreshHelpers();

  }
  @ServerFunction({ allowed: Roles.admin })
  static async  getHelperHistoryInfo(fromDate: string, toDate: string, context?: Context, db?: SqlDatabase) {
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);
    toDateDate = new Date(toDateDate.getFullYear(), toDateDate.getMonth(), toDateDate.getDate() + 1);
    var sql = new SqlBuilder();
    var fd = context.for(FamilyDeliveries).create();
    var h = context.for(Helpers).create();

    return (await db.execute(
      sql.build("select ", [
        fd.courier.defs.dbName,
        sql.columnInnerSelect(fd, {
          select: () => [h.name],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.defs.dbName)]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.company],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.defs.dbName)]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.phone],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.defs.dbName)]
        })
        , "deliveries", "dates", "families"], " from (",
        sql.build("select ", [
          fd.courier.defs.dbName,
          "count(*) deliveries",
          sql.build("count (distinct date (", fd.courierAssingTime.defs.dbName, ")) dates"),
          sql.build("count (distinct ", fd.family.defs.dbName, ") families")],
          ' from ', fd.defs.dbName,
          ' where ', sql.and(fd.deliveryStatusDate.isGreaterOrEqualTo(fromDateDate).and(fd.deliveryStatusDate.isLessThan(toDateDate))))

        + sql.build(' group by ', fd.courier.defs.dbName), ") x"))).rows;

  }

}
@EntityClass
export class helperHistoryInfo extends Entity<string>{
  
  courier = new StringColumn();
  name = new StringColumn(getLang(this.context).volunteerName);
  phone = new PhoneColumn(getLang(this.context).phone);
  company = new CompanyColumn(this.context);
  deliveries = new NumberColumn(getLang(this.context).deliveries);
  families = new NumberColumn(getLang(this.context).families);
  dates = new NumberColumn(getLang(this.context).dates);
  constructor(private context: Context) {
    super({ name: 'helperHistoryInfo', allowApiRead: false, allowApiCRUD: false });

  }
}

