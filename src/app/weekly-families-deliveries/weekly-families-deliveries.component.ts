import { Component, OnInit } from '@angular/core';
import { Id, IdEntity, NumberColumn, buildSql, changeDate, DateTimeColumn, SqlBuilder, QueryBuilder } from '../model-shared/types';
import { WeeklyFamilyId } from '../weekly-families/weekly-families';
import { ClosedListColumn, StringColumn, BoolColumn, Entity, CompoundIdColumn, Column } from 'radweb';
import { EntityClass, Context, ServerContext, ContextEntity } from '../shared/context';
import { BusyService } from '../select-popup/busy-service';


@Component({
  selector: 'app-weekly-families-deliveries',
  templateUrl: './weekly-families-deliveries.component.html',
  styleUrls: ['./weekly-families-deliveries.component.scss']
})
export class WeeklyFamiliesDeliveriesComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
@EntityClass
export class WeeklyFamilyDeliveries extends IdEntity<WeeklyFamilyDeliveryId>
{

  constructor(context: Context) {
    super(new ProductId(context), {
      name: 'WeeklyFamilyDeliveries',
      allowApiCRUD: true,
      onSavingRow: async () => {
        if (this.isNew()) {
          this.status.listValue = WeeklyFamilyDeliveryStatus.Prepare;
          this.ordnial.value = +(await context.for(WeeklyFamilyDeliveries).count(wfd => wfd.familyId.isEqualTo(this.familyId.value))) + 1;
        }
      },

    });
    this.deliveredOn.dontShowTimeForOlderDates = true;
  }


  changeStatus(s: WeeklyFamilyDeliveryStatus) {
    if (this.status.listValue == WeeklyFamilyDeliveryStatus.Delivered)
      this.deliveredOn.value = '';
    this.status.listValue = s;
    if (this.status.listValue == WeeklyFamilyDeliveryStatus.Delivered)
      this.deliveredOn.dateValue = new Date();
    this.save();
  }

  familyId = new WeeklyFamilyId();
  status = new WeeklyFamilyDeliveryStatusColumn();
  ordnial = new NumberColumn('סידורי');
  deliveredOn = new DateTimeColumn('תאריך מסירה');
}


@EntityClass
export class WeeklyFamilyDeliveryProducts extends IdEntity<Id>{

  constructor(private context: Context) {
    super(new Id(), {
      name: 'WeeklyFamilyDeliveryProducts',
      allowApiCRUD: true
    })
  }
  delivery = new WeeklyFamilyDeliveryId();
  product = new ProductId(this.context);
  requestQuanity = new NumberColumn({ caption: 'כמות מבוקשת', value: 0 });
  Quantity = new NumberColumn('כמות בפועל');
}


@EntityClass
export class WeeklyFamilyDeliveryProductStats extends ContextEntity<string> {
  delivery = new WeeklyFamilyDeliveryId();
  product = new ProductId(this.context);
  productName = new StringColumn({ caption: 'שם' });
  productOrder = new NumberColumn({ caption: 'סדר', value: 50 });
  familyId = new WeeklyFamilyId();
  status = new WeeklyFamilyDeliveryStatusColumn();
  ordnial = new NumberColumn('סידורי');
  deliveredOn = new DateTimeColumn('תאריך מסירה');
  requestQuanity = new NumberColumn({ caption: 'כמות מבוקשת', value: 0 });
  Quantity = new NumberColumn('כמות בפועל');
  lastDeliveryOfProduct = new DateTimeColumn('תאריך מסירה קודם');
  lastDelveryQuantity = new NumberColumn('כמות בפעם הקודמת');

  constructor(private context: Context) {
    super({
      name: 'WeeklyFamilyDelivryProductStats',
      dbName: () => {
        var deliveries = new WeeklyFamilyDeliveries(context);
        var innerSelectDeliveries = new WeeklyFamilyDeliveries(context);
        var products = new Products(context);
        var innerSelectDeliveryProducts = new WeeklyFamilyDeliveryProducts(context);
        var deliveryProducts = new WeeklyFamilyDeliveryProducts(context);
        var sql = new SqlBuilder();



        var getFromLastDelivery = (col: Column<any>) => {
          return {
            select: () => [col],
            from: innerSelectDeliveries,
            innerJoin: () => [{
              to: innerSelectDeliveryProducts,
              on: () => [
                sql.eq(innerSelectDeliveries.id,
                  innerSelectDeliveryProducts.delivery)
              ]
            }],
            where: () => [
              sql.eq(deliveries.familyId, innerSelectDeliveries.familyId),
              sql.gt(deliveries.ordnial, innerSelectDeliveries.ordnial),
              sql.eq(innerSelectDeliveryProducts.product, products.id),
              sql.gt(innerSelectDeliveryProducts.Quantity, 0),
              sql.eq(innerSelectDeliveries.status, WeeklyFamilyDeliveryStatus.Delivered.id)
            ],
            orderBy: [{ column: innerSelectDeliveries.ordnial, descending: true }]
          } as QueryBuilder;

        };
        return sql.entityDbName({
          select: () => [
            sql.columnWithAlias(deliveries.id, this.delivery),
            deliveries.familyId,
            deliveries.status,
            deliveries.ordnial,
            deliveries.deliveredOn,
            sql.columnWithAlias(products.id, this.product),
            sql.columnWithAlias(products.name, this.productName),
            sql.columnWithAlias(products.order, this.productOrder),
            deliveryProducts.requestQuanity,
            deliveryProducts.Quantity,
            sql.innerSelect(getFromLastDelivery(innerSelectDeliveries.deliveredOn), this.lastDeliveryOfProduct),
            sql.innerSelect(getFromLastDelivery(innerSelectDeliveryProducts.Quantity), this.lastDelveryQuantity)
          ],
          from: deliveries,
          crossJoin: () => [products],
          outerJoin: () => [{
            to: deliveryProducts,
            on: () => [
              sql.eq(deliveries.id, deliveryProducts.delivery),
              sql.eq(products.id, deliveryProducts.product)]
          }]
        });

      },
      allowApiCRUD: false,

    });
    this.lastDeliveryOfProduct.dontShowTimeForOlderDates = true;
    this.initColumns(new CompoundIdColumn(this, this.delivery, this.product));

  }
  private saving = Promise.resolve();
  async saveQuantities(busy: BusyService) {

    this.saving = this.saving.then(async () => {
      await busy.donotWait(async () => {
        var r = await this.context.for(WeeklyFamilyDeliveryProducts).lookupAsync(dp => dp.product.isEqualTo(this.product).and(dp.delivery.isEqualTo(this.delivery)));
        if (r.isNew()) {
          if (!r.requestQuanity.value)
            r.requestQuanity.value = 0;
          r.delivery.value = this.delivery.value;
          r.product.value = this.product.value;
        }
        r.Quantity.value = this.Quantity.value;
        r.requestQuanity.value = this.requestQuanity.value;
        await r.save();
      });
    });
  }
}



