import { Component, OnInit } from '@angular/core';
import { foreachSync, foreachEntityItem } from '../../shared/utils';

import { DialogService } from '../../select-popup/dialog';
import { AuthService } from '../../auth/auth-service';
import { Router, Route } from '@angular/router';
import { ApplicationSettings } from '../../manage/ApplicationSettings';
import { evilStatics } from '../../auth/evil-statics';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  static route: Route = { path: 'login', component: LoginComponent, data: { name: 'כניסה' } };
  constructor(
    private dialog: DialogService,
    private auth: AuthService,
    private router: Router
  ) { }
  user: string;
  password: string;
  remember: boolean;
  ngOnInit() {
  }
  getLogo() {
    return ApplicationSettings.get().logoUrl.value;
  }
  login() {
    this.auth.login(this.user, this.password, this.remember, () => this.password = '');

  }
  register() {
    this.router.navigate([evilStatics.routes.register]);
  }
}
