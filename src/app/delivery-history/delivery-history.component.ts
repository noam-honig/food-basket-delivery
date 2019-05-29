import { Component, OnInit } from '@angular/core';
import { EntityClass, ContextEntity, Context } from '../shared/context';
import { FamilyId, Families } from '../families/families';
import { Id, StringColumn, changeDate, SqlBuilder } from '../model-shared/types';
import { BasketId } from '../families/BasketType';
import { DeliveryStatusColumn } from '../families/DeliveryStatus';
import { HelperId, HelperIdReadonly } from '../helpers/helpers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { CompoundIdColumn, DateColumn, DataAreaSettings } from 'radweb';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { Route } from '@angular/router';
import { DialogService } from '../select-popup/dialog';
import { SelectService } from '../select-popup/select-service';
import { saveToExcel } from '../shared/saveToExcel';

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
        this.toDate.dateValue = new Date(this.fromDate.dateValue.getFullYear(), this.fromDate.dateValue.getMonth() + 1, 0);
      }

    }
  });
  toDate = new DateColumn('עד תאריך');
  rangeArea = new DataAreaSettings({
    columnSettings: () => [this.fromDate, this.toDate],
    numberOfColumnAreas: 2
  });
  refresh() {
    this.deliveries.getRecords();
  }
  static route: Route = {
    path: 'history',
    component: DeliveryHistoryComponent,
    data: { name: 'היסטורית משלוחים' }, canActivate: [HolidayDeliveryAdmin]
  }
  constructor(private context: Context, private selectService: SelectService) {
    let today = new Date();

    this.fromDate.dateValue = new Date(today.getFullYear(), today.getMonth(), 1);
    this.toDate.dateValue = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }
  async saveToExcel(){
    await saveToExcel(this.deliveries,"משלוחים",(d:FamilyDeliveries,c)=>c==d.id||c==d.family);
  }
  deliveries = this.context.for(FamilyDeliveriesStats).gridSettings({
    columnSettings: d => [
      d.name,
      d.courier.getColumn(this.selectService),
      d.deliveryStatusDate,
      d.deliverStatus.getColumn(),
      d.basketType.getColumn(),
      d.city,
      d.courierComments,
      d.courierAssignUser.getColumn(this.selectService),
      d.courierAssingTime,
      d.deliveryStatusUser.getColumn(this.selectService)
    ],
    hideDataArea: true,
    numOfColumnsInGrid: 6,
    knowTotalRows:true,
    get: {
      limit:20,
      where: d => {
        var toDate = this.toDate.dateValue;
        toDate = new Date(toDate.getFullYear(),toDate.getMonth(),toDate.getDate()+1);
        return d.deliveryStatusDate.IsGreaterOrEqualTo(this.fromDate).and(d.deliveryStatusDate.IsLessThan(DateColumn.dateToString(toDate)))
      }
    }
  });
  ngOnInit() {
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
        return sql.entityDbNameUnion({
          select: () => [sql.columnWithAlias(f.id, 'as family'), f.name, sql.columnWithAlias(sql.str(''), 'id'),
          f.basketType,
          f.deliverStatus,
          f.courier,
          f.city,
          f.courierComments,
          f.deliveryStatusDate,
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
            d.courierAssignUser,
            d.courierAssingTime,
            d.deliveryStatusUser],
            from: d,
            outerJoin: () => [{ to: f, on: () => [sql.eq(f.id, d.family)] }]
          });
      }

    });
    this.initColumns(new CompoundIdColumn(this, this.family, this.id));
  }
  
}