export class WeeklyFamilyDeliveryId extends Id {

}





export class WeeklyFamilyDeliveryStatus {

  static Prepare = new WeeklyFamilyDeliveryStatus(10, "הכנה", "אנא בחרי את המוצרים לסל ובסיום לחצי על \"סל מוכן לאריזה\"");
  static Pack = new WeeklyFamilyDeliveryStatus(20, "אריזה", "אנא סמן אילו מוצרים נארזו ובסיום לחץ על \"מוכן לאיסוף\"");
  static Ready = new WeeklyFamilyDeliveryStatus(30, "מוכן לאיסוף");
  static OnRoute = new WeeklyFamilyDeliveryStatus(40, "נאסף");
  static Delivered = new WeeklyFamilyDeliveryStatus(50, "נמסר");
  next: StatusButtonInfo;
  prev: StatusButtonInfo;
  constructor(public id: number, private name: string, public helpText?: string) {

  }
  toString() {
    return this.name;
  }

}
WeeklyFamilyDeliveryStatus.Prepare.next = {
  name: 'סל מוכן לאריזה',
  status: WeeklyFamilyDeliveryStatus.Pack,
  disabled: h => !h.hasRequestItems()
};
WeeklyFamilyDeliveryStatus.Pack.prev = {
  name: 'החזר סל להכנה',
  status: WeeklyFamilyDeliveryStatus.Prepare
};
WeeklyFamilyDeliveryStatus.Pack.next = {
  name: 'מוכן לאיסוף',
  status: WeeklyFamilyDeliveryStatus.Ready
};
WeeklyFamilyDeliveryStatus.Ready.prev = {
  name: 'החזר לאריזה',
  status: WeeklyFamilyDeliveryStatus.Pack
};
WeeklyFamilyDeliveryStatus.Ready.next = {
  name: 'נאסף',
  status: WeeklyFamilyDeliveryStatus.OnRoute
};
WeeklyFamilyDeliveryStatus.OnRoute.prev = {
  name: 'החזר למוכן לאיסוף',
  status: WeeklyFamilyDeliveryStatus.Ready
};
WeeklyFamilyDeliveryStatus.OnRoute.next = {
  name: 'נמסר',
  status: WeeklyFamilyDeliveryStatus.Delivered
};
WeeklyFamilyDeliveryStatus.Delivered.prev = {
  name: 'החזר לנאסף',
  status: WeeklyFamilyDeliveryStatus.OnRoute
};



export interface StatusButtonInfo {
  status: WeeklyFamilyDeliveryStatus,
  name: string,
  disabled?: (h: StatusButtonEnabledHelper) => boolean

}
export interface StatusButtonEnabledHelper {
  hasRequestItems: () => boolean;
}

export class WeeklyFamilyDeliveryStatusColumn extends ClosedListColumn<WeeklyFamilyDeliveryStatus>{
  constructor() {
    super(WeeklyFamilyDeliveryStatus, { caption: 'סטטוס שילוח' });
  }

}


export class ProductId extends Id {
  constructor(private context: Context) {
    super()
  }
  getName() {
    return this.context.for(Products).lookup(this).name.value;
  }
}
let wfdp = new WeeklyFamilyDeliveryProducts(new ServerContext());
let wfd = new WeeklyFamilyDeliveries(new ServerContext());
@EntityClass
export class Products extends IdEntity<ProductId>{
  name = new StringColumn({ caption: 'שם' });
  order = new NumberColumn({ caption: 'סדר', value: 50, dbName: 'ord2' });
  missing = new BoolColumn({ caption: 'חסר' });
  constructor(private context: Context) {
    super(new ProductId(context), {
      name: 'products',
      allowApiCRUD: true,
    });
  }

  quantityToPack = new NumberColumn({
    dbReadOnly: true,
    caption: 'כמות לאריזה',
    dbName: buildSql('(select sum (', wfdp.requestQuanity, ') from ', wfdp, ' inner join ', wfd, ' on ', wfdp.delivery, ' = ', wfd, '.', wfd.id,
      ' where ', wfd.status, '=', WeeklyFamilyDeliveryStatus.Pack.id, ' and ', wfdp.product, ' = ', 'Products', '.', 'id', ')'),
    readonly: true
  });
}
