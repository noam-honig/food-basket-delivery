import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';


import { Context, AuthorizedGuard, AuthorizedGuardRoute } from 'radweb';
import { Products } from '../weekly-families-deliveries/weekly-families-deliveries';
import { Roles } from '../auth/roles';
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
      p.name, { column: p.order, width: '90' }
    ],
    knowTotalRows: true,
    get: {
      orderBy: p => [p.order, p.name],
      limit: 50
    }
  });
  ngOnInit() {

  }
  static route: AuthorizedGuardRoute = {
    path: 'products',
    component: ProductsComponent,
    data: {
      name: 'מוצרים', allowedRoles: [Roles.weeklyFamilyAdmin],
    //@ts-ignore
    seperator: true
    }, canActivate: [AuthorizedGuard]
  }
}
