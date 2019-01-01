import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { AdminGuard } from '../auth/auth-guard';
import { Context } from '../shared/context';
import { Products } from '../products/products';

@Component({
  selector: 'app-weekly-delivery-products-request',
  templateUrl: './weekly-delivery-products-request.component.html',
  styleUrls: ['./weekly-delivery-products-request.component.scss']
})
export class WeeklyDeliveryProductsRequestComponent implements OnInit {

  constructor(private context: Context) { }

  async ngOnInit() {
    this.products = await this.context.for(Products).find();
  }
  products: Products[];
  static route: Route = {
    path: 'WeeklyDeliveryProductsRequestComponent',
    component: WeeklyDeliveryProductsRequestComponent,
    data: { name: 'מוצרים לאריזה' }, canActivate: [AdminGuard]
  }
  quantity=0;
  add(amount:number){
    this.quantity=+this.quantity+amount;
  }

}
