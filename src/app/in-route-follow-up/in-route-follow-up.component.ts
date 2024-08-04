import { Component, OnInit } from '@angular/core'
import { DataControlInfo, GridSettings } from '../common-ui-elements/interfaces'
import { BusyService, openDialog } from '../common-ui-elements'
import { EntityFilter, Filter, remult } from 'remult'
import { InRouteHelpers } from './in-route-helpers'

import { use } from '../translate'
import { Helpers } from '../helpers/helpers'
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'

import { InputAreaComponent } from '../select-popup/input-area/input-area.component'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { saveToExcel } from '../shared/saveToExcel'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { DialogService } from '../select-popup/dialog'
import { Roles } from '../auth/roles'

@Component({
  selector: 'app-in-route-follow-up',
  templateUrl: './in-route-follow-up.component.html',
  styleUrls: ['./in-route-follow-up.component.scss']
})
export class InRouteFollowUpComponent implements OnInit {
  constructor(
    public settings: ApplicationSettings,
    private busy: BusyService,
    private dialog: DialogService
  ) {}

  searchString: string = ''
  clearSearch() {
    this.searchString = ''
    this.helpers.reloadData()
  }

  helpers = new GridSettings(remult.repo(InRouteHelpers), {
    where: () => ({
      name: { $contains: this.searchString },
      $and: [this.currentOption.where]
    }),
    rowsInPage: 25,
    knowTotalRows: true,
    numOfColumnsInGrid: 99,
    gridButtons: [
      {
        name: use.language.exportToExcel,
        click: () =>
          saveToExcel(
            this.settings,
            remult.repo(InRouteHelpers),
            this.helpers,
            'מתנדבים בדרך',
            this.dialog
          )
      }
    ],
    rowCssClass: (x) => {
      if (
        !x.seenFirstAssign &&
        (!x.lastCommunicationDate || x.lastCommunicationDate < daysAgo(3))
      )
        return 'communicationProblem'
      else if (
        x.minAssignDate < daysAgo(5) &&
        (!x.lastCommunicationDate || x.lastCommunicationDate < daysAgo(5))
      )
        return 'addressProblem'
      else return ''
    },
    rowButtons: [
      {
        textInMenu: () => use.language.assignDeliveryMenu,
        icon: 'list_alt',
        showInLine: true,
        visible: (h) => !h.isNew(),
        click: async (s) => {
          s.showAssignment(this.dialog)
        }
      },
      {
        name: use.language.ActiveDeliveries,
        visible: (h) => !h.isNew(),
        click: async (h) => {
          let helper = await h.helper()
          openDialog(
            GridDialogComponent,
            (x) =>
              (x.args = {
                title: use.language.deliveriesFor + ' ' + h.name,
                buttons: [
                  {
                    text: 'תכתובות',
                    click: () => h.showHistory(this.dialog)
                  },
                  {
                    text: 'שיוך משלוחים',
                    click: () => h.showAssignment(this.dialog)
                  }
                ],
                settings: new GridSettings(
                  remult.repo(ActiveFamilyDeliveries),
                  {
                    numOfColumnsInGrid: 7,
                    knowTotalRows: true,
                    rowCssClass: (fd) => fd.getCss(),

                    columnSettings: (fd) => {
                      let r: DataControlInfo<ActiveFamilyDeliveries>[] = [
                        fd.name,
                        fd.address,
                        { field: fd.internalDeliveryComment, width: '400' },

                        fd.courierAssingTime,
                        fd.deliverStatus,
                        fd.deliveryStatusDate,
                        fd.basketType,
                        fd.quantity,
                        fd.distributionCenter,
                        fd.courierComments,
                        { field: fd.courierComments, width: '400' }
                      ]
                      r.push(
                        ...[...fd]
                          .filter(
                            (c) =>
                              !r.includes(c) &&
                              c != fd.id &&
                              c != fd.familySource
                          )
                          .sort((a, b) => a.caption.localeCompare(b.caption))
                      )
                      return r
                    },

                    where: {
                      courier: helper,
                      deliverStatus: [
                        DeliveryStatus.ReadyForDelivery,
                        DeliveryStatus.DriverPickedUp
                      ]
                    },
                    orderBy: { deliveryStatusDate: 'desc' },
                    rowsInPage: 25
                  }
                )
              })
          )
        }
      },
      {
        name: 'תכתובות',
        click: async (h) => {
          h.showHistory(this.dialog)
        }
      },
      {
        name: 'הוסף תכתובת',
        click: async (s) => {
          s.addCommunication(this.dialog, () => {})
        }
      },
      {
        name: use.language.volunteerInfo,
        click: async (s) => {
          let h = await remult.repo(Helpers).findId(s.id)
          h.displayEditDialog(this.dialog)
        }
      },
      {
        name: use.language.freezeHelper,
        visible: () =>
          remult.isAllowed(Roles.admin) && this.settings.isSytemForMlt,
        click: async (h) => this.editFreezeDate(h)
      }
    ]
  })

  ngOnInit() {}

  radioOption: FilterFactory[] = [
    {
      text: 'כולם',
      where: undefined
    },
    {
      text: 'לא ראו אף שיוך',
      where: { seenFirstAssign: false, minAssignDate: { '<=': daysAgo(2) } }
    },
    {
      text: 'שיוך ראשון לפני יותר מ 5 ימים',
      where: { minAssignDate: { '<=': daysAgo(5) } }
    }
  ]
  currentOption = this.radioOption[0]

  async doSearch() {
    if (this.helpers.currentRow && this.helpers.currentRow._.wasChanged())
      return
    this.busy.donotWait(async () => await this.helpers.reloadData())
  }

  private freezeDateEntry(h: InRouteHelpers) {
    let r: DataControlInfo<Helpers>[] = [
      {
        field: h.$.frozenTill,
        width: '150'
      },
      {
        field: h.$.internalComment,
        width: '150'
      }
    ]
    return r
  }

  async editFreezeDate(h: InRouteHelpers) {
    openDialog(
      InputAreaComponent,
      (x) =>
        (x.args = {
          title: use.language.freezeHelper,
          ok: async () => {
            let helper = await remult.repo(Helpers).findId(h.id)
            helper.frozenTill = h.frozenTill
            helper.internalComment = h.internalComment
            await helper.save()
            this.helpers.reloadData()
          },
          cancel: () => {},
          fields: this.freezeDateEntry(h)
        })
    )
  }
}

interface FilterFactory {
  text: string
  where: EntityFilter<InRouteHelpers>
}
function daysAgo(num: number) {
  let d = new Date()
  d.setDate(d.getDate() - num)
  return d
}
