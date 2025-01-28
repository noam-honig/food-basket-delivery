/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core'

import { Helpers } from '../../helpers/helpers'
import { DialogService } from '../../select-popup/dialog'
import { AuthService } from '../../auth/auth-service'
import {
  InputField,
  GridSettings,
  DataAreaSettings
} from '../../common-ui-elements/interfaces'
import { Route } from '@angular/router'
import { remult, repo } from 'remult'
import { ApplicationSettings } from '../../manage/ApplicationSettings'
import {
  AuthenticatedGuard,
  RouteHelperService
} from '../../common-ui-elements'
import { HelperBasketTypes } from '../../helper-register/HelperBasketTypes'
import { isSderot } from '../../sites/sites'
import { BasketType } from '../../families/BasketType'

@Component({
  selector: 'app-update-info',
  templateUrl: './update-info.component.html',
  styleUrls: ['./update-info.component.scss']
})
export class UpdateInfoComponent implements OnInit, AfterViewInit {
  constructor(
    private dialog: DialogService,
    private auth: AuthService,
    public sessionManager: AuthService,
    public settings: ApplicationSettings,
    private helper: RouteHelperService
  ) {}

  static route: Route = {
    path: 'update-info',
    component: UpdateInfoComponent,
    canActivate: [AuthenticatedGuard]
  }

  confirmPassword = new InputField<string>({
    caption: this.settings.lang.confirmPassword,
    inputType: 'password',
    defaultValue: () => Helpers.emptyPassword
  })
  h: Helpers

  area: DataAreaSettings

  basketTypes: any[] = []
  originalBasketTypes: any[] = []
  helperBasketTypes: HelperBasketTypes[] = []
  ngAfterViewInit(): void {}

  async ngOnInit() {
    this.h = await remult.context.getCurrentUser()
    await this.h._.reload()
    if (!this.h.password) this.confirmPassword.value = ''
    this.area = new DataAreaSettings({
      fields: () => [
        this.h.$.name,
        this.h.$.phone,
        this.h.$.email,
        { field: this.h.$.preferredDistributionAreaAddress },
        { field: this.h.$.preferredFinishAddress },
        {
          field: this.h.$.eventComment,
          visible: () => this.settings.volunteerCanUpdateComment
        },
        this.h.$.password,
        { field: this.confirmPassword }

        //h.address
      ]
    })
    if (isSderot()) await this.loadBasketTypes()
  }
  async register() {
    try {
      if (this.h.password != this.confirmPassword.value) {
        this.dialog.Error(this.settings.lang.passwordDoesntMatchConfirmPassword)
      } else {
        await this.h.save()
        if (isSderot()) {
          await this.saveBasketTypes()
        }
        this.dialog.Info(this.settings.lang.updateSaved)
        this.confirmPassword.value = this.h.password
          ? Helpers.emptyPassword
          : ''
        this.helper.navigateToComponent(
          (await import('../../my-families/my-families.component'))
            .MyFamiliesComponent
        )
      }
    } catch (err) {}
  }

  async loadBasketTypes() {
    this.basketTypes = (await repo(BasketType).find()).map((basketType) => ({
      ...basketType,
      selected: false
    }))

    this.helperBasketTypes = await repo(HelperBasketTypes).find({
      where: {
        helperId: this.h.id
      }
    })
    
    this.basketTypes.forEach(
      (basket) =>
        (basket.selected = !!this.helperBasketTypes.find(
          (helperBasket) => helperBasket.basketType.id == basket.id
        ))
    )

    this.originalBasketTypes = this.basketTypes.map((basket) => ({ ...basket }))
  }

  async saveBasketTypes() {
    const changeBasketTypes = this.basketTypes.filter(
      (basket) =>
        basket.selected !=
        this.originalBasketTypes.find(
          (originalBasket) => originalBasket.id == basket.id
        )?.selected
    )

    const newbasketTypes = changeBasketTypes
      .filter((basket) => basket.selected)
      .map((basket) => ({ basketType: basket.id, helperId: this.h.id }))
    const deleteBasketTypes = changeBasketTypes
      .filter((basket) => !basket.selected)
      .map((basket) => basket.id)

    if (newbasketTypes.length)
      await repo(HelperBasketTypes).insert(newbasketTypes)

    if (deleteBasketTypes.length)
      await repo(HelperBasketTypes).deleteMany({
        where: { helperId: this.h.id, basketType: deleteBasketTypes }
      })
  }

  isSderot() {
    return isSderot()
  }

  signout() {
    this.sessionManager.signout()
  }
}
AuthService.UpdateInfoComponent = UpdateInfoComponent
