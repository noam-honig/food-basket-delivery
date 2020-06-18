import { Component, OnInit, ViewChild, NgZone, ElementRef, AfterContentInit, AfterViewInit } from '@angular/core';


import { DialogService } from '../../select-popup/dialog';
import { AuthService } from '../../auth/auth-service';
import { Router, Route, RouteReuseStrategy } from '@angular/router';
import { ApplicationSettings } from '../../manage/ApplicationSettings';

import { Context, RouteHelperService, NotSignedInGuard, StringColumn, BoolColumn, DataAreaSettings } from '@remult/core';
import { AdminGuard } from '../../auth/roles';
import { Sites } from '../../sites/sites';
import { CustomReuseStrategy } from 'src/app/custom-reuse-controller-router-strategy';
import { MatStepper } from '@angular/material';
import { Helpers } from '../../helpers/helpers';



@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  static route: Route = { path: 'login', component: LoginComponent, canActivate: [NotSignedInGuard] };
  phone = new StringColumn(this.settings.lang.phone);
  password = new StringColumn(this.settings.lang.password);
  name = new StringColumn(this.settings.lang.volunteerName);
  remember = new BoolColumn(this.settings.lang.rememberMeOnThisDevice);
  passwordArea = new DataAreaSettings<any>({
    columnSettings: () => [{ column: this.password, inputType: 'password' }]
  });
  phoneArea = new DataAreaSettings<any>({
    columnSettings: () => [{ column: this.phone, inputType: 'phone' }, this.remember]
  });

  constructor(
    private dialog: DialogService,
    private auth: AuthService,
    private router: RouteHelperService,
    private context: Context,
    private routeReuseStrategy: RouteReuseStrategy,
    public settings: ApplicationSettings,
    private zone: NgZone
  ) { }
  ngAfterViewInit(): void {
    if (this.phoneForm) {
      this.phoneForm.nativeElement.getElementsByTagName('input')[0].focus();
    }

    if (this.stepper) {
      this.stepper.animationDone.subscribe(() => {
        if (this.passwordForm) {
          let input = this.passwordForm.nativeElement.getElementsByTagName('input')[0];
          if (input)
            input.focus();
        }
      });
    }

  }
  isguest = Sites.getOrganizationFromContext(this.context) == Sites.guestSchema;
  @ViewChild("stepper", { static: false }) stepper: MatStepper;
  @ViewChild("passwordForm", { static: false }) passwordForm: ElementRef;
  @ViewChild("phoneForm", { static: false }) phoneForm: ElementRef;

  setState(state: loginState) {
    this.loginState = state;
    this.stepper.next();
  }

  phoneState = new loginState(async () => {
    this.phone.value = (await import('src/app/model-shared/types')).PhoneColumn.fixPhoneInput(this.phone.value);
    if (!this.phone.value||this.phone.value.length<10){
      this.dialog.Error(this.settings.lang.invalidPhoneNumber);
      return;
    }
    this.auth.login(this.phone.value, '', this.remember.value,
      () => {
        this.setState(this.nameState);
      }, () => {
        this.setState(this.passwordState);
      });
  });
  passwordState = new loginState(async () => {
    this.auth.login(this.phone.value, this.password.value, this.remember.value,
      () => {
        this.dialog.Error(this.settings.lang.userNotFoundOrWrongPassword);
      }, () => {
        this.dialog.Error(this.settings.lang.userNotFoundOrWrongPassword);
      });
  });
  nameState = new loginState(async () => {
    try {
      let h = this.context.for(Helpers).create();
      h.phone.value = this.phone.value;
      h.name.value = this.name.value;
      await h.save();
      this.auth.login(this.phone.value, '', this.remember.value,
        () => {
          this.dialog.Error(this.settings.lang.userNotFoundOrWrongPassword);
          this.loginState = this.phoneState;
        }, () => {
          this.dialog.Error(this.settings.lang.userNotFoundOrWrongPassword);
          this.loginState = this.phoneState;
        });

    }
    catch (err) {
      this.dialog.exception(this.settings.lang.register, err);
      this.loginState = this.phoneState;
    }
  });
  loginState = this.phoneState;


  ngOnInit() {
  }
  getLogo() {
    return ApplicationSettings.get(this.context).logoUrl.value;
  }
  login() {

    this.loginState.nextStep();

  }
  
  orgName() {
    return ApplicationSettings.get(this.context).organisationName.value;
  }
}


class loginState {
  constructor(public nextStep: () => Promise<void>) {

  }
}
