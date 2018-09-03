import { Component, OnInit, ViewChild } from '@angular/core';
import { UserFamiliesList } from './user-families';
import { Route } from '@angular/router';
import { LoggedInGuard } from '../auth/auth-guard';
import { Context } from '../shared/context';

@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  static route: Route = {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [LoggedInGuard], data: { name: 'משפחות שלי' }
  };
  familyLists = new UserFamiliesList(this.context);

  constructor(public context:Context) { }
  async ngOnInit() {
    await this.familyLists.initForHelper(this.context.info.helperId, this.context.info.name);

  }


}
