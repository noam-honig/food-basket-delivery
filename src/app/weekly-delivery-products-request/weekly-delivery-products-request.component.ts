import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';
import { Context } from '../shared/context';
import { Products } from '../weekly-families-deliveries/weekly-families-deliveries.component';

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

  quantity=0;
  add(amount:number){
    this.quantity=+this.quantity+amount;
  }

}
