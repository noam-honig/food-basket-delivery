import { Component, OnInit, Input } from '@angular/core';
import { WeeklyFamilyDeliveryProducts, WeeklyFamilyDeliveryProductStats } from '../weekly-families-deliveries/weekly-families-deliveries.component';
import { MatCheckboxChange } from '@angular/material';
import { BusyService } from '../select-popup/busy-service';

@Component({
  selector: 'app-product-quantity-in-delivery',
  templateUrl: './product-quantity-in-delivery.component.html',
  styleUrls: ['./product-quantity-in-delivery.component.scss']
})
export class ProductQuantityInDeliveryComponent implements OnInit {

  constructor(public busyService: BusyService) { }
  @Input() d: WeeklyFamilyDeliveryProductStats;
  ngOnInit() {
  }

  checkBoxChecked(e: MatCheckboxChange) {
    var q = this.d;
    if (e.checked) {
      q.Quantity.value = q.requestQuanity.value;
      if (!q.Quantity.value)
        q.Quantity.value = 1;
    }
    else {
      q.Quantity.value = 0;
    }
    q.saveQuantities(this.busyService);

  }

}
