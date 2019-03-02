import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';

import { HolidayDeliveryAdmin, WeeklyFamilyAdminGuard } from '../auth/auth-guard';
import { Context } from '../shared/context';
import { Products } from '../weekly-families-deliveries/weekly-families-deliveries.component';
@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {

  constructor(private context: Context) { }
  products = this.context.for(Products).gridSettings({
    allowUpdate: true,
    allowInsert: true,
    columnSettings: p => [
      p.name,{column: p.order,width:'90'}
    ],
    knowTotalRows:true,
    get: {
      orderBy: p => [p.order, p.name],
      limit:50
    }
  });
  ngOnInit() {
    
  }
  static route: Route = {
    path: 'products',
    component: ProductsComponent,
    data: { name: 'מוצרים' }, canActivate: [WeeklyFamilyAdminGuard]
  }
}
