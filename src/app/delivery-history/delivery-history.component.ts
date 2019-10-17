import { Component, OnInit } from '@angular/core';
import { EntityClass, Context, DirectSQL, StringColumn, IdColumn } from 'radweb';
import { FamilyId, Families } from '../families/families';
import { changeDate, SqlBuilder, PhoneColumn } from '../model-shared/types';
import { BasketId } from '../families/BasketType';
import { DeliveryStatusColumn } from '../families/DeliveryStatus';
import { HelperId, HelperIdReadonly, Helpers, CompanyColumn } from '../helpers/helpers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { CompoundIdColumn, DateColumn, DataAreaSettings, InMemoryDataProvider, Entity, GridSettings, EntitySource, NumberColumn } from 'radweb';

import { Route } from '@angular/router';

import { SelectService } from '../select-popup/select-service';
import { saveToExcel } from '../shared/saveToExcel';
import { BusyService } from 'radweb';
import { FamilySourceId } from '../families/FamilySources';
import { ServerFunction } from 'radweb';
import { Roles, AdminGuard } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';

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
  helperSource: EntitySource<helperHistoryInfo>;
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
  constructor(private context: Context, private selectService: SelectService, private busy: BusyService) {
    let hhi = context.create(helperHistoryInfo);
    let x = new InMemoryDataProvider();
    hhi.setSource(x);
    this.helperSource = hhi.source;
    this.helperInfo = new GridSettings(hhi, {
      columnSettings: h => [
        {
          column: h.name,
          width: '150'
        },
        {
          column: h.phone,
          width: '100'
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
    for (const h of await this.helperSource.find({})) {
      await h.delete();
    }
    var x = await DeliveryHistoryComponent.getHelperHistoryInfo(this.fromDate.rawValue, this.toDate.rawValue);
    for (const hh of x) {
      let h = this.helperSource.fromPojo(hh);
      for (const c of h.__iterateColumns()) {
        if (c instanceof NumberColumn)
          c.value = +c.value;
      }
      h.__entityData["newRow"] = true;
      await h.save();
    }
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
    await saveToExcel(this.deliveries, "משלוחים", this.busy, (d: FamilyDeliveriesStats, c) => c == d.id || c == d.family);
  }
  async saveToExcelHelpers() {
    await saveToExcel(this.helperInfo, "מתנדבים", this.busy, (d: helperHistoryInfo, c) => c == d.courier);
  }
  deliveries = this.context.for(FamilyDeliveriesStats).gridSettings({
    columnSettings: d => [
      d.name,
      d.courier.getColumn(this.selectService),
      d.deliveryStatusDate,
      d.deliverStatus.getColumn(),
      d.basketType.getColumn(),
      d.city,
      d.familySource.getColumn(),
      d.courierComments,
      d.courierAssignUser.getColumn(this.selectService),
      d.courierAssingTime,
      d.deliveryStatusUser.getColumn(this.selectService)
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
  static async  getHelperHistoryInfo(fromDate: string, toDate: string, context?: Context, directSql?: DirectSQL) {
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);
    toDateDate = new Date(toDateDate.getFullYear(), toDateDate.getMonth(), toDateDate.getDate() + 1);
    var sql = new SqlBuilder();
    var fd = new FamilyDeliveriesStats(context);
    var h = new Helpers(context);

    return (await directSql.execute(
      sql.build("select ", [
        fd.courier.__getDbName(),
        sql.columnInnerSelect(fd, {
          select: () => [h.name],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.__getDbName())]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.company],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.__getDbName())]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.phone],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.__getDbName())]
        })
        , "deliveries", "dates", "families"], " from (",
        sql.build("select ", [
          fd.courier.__getDbName(),
          "count(*) deliveries",
          sql.build("count (distinct date (", fd.courierAssingTime.__getDbName(), ")) dates"),
          sql.build("count (distinct ", fd.family.__getDbName(), ") families")],
          ' from ', fd.__getDbName(),
          ' where ', sql.and(fd.deliveryStatusDate.isGreaterOrEqualTo(fromDateDate).and(fd.deliveryStatusDate.isLessThan(toDateDate))))

        + sql.build(' group by ', fd.courier.__getDbName()), ") x"))).rows;

  }

}
@EntityClass
export class helperHistoryInfo extends Entity<string>{
  courier = new StringColumn();
  name = new StringColumn('שם');
  phone = new PhoneColumn("טלפון");
  company = new CompanyColumn(); 
  deliveries = new NumberColumn('משלוחים');
  families = new NumberColumn('משפחות');
  dates = new NumberColumn("תאריכים");
  constructor() {
    super({ name: 'helperHistoryInfo', allowApiRead: false, allowApiCRUD: false });
    this.__initColumns(this.courier);
  }
}

@EntityClass
export class FamilyDeliveriesStats extends Entity<string> {
  family = new FamilyId();
  id = new IdColumn();
  name = new StringColumn('שם');
  courier = new HelperId(this.context, "משנע");
  deliveryStatusDate = new changeDate('מתי');
  deliverStatus = new DeliveryStatusColumn();
  basketType = new BasketId(this.context, 'סוג סל');
  city = new StringColumn({ caption: "עיר" });
  courierComments = new StringColumn('הערות מסירה');
  familySource = new FamilySourceId(this.context, { caption: 'גורם מפנה' });
  courierAssignUser = new HelperIdReadonly(this.context, 'מי שייכה למשנע');
  courierAssingTime = new changeDate('מועד שיוך למשנע');
  deliveryStatusUser = new HelperIdReadonly(this.context, 'מי עדכן את סטטוס המשלוח');


  constructor(private context: Context) {
    super({
      name: 'FamilyDeliveriesStats',
      allowApiRead: Roles.admin,
      dbName: () => {
        var f = new Families(context);
        var d = new FamilyDeliveries(context);
        var sql = new SqlBuilder();
        let r = sql.union({
          select: () => [sql.columnWithAlias(f.id, 'as family'), f.name, sql.columnWithAlias(sql.str(''), 'id'),
          f.basketType,
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
          where: () => [f.deliverStatus.isSuccess()]
        },
          {
            select: () => [f.id, f.name, d.id,
            d.basketType,
            d.deliverStatus,
            d.courier,
            d.archive_city,
            d.courierComments,
            d.deliveryStatusDate,
            d.archiveFamilySource,
            d.courierAssignUser,
            d.courierAssingTime,
            d.deliveryStatusUser],
            from: d,
            outerJoin: () => [{ to: f, on: () => [sql.eq(f.id, d.family)] }]
          });

        return r + ' result';
      }

    });
    this.__initColumns(new CompoundIdColumn(this, this.family, this.id));
  }

}
