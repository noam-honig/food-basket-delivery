import { Component, OnInit } from '@angular/core';
import { Id, IdEntity, NumberColumn, buildSql, changeDate, DateTimeColumn } from '../model-shared/types';
import { WeeklyFamilyId } from '../weekly-families/weekly-families';
import { ClosedListColumn, StringColumn, BoolColumn } from 'radweb';
import { EntityClass, Context, ServerContext } from '../shared/context';


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

    })
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
  constructor(public id: number, private name: string, private helpText?: string) {

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
