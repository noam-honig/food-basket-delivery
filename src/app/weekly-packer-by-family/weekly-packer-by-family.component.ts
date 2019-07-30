import { Component, OnInit } from '@angular/core';

import { Roles, WeeklyFamilyPackerGuard } from '../auth/roles';
import { Route } from '@angular/router';

@Component({
  selector: 'app-weekly-packer-by-family',
  templateUrl: './weekly-packer-by-family.component.html',
  styleUrls: ['./weekly-packer-by-family.component.scss']
})
export class WeeklyPackerByFamilyComponent {

  static route: Route = {
    path: 'weekly-packer-by-family',
    component: WeeklyPackerByFamilyComponent,
    data: { name: 'אריזה לפי חבילות' }, canActivate: [WeeklyFamilyPackerGuard]
  }



}
