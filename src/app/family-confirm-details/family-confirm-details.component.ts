import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Controller, remult } from 'remult'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { DialogService } from '../select-popup/dialog'
import { FamilyConfirmDetailsController } from './family-confirm-details.controller'

@Component({
  selector: 'app-family-confirm-details',
  templateUrl: './family-confirm-details.component.html',
  styleUrls: ['./family-confirm-details.component.scss']
})
@Controller('family-confirm-details')
export class FamilyConfirmDetailsComponent
  extends FamilyConfirmDetailsController
  implements OnInit
{
  constructor(
    public settings: ApplicationSettings,
    private route: ActivatedRoute,
    private ui: DialogService
  ) {
    super()
  }
  provideComment() {
    this.ui.inputAreaDialog({
      title: 'עדכון פרטים',
      fields: [this.$.comment],
      ok: () => {
        this.updateComment()
      },
      cancel: () => {}
    })
  }

  async ngOnInit() {
    this.deliveryId = this.route.snapshot.params['id']
    const r = await this.load()
    if (r)
      this.familyDelivery = await remult
        .repo(ActiveFamilyDeliveries)
        .fromJson(r)
  }
}
