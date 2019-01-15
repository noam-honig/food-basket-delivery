import { Component, OnInit } from '@angular/core';
import { Id, IdEntity, NumberColumn } from '../model-shared/types';
import { ProductId } from '../products/products';
import { WeeklyFamilyId } from '../weekly-families/weekly-families';
import { ClosedListColumn } from 'radweb';
import { EntityClass, Context } from '../shared/context';


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
    super(new ProductId(), {
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

  changeStatusToReadyToPack(){
    this.changeStatus(WeeklyFamilyDeliveryStatus.Pack);
  }
  changeToPrelare()
  {
    this.changeStatus( WeeklyFamilyDeliveryStatus.Prepare);

  }
  changeStatus(s: WeeklyFamilyDeliveryStatus) {
    this.status.listValue = s;
    this.save();
  }

  familyId = new WeeklyFamilyId();
  status = new WeeklyFamilyDeliveryStatusColumn();
  ordnial = new NumberColumn('סידורי');
}


@EntityClass
export class WeeklyFamilyDeliveryProducts extends IdEntity<Id>{

  constructor() {
    super(new Id(), {
      name: 'WeeklyFamilyDeliveryProducts',
      allowApiCRUD: true
    })
  }
  delivery = new WeeklyFamilyDeliveryId();
  product = new ProductId();
  requestQuanity = new NumberColumn({ caption: 'כמות מבוקשת', value: 0 });
  Quantity = new NumberColumn('כמות בפועל');
}






export class WeeklyFamilyDeliveryId extends Id {

}





export class WeeklyFamilyDeliveryStatus {

  static Prepare = new WeeklyFamilyDeliveryStatus(10, "הכנה");
  static Pack = new WeeklyFamilyDeliveryStatus(20, "אריזה");
  static Ready = new WeeklyFamilyDeliveryStatus(30, "מוכן לאיסוף");
  static OnRoute = new WeeklyFamilyDeliveryStatus(40, "נאסף");
  static Delivered = new WeeklyFamilyDeliveryStatus(50, "נמסר");
  constructor(public id: number, private name: string) {

  }
  toString() {
    return this.name;
  }
}

export class WeeklyFamilyDeliveryStatusColumn extends ClosedListColumn<WeeklyFamilyDeliveryStatus>{
  constructor() {
    super(WeeklyFamilyDeliveryStatus, { caption: 'סטטוס שילוח' });
  }

}
