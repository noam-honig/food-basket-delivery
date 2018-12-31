import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';

import { AdminGuard } from '../auth/auth-guard';
@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }
  static route: Route = {
    path: 'products',
    component: ProductsComponent,
    data: { name: 'מוצרים' }, canActivate: [AdminGuard]
  }
}
