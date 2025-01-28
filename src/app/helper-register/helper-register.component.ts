import { Component, OnInit } from '@angular/core'
import { Route } from '@angular/router'
import { Helpers } from '../helpers/helpers'
import { Fields, getFields, remult, repo } from 'remult'
import { DataAreaSettings } from '../common-ui-elements/interfaces'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { isPhoneValidForIsrael } from '../model-shared/phone'
import { HelpersController } from '../helpers/helpers.controller'
import { IntakeFormController } from '../intake-form/intake-form.controllet'
import { Sites } from '../sites/sites'
import { SderotGuard } from '../auth/guards'

@Component({
  selector: 'helper-register',
  templateUrl: './helper-register.component.html',
  styleUrl: './helper-register.component.scss'
})
export class HelperRegisterComponent implements OnInit {
  constructor() {}

  static route: Route = {
    path: 'helper-register',
    component: HelperRegisterComponent,
    canActivate: [SderotGuard],
    data: { hide: true, noBar: true, noConfHeaderAndBorders: true }
  }

  @Fields.boolean({
    caption: 'קראתי את הצהרת ההתנדבות ואני מאשר/ת את הכתוב בה',
    customInput: (x) => x.ugaConfirm()
  })
  agreeToTerms: boolean
  complete: boolean = false

  error: string = ''

  helper!: Helpers
  helperDataArea!: DataAreaSettings

  basketTypes: {
    id: string
    name: string
    intakeCommentInstructions: string
    selected: boolean
  }[] = []
  ngOnInit() {
    this.loadBasketTypes()
    this.load()
  }

  async loadBasketTypes() {
    this.basketTypes = (await IntakeFormController.getBasketTypes()).map(
      (basketType) => ({ ...basketType, selected: false })
    )
  }

  load() {
    this.helper = repo(Helpers).create()

    this.helperDataArea = new DataAreaSettings({
      fields: () => [
        this.helper.$.name,
        this.helper.$.phone,
        this.helper.$.email,
        this.helper.$.socialSecurityNumber,
        this.helper.$.preferredDistributionAreaAddress,
        this.$.agreeToTerms
      ]
    })
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

    if (err) {
      this.error = 'נא למלא את השדות הנדרשים'
      return
    }
    if (!this.agreeToTerms) {
      this.error = 'יש לאשר את הצהרת ההתנדבות'
      return
    }
    if (
      !this.basketTypes.filter((basketType) => !!basketType.selected).length &&
      this.basketTypes.length
    )
      this.error = 'יש לבחור לכל הפחות סוג סל אחד לחלוקה'
  }

  async save() {
    this.validate()
    if (this.error) return
    this.complete = await HelpersController.saveHelper(
      this.helper,
      this.basketTypes.filter((basketType) => !!basketType.selected)
    )
    if (!this.complete) this.error = 'תהליך הרשמה נכשל!'
  }

  get logo() {
    return ApplicationSettings.get().logoUrl
  }

  get link() {
    let link =
      window.origin + '/' + Sites.getOrganizationFromContext() + '/login'

    return link
  }

  get $() {
    return getFields<HelperRegisterComponent>(this)
  }
}
