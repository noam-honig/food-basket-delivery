import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core'

import { DialogService } from '../../select-popup/dialog'
import { AuthService } from '../../auth/auth-service'
import { Route } from '@angular/router'
import { ApplicationSettings } from '../../manage/ApplicationSettings'

import { getFields, remult } from 'remult'
import {
  DataAreaSettings,
  DataControl
} from '../../common-ui-elements/interfaces'

import { Sites } from '../../sites/sites'

import { MatStepper } from '@angular/material/stepper'
import { Helpers, validatePasswordColumn } from '../../helpers/helpers'
import { Phone } from '../../model-shared/phone'
import { use, Field } from '../../translate'
import { NotAuthenticatedGuard } from '../../common-ui-elements'
import { loginResult } from '../../auth/auth-service.controller'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  static route: Route = {
    path: 'login',
    component: LoginComponent,
    canActivate: [NotAuthenticatedGuard]
  }
  @DataControl({ allowClick: () => false })
  @Field({ translation: (l) => l.phone, valueType: Phone })
  phone: Phone
  @Field({
    translation: (l) => l.password,
    inputType: 'password'
  })
  password: string
  @Field({
    translation: (l) => l.password,
    inputType: 'password'
  })
  newPassword: string
  @Field({
    translation: (l) => l.confirmPassword,
    inputType: 'password'
  })
  confirmPassword: string
  @Field({
    translation: (l) => l.IConfirmEula
  })
  confirmEula: boolean

  @Field({ translation: (l) => l.preferredDistributionAreaAddress })
  preferredDistributionArea: string
  @Field({ translation: (l) => l.rememberMeOnThisDevice })
  remember: boolean
  passwordArea = new DataAreaSettings({
    fields: () => [{ field: this.$.password }, this.$.remember]
  })
  phoneArea = new DataAreaSettings({
    fields: () => [this.$.phone, this.$.remember]
  })
  get $() {
    return getFields(this)
  }

  setPasswordArea = new DataAreaSettings({
    fields: () => [
      {
        field: this.$.newPassword,
        visible: () => this.loginResult.requiredToSetPassword
      },
      {
        field: this.$.confirmPassword,
        visible: () => this.loginResult.requiredToSetPassword
      },
      {
        field: this.$.confirmEula,
        visible: () => this.loginResult.requiredToSignEULA
      }
    ]
  })
  constructor(
    private dialog: DialogService,
    private auth: AuthService,
    public settings: ApplicationSettings
  ) {}
  ngAfterViewInit(): void {
    if (this.phoneForm) {
      this.phoneForm.nativeElement.getElementsByTagName('input')[0].focus()
    }

    if (this.stepper) {
      this.stepper.animationDone.subscribe(() => {
        if (this.passwordForm) {
          let input =
            this.passwordForm.nativeElement.getElementsByTagName('input')[0]
          if (input) input.focus()
        }
      })
    }
  }
  isguest = Sites.getOrganizationFromContext() == Sites.guestSchema
  @ViewChild('stepper', { static: false }) stepper: MatStepper
  @ViewChild('passwordForm', { static: false }) passwordForm: ElementRef
  @ViewChild('phoneForm', { static: false }) phoneForm: ElementRef

  setState(state: loginState) {
    this.loginState = state
    this.stepper.next()
  }
  loginResult: loginResult = {}
  async doLogin() {
    let prev = this.loginResult
    this.loginResult = await this.auth.login(
      {
        phone: this.phone.thePhone,
        password: this.password,
        newPassword: this.newPassword,
        EULASigned: this.confirmEula
      },
      this.remember
    )
    if (prev.requiredToSignEULA) this.loginResult.requiredToSignEULA = true
    if (this.loginResult.invalidUser) {
      this.dialog.Error(this.settings.lang.userNotFound)
      return
    }
    if (this.loginResult.needPasswordToLogin) {
      this.setState(this.passwordState)
      return
    }
    if (this.loginResult.invalidPassword) {
      this.dialog.Error(this.settings.lang.WrongPassword)
      if (this.loginState != this.passwordState) {
        this.setState(this.phoneState)
        this.stepper.previous()
      }
      return
    }
    if (
      this.loginResult.requiredToSetPassword ||
      this.loginResult.requiredToSignEULA
    ) {
      this.setState(this.updatePasswordAndEulaState)
      return
    }
    this.setState(this.phoneState)
    this.stepper.previous()
  }

  phoneState = new loginState(async () => {
    this.phone = new Phone(
      (await import('../../model-shared/phone')).Phone.fixPhoneInput(
        this.phone.thePhone
      )
    )
    if (!this.phone || this.phone.thePhone.length < 10) {
      this.dialog.Error(this.settings.lang.invalidPhoneNumber)
      return
    }
    this.password = ''
    this.newPassword = ''
    this.confirmPassword = ''
    this.confirmEula = false
    this.doLogin()
  })
  passwordState = new loginState(async () => {
    this.doLogin()
  })
  updatePasswordAndEulaState = new loginState(async () => {
    this.$.newPassword.error = ''
    if (this.loginResult.requiredToSetPassword) {
      if (this.newPassword == this.password) {
        this.$.newPassword.error = this.settings.lang.newPasswordMustBeNew
        this.resetPasswords()
        this.dialog.Error(this.settings.lang.newPasswordMustBeNew)
        return
      }
      if (!this.newPassword || this.newPassword != this.confirmPassword) {
        this.$.newPassword.error =
          this.settings.lang.passwordDoesntMatchConfirmPassword
        this.resetPasswords()
        this.dialog.Error(this.settings.lang.passwordDoesntMatchConfirmPassword)
        return
      }
      validatePasswordColumn(this.$.newPassword)
      if (this.$.newPassword.error) {
        this.resetPasswords()
        this.dialog.Error(this.$.newPassword.error)
        return
      }
    }

    if (this.loginResult.requiredToSignEULA && !this.confirmEula) {
      this.dialog.Error(this.settings.lang.mustConfirmEula)
      return
    }
    this.doLogin()
  })

  private resetPasswords() {
    this.newPassword = ''
    this.confirmPassword = ''
  }

  loginState = this.phoneState

  ngOnInit() {
    if (this.auth.failedSmsSignInPhone) {
      this.phone = new Phone(this.auth.failedSmsSignInPhone)
      this.doLogin()
    }
  }
  getLogo() {
    return ApplicationSettings.get().logoUrl
  }
  login() {
    this.loginState.nextStep()
  }

  orgName() {
    return ApplicationSettings.get().organisationName
  }
}

class loginState {
  constructor(public nextStep: () => Promise<void>) {}
}
