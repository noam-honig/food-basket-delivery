import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';

import { AuthService } from '../auth/auth-service';
import { DialogService } from '../select-popup/dialog';
import { UserFamiliesList } from './user-families';
import { MapComponent } from '../map/map.component';
import { Route } from '@angular/router';
import { LoggedInGuard } from '../auth/auth-guard';

@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  static route: Route = {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [LoggedInGuard], data: { name: 'משפחות שלי' }
  };
  familyLists = new UserFamiliesList();

  constructor(public auth: AuthService, private dialog: DialogService) { }
  async ngOnInit() {
    await this.familyLists.initForHelper(this.auth.auth.info.helperId, this.auth.auth.info.name);

  }


}
