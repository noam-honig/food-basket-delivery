import { Component, OnInit } from '@angular/core';
import { AuthorizedGuardRoute, AuthorizedGuard } from 'radweb';
import { Roles } from '../auth/roles';


@Component({
  selector: 'app-address-problem',
  templateUrl: './address-problem.component.html',
  styleUrls: ['./address-problem.component.scss']
})
export class AddressProblemComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }
  static route: AuthorizedGuardRoute = {
    path: 'address-problem',
    component: AddressProblemComponent,
    data: {
      name: 'כתובות בעיתיות',
      allowedRoles: [Roles.deliveryAdmin],
      //@ts-ignore
      seperator: true
    }, canActivate: [AuthorizedGuard]
  }
}
