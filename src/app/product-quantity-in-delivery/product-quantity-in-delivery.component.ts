import { Component, OnInit, Input } from '@angular/core';
import { WeeklyFamilyDeliveryProducts } from '../weekly-families-deliveries/weekly-families-deliveries.component';
import { MatCheckboxChange } from '@angular/material';

@Component({
  selector: 'app-product-quantity-in-delivery',
  templateUrl: './product-quantity-in-delivery.component.html',
  styleUrls: ['./product-quantity-in-delivery.component.scss']
})
export class ProductQuantityInDeliveryComponent implements OnInit {

  constructor() { }
  @Input() d:WeeklyFamilyDeliveryProducts;
  ngOnInit() {
  }

  checkBoxChecked(e: MatCheckboxChange) {
    var q = this.d;
    if (e.checked) {
      q.Quantity.value = q.requestQuanity.value;
    }
    else {
      q.Quantity.value = 0;
    }
    q.save();

  }

}
