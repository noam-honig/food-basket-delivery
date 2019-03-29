import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, Route } from '@angular/router';

import { AuthService } from '../auth/auth-service';

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
    private authServer: AuthService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(async x => {

      var id = x.get('id');
      

      this.authServer.loginFromSms(id);

    });
  }

}
