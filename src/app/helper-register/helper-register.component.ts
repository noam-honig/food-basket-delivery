import { Component, OnInit } from '@angular/core'
import { Route } from '@angular/router'
import { repo } from 'remult'

import { Helpers } from '../helpers/helpers'
import { DataAreaSettings } from '../common-ui-elements/interfaces'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { isPhoneValidForIsrael } from '../model-shared/phone'
import { HelpersController } from '../helpers/helpers.controller'
import { IntakeFormController } from '../intake-form/intake-form.controllet'
import { Sites } from '../sites/sites'
import { SderotGuard } from '../auth/guards'
import { VolunteerInstructions } from '../manage/VolunteerInstructions'
import { TermsOfJoining } from '../manage/TermsOfJoining'

@Component({
  selector: 'helper-register',
  templateUrl: './helper-register.component.html',
  styleUrl: './helper-register.component.scss'
})
export class HelperRegisterComponent implements OnInit {
  constructor(public settings: ApplicationSettings) {}

  static route: Route = {
    path: 'helper-register',
    component: HelperRegisterComponent,
    canActivate: [SderotGuard],
    data: { hide: true, noBar: true, noConfHeaderAndBorders: true }
  }

  agreeToTerms: boolean = false
  complete: boolean = false
  helperExists: boolean = false
  error: string = ''

  helper!: Helpers
  helperDataArea!: DataAreaSettings

  basketTypes: {
    id: string
    name: string
    intakeCommentInstructions: string
    selected: boolean
  }[] = []
  instructions: VolunteerInstructions[] = []
  terms: TermsOfJoining[] = []
  ngOnInit() {
    this.load()
  }

  async load() {
    await this.loadBasketTypes()
    await this.loadInstructions()
    await this.loadTerms()

    this.helper = repo(Helpers).create()

    this.helperDataArea = new DataAreaSettings({
      fields: () => [
        this.helper.$.name,
        this.helper.$.phone,
        this.helper.$.email,
        this.helper.$.socialSecurityNumber,
        this.helper.$.preferredFinishAddress
      ]
    })
  }

  async loadBasketTypes() {
    this.basketTypes = (await IntakeFormController.getBasketTypes()).map(
      (basketType) => ({ ...basketType, selected: false })
    )
  }

  async loadInstructions() {
    this.instructions = await repo(VolunteerInstructions).find({
      where: { active: true }
    })
  }

  async loadTerms() {
    this.terms = await repo(TermsOfJoining).find({ where: { active: true } })
  }

  validate() {
    let err = false
    this.error = ''
    if (!this.helper.name) {
      err = true
      this.helper.$.name.error = 'שדה חובה'
    } else this.helper.$.name.error = ''

    if (!this.helper.$.phone.value) {
      err = true
      this.helper.$.phone.error = 'שדה חובה'
    } else {
      if (!isPhoneValidForIsrael(this.helper.phone?.thePhone)) {
        err = true
        this.helper.$.phone.error = 'טלפון לא תקין'
      } else this.helper.$.phone.error = ''
    }

    if (!this.helper.socialSecurityNumber) {
      err = true
      this.helper.$.socialSecurityNumber.error = 'שדה חובה'
    } else this.helper.$.socialSecurityNumber.error = ''

    if (!this.helper.preferredFinishAddress) {
      err = true
      this.helper.$.preferredFinishAddress.error = 'שדה חובה'
    } else this.helper.$.preferredFinishAddress.error = ''

    if (err) {
      this.error = 'נא למלא את השדות הנדרשים'
      return
    }
    if (
      !this.basketTypes.filter((basketType) => !!basketType.selected).length &&
      this.basketTypes.length
    )
      this.error = 'יש לבחור לכל הפחות אפשרות התנדבות אחת'
    if (!this.agreeToTerms && (this.terms.length || this.instructions.length)) {
      this.error = 'יש לאשר את התנאים וההנחיות'
      return
    }
  }

  async save() {
    this.validate()
    if (this.error) return
    try {
      this.helperExists = await HelpersController.saveHelper(
        this.helper,
        this.basketTypes.filter((basketType) => !!basketType.selected)
      )

      this.complete = true
      this.openLogin()
    } catch (err) {
      this.error = 'תהליך הרשמה נכשל!'
    }
  }

  openLogin(): void {
    setTimeout(() => {
      window.open(
        window.origin + '/' + Sites.getOrganizationFromContext() + '/login',
        '_blank'
      )
    }, 5000)
  }

  get logo() {
    return ApplicationSettings.get().logoUrl
  }

  get link() {
    let link =
      window.origin + '/' + Sites.getOrganizationFromContext() + '/login'

    return link
  }
}
