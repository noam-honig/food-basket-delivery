import { Component, OnInit } from '@angular/core';

import { Roles, AdminGuard } from '../auth/roles';
import { Route } from '@angular/router';


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
    data: {
      name: 'כתובות בעיתיות',
      
      seperator: true
    }, canActivate: [AdminGuard]
  }
}
