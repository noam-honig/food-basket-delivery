import { Component, OnInit, ViewChild } from '@angular/core';
import { UserFamiliesList } from './user-families';
import { Route } from '@angular/router';

import { Context, SignedInGuard } from 'radweb';

import { Helpers } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  static route: Route = {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [SignedInGuard], data: { name: 'משפחות שלי' }
  };
  familyLists = new UserFamiliesList(this.context);
  get settings(){return ApplicationSettings.get(this.context);}
  constructor(public context: Context) { }
  async ngOnInit() {
    await this.familyLists.initForHelper(this.context.user.id, this.context.user.name,await this.context.for(Helpers).findFirst(h => h.id.isEqualTo(this.context.user.id)));

  }


}
