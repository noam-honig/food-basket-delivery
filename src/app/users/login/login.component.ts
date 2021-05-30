import { Component, OnInit, ViewChild, NgZone, ElementRef, AfterContentInit, AfterViewInit } from '@angular/core';


import { DialogService } from '../../select-popup/dialog';
import { AuthService, loginResult } from '../../auth/auth-service';
import { Router, Route, RouteReuseStrategy } from '@angular/router';
import { ApplicationSettings } from '../../manage/ApplicationSettings';

import { Context } from '@remult/core';
import { RouteHelperService, NotSignedInGuard, InputControl, DataAreaSettings } from '@remult/angular';

import { AdminGuard } from '../../auth/roles';
import { Sites } from '../../sites/sites';

import { MatStepper } from '@angular/material/stepper';
import { Helpers, validatePasswordColumn } from '../../helpers/helpers';
import { Phone } from "../../model-shared/Phone";



@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  static route: Route = { path: 'login', component: LoginComponent, canActivate: [NotSignedInGuard] };
  phone = new InputControl<Phone>({ caption: this.settings.lang.phone, dataType: Phone });
  password = new InputControl<string>({ caption: this.settings.lang.password });
  newPassword = new InputControl<string>({ caption: this.settings.lang.password });
  confirmPassword = new InputControl<string>({ caption: this.settings.lang.confirmPassword });
  confirmEula = new InputControl<boolean>({ caption: this.settings.lang.IConfirmEula });

  name = new InputControl<string>({ caption: this.settings.lang.volunteerName });
  preferredDistributionArea = new InputControl<string>({ caption: this.settings.lang.preferredDistributionArea });
  remember = new InputControl<boolean>({ caption: this.settings.lang.rememberMeOnThisDevice });
  passwordArea = new DataAreaSettings({
    columnSettings: () => [{ column: this.password, inputType: 'password' }, this.remember]
  });
  phoneArea = new DataAreaSettings({
    columnSettings: () => [{ column: this.phone, inputType: 'tel' }, this.remember]
  });

  nameArea = new DataAreaSettings({
    columnSettings: () => [this.name]
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
      phone: this.phone.value.thePhone,
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
    this.phone.value = new Phone((await import('../../model-shared/phone')).Phone.fixPhoneInput(this.phone.value.thePhone, this.context));
    if (!this.phone.value || this.phone.value.thePhone.length < 10) {
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
        this.newPassword.error = this.settings.lang.newPasswordMustBeNew;
        this.dialog.Error(this.settings.lang.newPasswordMustBeNew);
        return;

      }
      if (!this.newPassword.value || this.newPassword.value != this.confirmPassword.value) {
        this.newPassword.error = this.settings.lang.passwordDoesntMatchConfirmPassword;
        this.dialog.Error(this.settings.lang.passwordDoesntMatchConfirmPassword);
        return;
      }
      validatePasswordColumn(this.context, this.newPassword);
      if (this.newPassword.error) {
        this.dialog.Error(this.newPassword.error);
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
      h.phone = this.phone.value;
      h.name = this.name.value;
      h.preferredDistributionAreaAddress = this.preferredDistributionArea.value;
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
    if (this.auth.failedSmsSignInPhone) {
      this.phone.value = new Phone(this.auth.failedSmsSignInPhone);
      this.doLogin();
    }
  }
  getLogo() {
    return ApplicationSettings.get(this.context).logoUrl;
  }
  login() {

    this.loginState.nextStep();

  }

  orgName() {
    return ApplicationSettings.get(this.context).organisationName;
  }
}


class loginState {
  constructor(public nextStep: () => Promise<void>) {

  }
}
