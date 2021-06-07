import { Component, OnInit, ViewChild, NgZone, ElementRef, AfterContentInit, AfterViewInit } from '@angular/core';


import { DialogService } from '../../select-popup/dialog';
import { AuthService, loginResult } from '../../auth/auth-service';
import { Router, Route, RouteReuseStrategy } from '@angular/router';
import { ApplicationSettings } from '../../manage/ApplicationSettings';

import { Context, getControllerDefs, InputTypes } from '@remult/core';
import { RouteHelperService, NotSignedInGuard, InputField, DataAreaSettings, DataControl } from '@remult/angular';

import { AdminGuard } from '../../auth/roles';
import { Sites } from '../../sites/sites';

import { MatStepper } from '@angular/material/stepper';
import { Helpers, validatePasswordColumn } from '../../helpers/helpers';
import { Phone } from "../../model-shared/Phone";
import { use,Field } from '../../translate';



@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  static route: Route = { path: 'login', component: LoginComponent, canActivate: [NotSignedInGuard] };
  @DataControl({ allowClick: () => false })
  @Field({ caption: use.language.phone, dataType: Phone })
  phone: Phone;
  @Field({
    caption: use.language.password,
    inputType: InputTypes.password
  })
  password: string;
  @Field({
    caption: use.language.password,
    inputType: InputTypes.password
  })
  newPassword: string;
  @Field({
    caption: use.language.confirmPassword,
    inputType: InputTypes.password
  })
  confirmPassword: string;
  @Field({
    caption: use.language.IConfirmEula,
    inputType: InputTypes.password
  })
  confirmEula: boolean;
  @Field({ caption: use.language.volunteerName })
  name: string;
  @Field({ caption: use.language.preferredDistributionArea })
  preferredDistributionArea: string;
  @Field({ caption: use.language.rememberMeOnThisDevice })
  remember: boolean;
  passwordArea = new DataAreaSettings({
    fields: () => [{ field: this.$.password }, this.$.remember]
  });
  phoneArea = new DataAreaSettings({
    fields: () => [this.$.phone, this.$.remember]
  });
  get $() { return getControllerDefs(this).columns }
  nameArea = new DataAreaSettings({
    fields: () => [this.$.name]
  });
  setPasswordArea = new DataAreaSettings({
    fields: () => [
      { column: this.$.newPassword, visible: () => this.loginResult.requiredToSetPassword },
      { column: this.$.confirmPassword, visible: () => this.loginResult.requiredToSetPassword },
      { column: this.$.confirmEula, visible: () => this.loginResult.requiredToSignEULA }
    ]
  });
  constructor(
    private dialog: DialogService,
    private auth: AuthService,
    private context: Context,
    public settings: ApplicationSettings
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
      phone: this.phone.thePhone,
      password: this.password,
      newPassword: this.newPassword,
      EULASigned: this.confirmEula

    }, this.remember);
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
    this.phone = new Phone((await import('../../model-shared/phone')).Phone.fixPhoneInput(this.phone.thePhone, this.context));
    if (!this.phone || this.phone.thePhone.length < 10) {
      this.dialog.Error(this.settings.lang.invalidPhoneNumber);
      return;
    }
    this.password = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.confirmEula = false;
    this.doLogin();
  });
  passwordState = new loginState(async () => {
    this.doLogin();
  });
  updatePasswordAndEulaState = new loginState(async () => {

    if (this.loginResult.requiredToSetPassword) {
      if (this.newPassword == this.password) {
        this.$.newPassword.error = this.settings.lang.newPasswordMustBeNew;
        this.dialog.Error(this.settings.lang.newPasswordMustBeNew);
        return;

      }
      if (!this.newPassword || this.newPassword != this.confirmPassword) {
        this.$.newPassword.error = this.settings.lang.passwordDoesntMatchConfirmPassword;
        this.dialog.Error(this.settings.lang.passwordDoesntMatchConfirmPassword);
        return;
      }
      validatePasswordColumn(this.context, this.$.newPassword);
      if (this.$.newPassword.error) {
        this.dialog.Error(this.$.newPassword.error);
        return;
      }
    }

    if (this.loginResult.requiredToSignEULA && !this.confirmEula) {
      this.dialog.Error(this.settings.lang.mustConfirmEula);
      return;
    }
    this.doLogin();
  });
  newUserState = new loginState(async () => {
    try {
      let h = this.context.for(Helpers).create();
      h.phone = this.phone;
      h.name = this.name;
      h.preferredDistributionAreaAddress = this.preferredDistributionArea;
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
      this.phone = new Phone(this.auth.failedSmsSignInPhone);
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
