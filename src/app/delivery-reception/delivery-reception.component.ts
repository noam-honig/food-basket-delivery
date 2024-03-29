import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core'
import { remult } from 'remult'
import {
  DataControlInfo,
  GridSettings,
  InputField
} from '../common-ui-elements/interfaces'
import { BusyService, openDialog } from '../common-ui-elements'
import { DialogService } from '../select-popup/dialog'
import { FamilyDeliveries } from '../families/FamilyDeliveries'

import { Helpers } from '../helpers/helpers'
import { InputAreaComponent } from '../select-popup/input-area/input-area.component'
import { DeliveryStatus } from '../families/DeliveryStatus'

import { getLang } from '../sites/sites'
import { ActivatedRoute } from '@angular/router'
import { FamilyDeliveriesComponent } from '../family-deliveries/family-deliveries.component'
import { FamilyDeliveriesController } from '../family-deliveries/family-deliveries.controller'

@Component({
  selector: 'app-delivery-reception',
  templateUrl: './delivery-reception.component.html',
  styleUrls: ['./delivery-reception.component.scss']
})
export class DeliveryReceptionComponent implements OnInit, AfterViewInit {
  courier: Helpers
  showData = false
  urlParams = new URLSearchParams(window.location.search)
  deliveriesForPhone: string[] = []

  deliveries = new GridSettings(remult.repo(FamilyDeliveries), {
    allowUpdate: false,
    numOfColumnsInGrid: 3,
    rowCssClass: (f) => f.getCss(),

    knowTotalRows: true,

    rowsInPage: 100,
    where: () => ({ id: this.deliveriesForPhone }),
    orderBy: { name: 'asc' },
    columnSettings: (deliveries) => {
      let r = [
        { field: deliveries.name, width: '100' },
        { field: deliveries.basketType, width: '80' },
        {
          field: deliveries.quantity,
          width: '50'
        },
        { field: deliveries.receptionComments, width: '100' },
        deliveries.distributionCenter,
        { field: deliveries.deliverStatus, width: '110' },

        deliveries.deliveryComments,
        deliveries.internalDeliveryComment,
        deliveries.courierComments,

        deliveries.messageStatus,

        deliveries.createUser,
        { field: deliveries.createDate, width: '150' },

        deliveries.floor,
        deliveries.appartment,
        deliveries.entrance,
        { field: deliveries.addressComment },
        deliveries.area,
        deliveries.phone1,
        deliveries.phone1Description,
        deliveries.phone2,
        deliveries.phone2Description,
        deliveries.phone3,
        deliveries.phone3Description,
        deliveries.phone4,
        deliveries.phone4Description,
        { field: deliveries.courier, width: '100' }
      ]

      return r
    },

    rowButtons: [
      {
        name: '',
        icon: 'done_all',
        showInLine: true,
        click: async (d) => {
          if (await this.dialog.YesNoPromise(getLang().shouldArchiveDelivery)) {
            {
              d.archive = true

              d.distributionCenter =
                await remult.context.getUserDistributionCenter()
              d.deliverStatus = DeliveryStatus.Success
              await d.save()
              await this.refreshFamilyGrid()
            }
          }
        },
        textInMenu: () => getLang().receptionDone
      },
      {
        name: '',
        icon: 'report_problem',
        showInLine: true,
        click: async (d) => {
          d.deliverStatus = DeliveryStatus.FailedOther
          d.distributionCenter =
            await remult.context.getUserDistributionCenter()
          this.editComment(d)
        },
        textInMenu: () => getLang().notDelivered
      }
    ]
  })

  phone = new InputField<string>({
    caption: 'טלפון של תורם או מתנדב',
    inputType: 'tel'
  })

  constructor(
    public dialog: DialogService,
    private busy: BusyService,
    private route: ActivatedRoute
  ) {}
  private receptionCommentEntry(deliveries: FamilyDeliveries) {
    let r: DataControlInfo<FamilyDeliveries>[] = [
      {
        field: deliveries.$.receptionComments,
        width: '150'
      }
    ]
    return r
  }

  private editComment(d: FamilyDeliveries) {
    openDialog(
      InputAreaComponent,
      (x) =>
        (x.args = {
          title: getLang().commentForReception,
          validate: async () => {
            if (d.receptionComments == '') throw getLang().updateComment
          },
          ok: () => {
            d.save()
          },
          cancel: () => {},
          fields: this.receptionCommentEntry(d)
        })
    )
  }

  async ngOnInit() {
    this.checkUrlParams()
  }
  ngAfterViewInit() {}

  async checkUrlParams() {
    if (this.urlParams.has('phone')) {
      this.phone.value = this.urlParams.get('phone')
      this.search()
    }
  }

  async search() {
    try {
      this.deliveriesForPhone = (
        await FamilyDeliveriesController.getDeliveriesByPhone(this.phone.value)
      ).map((x) => x.id)
      this.showData = this.deliveriesForPhone.length > 0
    } catch (err) {}
    this.refreshFamilyGrid()
  }

  async refreshFamilyGrid() {
    this.deliveries.page = 1
    await this.deliveries.reloadData()
  }
}
