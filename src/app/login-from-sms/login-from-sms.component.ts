import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, Route } from '@angular/router';

import { AuthService } from '../auth/auth-service';
import { DialogService } from '../select-popup/dialog';
import { RouteHelperService } from '@remult/angular';
import { LoginComponent } from '../users/login/login.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-login-from-sms',
  templateUrl: './login-from-sms.component.html',
  styleUrls: ['./login-from-sms.component.scss']
})
export class LoginFromSmsComponent implements OnInit {
  static route: Route = {
    path: 'x/:id',
    component: LoginFromSmsComponent
  };
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authServer: AuthService,
    private dialog: DialogService,
    private routeHelper: RouteHelperService,
    public settings:ApplicationSettings
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(async x => {

      var id = x.get('id');


       await this.authServer.loginFromSms(id);
      

    });
  }

}
