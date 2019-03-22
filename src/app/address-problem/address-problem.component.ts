import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin } from '../auth/auth-guard';

@Component({
  selector: 'app-address-problem',
  templateUrl: './address-problem.component.html',
  styleUrls: ['./address-problem.component.scss']
})
export class AddressProblemComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }
  static route: Route = {
    path: 'address-problem',
    component: AddressProblemComponent,
    data: { name: 'כתובות בעיתיות' ,seperator:true}, canActivate: [HolidayDeliveryAdmin]
  }
}
