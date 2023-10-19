import { Component, OnInit } from '@angular/core'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { IntakeFormController } from './intake-form.controllet'
import { DataAreaSettings } from '../common-ui-elements/interfaces'
import { DialogService } from '../select-popup/dialog'

@Component({
  selector: 'app-intake-form',
  templateUrl: './intake-form.component.html',
  styleUrls: ['./intake-form.component.scss']
})
export class IntakeFormComponent implements OnInit {
  constructor(
    public settings: ApplicationSettings,
    private ui: DialogService
  ) {}

  ngOnInit(): void {
    IntakeFormController.getBasketTypes().then((basketTypes) => {
      this.i.basketTypes = basketTypes
      this.area = new DataAreaSettings({
        fields: () => {
          let i = this.i.$
          return [
            i.tz,
            i.firstName,
            i.name,
            i.address,
            {
              caption: this.settings.lang.addressByGoogle,
              getValue: () => this.i.addressByGoogle
            },
            [i.appartment, i.floor, i.entrance],
            i.addressComment,
            [i.phone1, i.phone1Description],
            [i.phone2, i.phone2Description],
            {
              field: i.basketType,
              valueList: basketTypes.map(({ id, name }) => ({
                id,
                caption: name
              }))
            }
          ]
        }
      })
    })
  }
  getInstructions() {
    return this.i.basketTypes.find((y) => y.id === this.i.basketType)
      ?.intakeCommentInstructions
  }
  i = new IntakeFormController()
  area: DataAreaSettings
  response = ''
  async send() {
    try {
      this.response = await this.i.submit()
      this.area = undefined
    } catch (err) {
      this.ui.Error(err)
    }
  }
}
