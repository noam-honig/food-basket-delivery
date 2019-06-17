import { Component, OnInit } from '@angular/core';
import { EntityClass, ContextEntity, Context, DirectSQL } from '../shared/context';
import { FamilyId, Families } from '../families/families';
import { Id, StringColumn, changeDate, SqlBuilder } from '../model-shared/types';
import { BasketId } from '../families/BasketType';
import { DeliveryStatusColumn } from '../families/DeliveryStatus';
import { HelperId, HelperIdReadonly, Helpers } from '../helpers/helpers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { CompoundIdColumn, DateColumn, DataAreaSettings, JsonStorageDataProvider, InMemoryDataProvider, Entity, GridSettings, EntitySource, NumberColumn } from 'radweb';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { Route } from '@angular/router';
import { DialogService } from '../select-popup/dialog';
import { SelectService } from '../select-popup/select-service';
import { saveToExcel } from '../shared/saveToExcel';
import { BusyService } from '../select-popup/busy-service';
import { FamilySourceId } from '../families/FamilySources';
import { RunOnServer } from '../auth/server-action';

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

      if (this.toDate.dateValue < this.fromDate.dateValue) {
        this.toDate.dateValue = this.getEndOfMonth();
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
    return new Date(this.fromDate.dateValue.getFullYear(), this.fromDate.dateValue.getMonth() + 1, 0);
  }

  async refresh() {
    this.deliveries.getRecords();
    await this.refreshHelpers();
  }
  static route: Route = {
    path: 'history',
    component: DeliveryHistoryComponent,
    data: { name: 'היסטורית משלוחים' }, canActivate: [HolidayDeliveryAdmin]
  }
  constructor(private context: Context, private selectService: SelectService, private busy: BusyService) {
    let x = new InMemoryDataProvider();
    let hhi = new helperHistoryInfo(x);
    this.helperSource = hhi.source;
    this.helperInfo = new GridSettings(hhi, {
      columnSettings: h => [
        {
          column: h.name,
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

    this.fromDate.dateValue = new Date(today.getFullYear(), today.getMonth(), 1);
    this.toDate.dateValue = this.getEndOfMonth();
  }
  private async refreshHelpers() {
    for (const h of await this.helperSource.find({})) {
      await h.delete();
    }
    var x = await DeliveryHistoryComponent.getHelperHistoryInfo(this.fromDate.value, this.toDate.value);
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
    this.fromDate.dateValue = new Date();
    this.toDate.dateValue = new Date();
    this.refresh();

  }
  next() {
    this.setRange(+1);
  }
  previous() {

    this.setRange(-1);
  }
  private setRange(delta: number) {
    if (this.fromDate.dateValue.getDate() == 1 && this.toDate.dateValue.toDateString() == this.getEndOfMonth().toDateString()) {
      this.fromDate.dateValue = new Date(this.fromDate.dateValue.getFullYear(), this.fromDate.dateValue.getMonth() + delta, 1);
      this.toDate.dateValue = this.getEndOfMonth();
    } else {
      let difference = this.toDate.dateValue.getTime() - this.fromDate.dateValue.getTime();
      if (difference < fullDayValue)
        difference = fullDayValue;
      difference *= delta;
      this.fromDate.dateValue = new Date(this.fromDate.dateValue.getTime() + difference);
      this.toDate.dateValue = new Date(this.toDate.dateValue.getTime() + difference);

    }
    this.refresh();
  }

  async saveToExcel() {
    await saveToExcel(this.deliveries, "משלוחים", this.busy, (d: FamilyDeliveries, c) => c == d.id || c == d.family);
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
        var toDate = this.toDate.dateValue;
        toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
        return d.deliveryStatusDate.IsGreaterOrEqualTo(this.fromDate).and(d.deliveryStatusDate.IsLessThan(DateColumn.dateToString(toDate)))
      }
    }
  });
  ngOnInit() {

    this.refreshHelpers();
  }
  @RunOnServer({ allowed: x => x.isAdmin() })
  static async  getHelperHistoryInfo(fromDate: string, toDate: string, context?: Context, directSql?: DirectSQL) {
    var d = DateColumn.stringToDate(toDate);
    toDate = DateColumn.dateToString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    var sql = new SqlBuilder();
    var fd = new FamilyDeliveriesStats(context);
    var h = new Helpers(context);

    return (await directSql.execute(
      sql.build("select ", [fd.courier.__getDbName(), sql.columnInnerSelect(fd, {
        select: () => [h.name],
        from: h,
        where: () => [sql.build(h.id, "=", fd.courier.__getDbName())]
      }), "deliveries", "dates", "families"], " from (",
        sql.build("select ", [
          fd.courier.__getDbName(),
          "count(*) deliveries",
          sql.build("count (distinct date (", fd.courierAssingTime.__getDbName(), ")) dates"),
          sql.build("count (distinct ", fd.family.__getDbName(), ") families")],
          ' from ', fd.__getDbName(),
          ' where ', sql.and(fd.deliveryStatusDate.IsGreaterOrEqualTo(fromDate).and(fd.deliveryStatusDate.IsLessThan(toDate))))

        + sql.build(' group by ', fd.courier.__getDbName()), ") x"))).rows;

  }

}

export class helperHistoryInfo extends Entity<string>{
  courier = new StringColumn();
  name = new StringColumn('שם');
  deliveries = new NumberColumn('משלוחים');
  families = new NumberColumn('משפחות');
  dates = new NumberColumn("תאריכים");
  constructor(source: InMemoryDataProvider) {
    super(() => new helperHistoryInfo(source), source, { name: 'helperHistoryInfo' });
    this.initColumns(this.courier);
  }
}

@EntityClass
export class FamilyDeliveriesStats extends ContextEntity<string> {
  family = new FamilyId();
  id = new Id();
  name = new StringColumn('שם');
  courier = new HelperId(this.context, "משנע");
  deliveryStatusDate = new changeDate('מתי');
  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
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
      allowApiRead: context.isAdmin(),
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
    this.initColumns(new CompoundIdColumn(this, this.family, this.id));
  }

}
