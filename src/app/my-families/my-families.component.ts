import { Component, OnInit, ViewChild } from '@angular/core';
import { UserFamiliesList } from './user-families';
import { Route } from '@angular/router';

import { Context, SignedInGuard, RouteHelperService } from '@remult/core';

import { Helpers, HelperUserInfo } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';

import { LoginComponent } from '../users/login/login.component';
import { AuthService } from '../auth/auth-service';


@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  static route: Route = {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [SignedInGuard], data: { name: 'משפחות שלי' }
  };
  familyLists = new UserFamiliesList(this.context, this.settings);
  user: HelperUserInfo;

  constructor(public context: Context, public settings: ApplicationSettings, private dialog: DialogService,  private helper: RouteHelperService,public sessionManager: AuthService) {
    this.user = context.user as HelperUserInfo;
  }
  async ngOnInit() {
    try {
      await this.familyLists.initForHelper(await this.context.for(Helpers).findFirst(h => h.id.isEqualTo(this.user.theHelperIAmEscortingId ? this.user.theHelperIAmEscortingId : this.context.user.id)));
    }
    catch (err) {
      this.dialog.exception("My Families: " + this.settings.lang.smsLoginFailed, err);
      this.sessionManager.signout();
      this.helper.navigateToComponent(LoginComponent);

    }

  }


}
