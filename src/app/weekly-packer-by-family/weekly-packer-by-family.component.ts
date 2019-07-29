import { Component, OnInit } from '@angular/core';
import { AuthorizedGuard, AuthorizedGuardRoute } from 'radweb';
import { Roles } from '../auth/roles';

@Component({
  selector: 'app-weekly-packer-by-family',
  templateUrl: './weekly-packer-by-family.component.html',
  styleUrls: ['./weekly-packer-by-family.component.scss']
})
export class WeeklyPackerByFamilyComponent {

  static route: AuthorizedGuardRoute = {
    path: 'weekly-packer-by-family',
    component: WeeklyPackerByFamilyComponent,
    data: { name: 'אריזה לפי חבילות', allowedRoles: [Roles.weeklyFamilyPacker] }, canActivate: [AuthorizedGuard]
  }



}
