import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, Route } from '@angular/router';

import { AuthService } from '../auth/auth-service';
import { DialogService } from '../select-popup/dialog';
import { RouteHelperService } from '@remult/core';
import { LoginComponent } from '../users/login/login.component';

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
    private routeHelper: RouteHelperService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(async x => {

      var id = x.get('id');


      let result = await this.authServer.loginFromSms(id);
      if (!result) {
        await this.dialog.YesNoPromise("משהו לא הסתדר עם הקישור, הנך מועבר למסך כניסה - אנא הכנס עם מספר הטלפון שלך");
        this.routeHelper.navigateToComponent(LoginComponent);
      }

    });
  }

}
