import { Component, OnInit, ViewChild, NgZone, ElementRef, AfterContentInit, AfterViewInit } from '@angular/core';


import { DialogService } from '../../select-popup/dialog';
import { AuthService, loginResult } from '../../auth/auth-service';
import { Router, Route, RouteReuseStrategy } from '@angular/router';
import { ApplicationSettings } from '../../manage/ApplicationSettings';

import { Context, RouteHelperService, NotSignedInGuard, StringColumn, BoolColumn, DataAreaSettings } from '@remult/core';
import { AdminGuard } from '../../auth/roles';
import { Sites } from '../../sites/sites';
import { CustomReuseStrategy } from 'src/app/custom-reuse-controller-router-strategy';
import { MatStepper } from '@angular/material';
import { Helpers, validatePasswordColumn } from '../../helpers/helpers';



@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  static route: Route = { path: 'login', component: LoginComponent, canActivate: [NotSignedInGuard] };
  phone = new StringColumn(this.settings.lang.phone);
  password = new StringColumn(this.settings.lang.password);
  newPassword = new StringColumn(this.settings.lang.password);
  confirmPassword = new StringColumn(this.settings.lang.confirmPassword);
  confirmEula = new BoolColumn(this.settings.lang.IConfirmEula);

  name = new StringColumn(this.settings.lang.volunteerName);
  preferredDistributionArea = new StringColumn(this.settings.lang.preferredDistributionArea);
  remember = new BoolColumn(this.settings.lang.rememberMeOnThisDevice);
  passwordArea = new DataAreaSettings({
    columnSettings: () => [{ column: this.password, inputType: 'password' }, this.remember]
  });
  phoneArea = new DataAreaSettings({
    columnSettings: () => [{ column: this.phone, inputType: 'tel' }, this.remember]
  });

  nameArea = new DataAreaSettings({
    columnSettings: () => [this.name, this.preferredDistributionArea]
  });
  setPasswordArea = new DataAreaSettings({
    columnSettings: () => [
      { column: this.newPassword, inputType: 'password', visible: () => this.loginResult.requiredToSetPassword },
      { column: this.confirmPassword, inputType: 'password', visible: () => this.loginResult.requiredToSetPassword },
      { column: this.confirmEula, visible: () => this.loginResult.requiredToSignEULA }
    ]
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
  loginResult: loginResult = {};
  async doLogin() {
    let prev = this.loginResult;
    this.loginResult = await this.auth.login({
      phone: this.phone.value,
      password: this.password.value,
      newPassword: this.newPassword.value,
      EULASigned: this.confirmEula.value

    }, this.remember.value);
    if (prev.requiredToSignEULA)
      this.loginResult.requiredToSignEULA = true;
    if (this.loginResult.newUser) {
      this.setState(this.newUserState);
      return;
    }

    if (this.loginResult.needPasswordToLogin) {
      this.setState(this.passwordState);
      return;
    }
    if (this.loginResult.invalidPassword) {
      this.dialog.Error(this.settings.lang.userNotFoundOrWrongPassword);
      if (this.loginState != this.passwordState) {
        this.setState(this.phoneState);
        this.stepper.previous();
      }
      return;
    }
    if (this.loginResult.requiredToSetPassword || this.loginResult.requiredToSignEULA) {
      this.setState(this.updatePasswordAndEulaState);
      return;
    }
    this.setState(this.phoneState);
    this.stepper.previous();
  }


  phoneState = new loginState(async () => {
    this.phone.value = (await import('src/app/model-shared/types')).PhoneColumn.fixPhoneInput(this.phone.value);
    if (!this.phone.value || this.phone.value.length < 10) {
      this.dialog.Error(this.settings.lang.invalidPhoneNumber);
      return;
    }
    this.password.value = '';
    this.newPassword.value = '';
    this.confirmPassword.value = '';
    this.confirmEula.value = false;
    this.doLogin();
  });
  passwordState = new loginState(async () => {
    this.doLogin();
  });
  updatePasswordAndEulaState = new loginState(async () => {

    if (this.loginResult.requiredToSetPassword) {
      if (this.newPassword.value == this.password.value) {
        this.newPassword.validationError = this.settings.lang.newPasswordMustBeNew;
        this.dialog.Error(this.settings.lang.newPasswordMustBeNew);
        return;

      }
      if (!this.newPassword.value || this.newPassword.value != this.confirmPassword.value) {
        this.newPassword.validationError = this.settings.lang.passwordDoesntMatchConfirmPassword;
        this.dialog.Error(this.settings.lang.passwordDoesntMatchConfirmPassword);
        return;
      }
      validatePasswordColumn(this.context,this.newPassword);
      if (this.newPassword.validationError){
        this.dialog.Error(this.newPassword.validationError);
        return;
      }
    }

    if (this.loginResult.requiredToSignEULA && !this.confirmEula.value) {
      this.dialog.Error(this.settings.lang.mustConfirmEula);
      return;
    }
    this.doLogin();
  });
  newUserState = new loginState(async () => {
    try {
      let h = this.context.for(Helpers).create();
      h.phone.value = this.phone.value;
      h.name.value = this.name.value;
      h.preferredDistributionAreaAddress.value = this.preferredDistributionArea.value;
      await h.save();
      this.doLogin();

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
