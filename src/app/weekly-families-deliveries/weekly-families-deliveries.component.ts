import { Component, OnInit } from '@angular/core';
import { Id, IdEntity, NumberColumn } from '../model-shared/types';
import { ProductId } from '../products/products';
import { WeeklyFamilyId } from '../weekly-families/weekly-families';
import { ClosedListColumn } from 'radweb';


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

export class WeeklyFamilyDeliveries extends IdEntity<WeeklyFamilyDeliveryId>
{

  constructor() {
    super(new ProductId(), {
      name: 'WeeklyFamilyDeliveries',
      allowApiCRUD: true
    })
  }
  familyId = new WeeklyFamilyId();
  status = new WeeklyFamilyDeliveryStatusColumn();
  ordnial = new NumberColumn('סידורי');
}


export class WeeklyFamilyDeliveryProducts extends IdEntity<Id>{

  constructor() {
    super(new Id(), {
      name: 'WeeklyFamilyDeliveryProducts',
      allowApiCRUD: true
    })
  }
  delivery = new WeeklyFamilyDeliveryId();
  product = new ProductId();
  requestQuanity = new NumberColumn('כמות מבוקשת');
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
