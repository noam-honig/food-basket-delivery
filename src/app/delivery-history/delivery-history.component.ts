import { Component, OnInit } from '@angular/core';
import { EntityClass, Context, StringColumn, IdColumn, SpecificEntityHelper, SqlDatabase } from '@remult/core';
import { FamilyId, Families } from '../families/families';
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

var fullDayValue = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-delivery-history',
  templateUrl: './delivery-history.component.html',
  styleUrls: ['./delivery-history.component.scss']
})
export class DeliveryHistoryComponent implements OnInit {

  fromDate = new DateColumn({
    caption: 'מתאריך',
    valueChange: () => {

      if (this.toDate.value < this.fromDate.value) {
        this.toDate.value = this.getEndOfMonth();
      }

    }
  });
  toDate = new DateColumn('עד תאריך');
  rangeArea = new DataAreaSettings({
    columnSettings: () => [this.fromDate, this.toDate],
    numberOfColumnAreas: 2
  });

  helperInfo: GridSettings<helperHistoryInfo>;


  private getEndOfMonth(): Date {
    return new Date(this.fromDate.value.getFullYear(), this.fromDate.value.getMonth() + 1, 0);
  }

  async refresh() {
    this.deliveries.getRecords();
    await this.refreshHelpers();
  }
  static route: Route = {
    path: 'history',
    component: DeliveryHistoryComponent,
    data: { name: 'היסטורית משלוחים' }, canActivate: [AdminGuard]
  }
  helperStorage: InMemoryDataProvider;
  constructor(private context: Context, private busy: BusyService) {
    this.helperStorage = new InMemoryDataProvider();


    this.helperInfo = context.for(helperHistoryInfo, this.helperStorage).gridSettings({
      hideDataArea: true,
      numOfColumnsInGrid: 6,
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

    let today = new Date();

    this.fromDate.value = new Date(today.getFullYear(), today.getMonth(), 1);
    this.toDate.value = this.getEndOfMonth();
  }
  private async refreshHelpers() {

    var x = await DeliveryHistoryComponent.getHelperHistoryInfo(this.fromDate.rawValue, this.toDate.rawValue);
    let rows: any[] = this.helperStorage.rows[this.context.for(helperHistoryInfo).create().defs.dbName];
    rows.splice(0, rows.length, ...x);
    this.helperInfo.getRecords();
  }

  today() {
    this.fromDate.value = new Date();
    this.toDate.value = new Date();
    this.refresh();

  }
  next() {
    this.setRange(+1);
  }
  previous() {

    this.setRange(-1);
  }
  private setRange(delta: number) {
    if (this.fromDate.value.getDate() == 1 && this.toDate.value.toDateString() == this.getEndOfMonth().toDateString()) {
      this.fromDate.value = new Date(this.fromDate.value.getFullYear(), this.fromDate.value.getMonth() + delta, 1);
      this.toDate.value = this.getEndOfMonth();
    } else {
      let difference = Math.abs(this.toDate.value.getTime() - this.fromDate.value.getTime());
      if (difference < fullDayValue)
        difference = fullDayValue;
      difference *= delta;
      let to = this.toDate.value;
      this.fromDate.value = new Date(this.fromDate.value.getTime() + difference);
      this.toDate.value = new Date(to.getTime() + difference);

    }
    this.refresh();
  }

  async saveToExcel() {
    await saveToExcel(this.context.for(FamilyDeliveriesStats), this.deliveries, "משלוחים", this.busy, (d: FamilyDeliveriesStats, c) => c == d.id || c == d.family, undefined,
      async (f, addColumn) => await f.basketType.addBasketTypes(addColumn));
  }
  async saveToExcelHelpers() {
    await saveToExcel(this.context.for(helperHistoryInfo), this.helperInfo, "מתנדבים", this.busy, (d: helperHistoryInfo, c) => c == d.courier);
  }
  deliveries = this.context.for(FamilyDeliveriesStats).gridSettings({

    columnSettings: d => [
      d.name,
      d.courier,
      d.deliveryStatusDate,
      d.deliverStatus,
      d.basketType,
      d.city,
      d.familySource,
      d.courierComments,
      d.courierAssignUser,
      d.courierAssingTime,
      d.deliveryStatusUser
    ],

    hideDataArea: true,
    numOfColumnsInGrid: 7,
    knowTotalRows: true,
    get: {
      limit: 20,
      where: d => {
        var toDate = this.toDate.value;
        toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
        return d.deliveryStatusDate.isGreaterOrEqualTo(this.fromDate.value).and(d.deliveryStatusDate.isLessThan(toDate))
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
    var fd = context.for(FamilyDeliveriesStats).create();
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
  name = new StringColumn('שם');
  phone = new PhoneColumn("טלפון");
  company = new CompanyColumn(this.context);
  deliveries = new NumberColumn('משלוחים');
  families = new NumberColumn('משפחות');
  dates = new NumberColumn("תאריכים");
  constructor(private context: Context) {
    super({ name: 'helperHistoryInfo', allowApiRead: false, allowApiCRUD: false });

  }
}

@EntityClass
export class FamilyDeliveriesStats extends Entity<string> {
  family = new FamilyId();
  id = new IdColumn();
  name = new StringColumn('שם');
  distributionCenter = new DistributionCenterId(this.context);
  courier = new HelperId(this.context,()=>this.distributionCenter.value, "משנע");
  deliveryStatusDate = new changeDate('מתי');
  deliverStatus = new DeliveryStatusColumn();
  basketType = new BasketId(this.context, 'סוג סל');
  city = new StringColumn({ caption: "עיר" });
  courierComments = new StringColumn('הערות מסירה');
  familySource = new FamilySourceId(this.context, { caption: 'גורם מפנה' });
  courierAssignUser = new HelperIdReadonly(this.context,()=>this.distributionCenter.value, 'מי שייכה למשנע');
  courierAssingTime = new changeDate('מועד שיוך למשנע');
  deliveryStatusUser = new HelperIdReadonly(this.context,()=>this.distributionCenter.value, 'מי עדכן את סטטוס המשלוח');


  constructor(private context: Context) {
    super({
      name: 'FamilyDeliveriesStats',
      allowApiRead: Roles.admin,
      dbName: () => {
        var f = context.for(Families).create();
        var d = context.for(FamilyDeliveries).create();
        var sql = new SqlBuilder();
        let r = sql.union({
          select: () => [sql.columnWithAlias(f.id, 'as family'), f.name, sql.columnWithAlias(f.id, 'id'),
          f.basketType,
          f.distributionCenter,
          f.deliverStatus,
          f.courier,
          f.city,
          f.courierComments,
          f.deliveryStatusDate,
          f.familySource,
          f.courierAssignUser,
          f.courierAssingTime,
          f.deliveryStatusUser
          ],

          from: f,
          where: () => [f.deliverStatus.isAResultStatus()]
        },
          {
            select: () => [d.family, d.familyName, d.id,
            d.basketType,
            d.distributionCenter,
            d.deliverStatus,
            d.courier,
            d.archive_city,
            d.courierComments,
            d.deliveryStatusDate,
            d.archiveFamilySource,
            d.courierAssignUser,
            d.courierAssingTime,
            d.deliveryStatusUser],
            from: d

          });

        return r + ' result';
      }

    });

  }

}
