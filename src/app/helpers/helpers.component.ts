import { Component, OnInit, OnDestroy } from '@angular/core'
import { Helpers } from './helpers'
import { Route } from '@angular/router'
import { getFields, remult, repo } from 'remult'
import { DialogService, DestroyHelper } from '../select-popup/dialog'
import { DataControlInfo, GridSettings } from '../common-ui-elements/interfaces'
import { BusyService, openDialog } from '../common-ui-elements'

import { AdminGuard } from '../auth/guards'
import { Roles } from '../auth/roles'
import { ApplicationSettings } from '../manage/ApplicationSettings'

import { saveToExcel } from '../shared/saveToExcel'
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component'
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component'
import { InputAreaComponent } from '../select-popup/input-area/input-area.component'
import { use, Field, Fields } from '../translate'
import { getLang } from '../sites/sites'
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver'
import { SendBulkSms } from './send-bulk-sms'
import { HelpersController } from './helpers.controller'
import { ChangeLogComponent } from '../change-log/change-log.component'
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component'
import { DeliveryChanges } from '../families/FamilyDeliveries'

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit, OnDestroy {
  remult = remult
  constructor(
    private dialog: DialogService,
    private busy: BusyService,
    public settings: ApplicationSettings
  ) {
    this.dialog.onDistCenterChange(async () => {
      this.helpers.reloadData()
    }, this.destroyHelper)
  }
  @Fields.string()
  city: string = ''
  quickAdd() {
    const helper = repo(Helpers).create()
    helper.displayEditDialog(this.dialog, () => {
      this.helpers.addNewRowToGrid(helper)
    })
  }
  destroyHelper = new DestroyHelper()
  ngOnDestroy(): void {
    this.destroyHelper.destroy()
  }
  static route: Route = {
    path: 'helpers',
    component: HelpersComponent,
    canActivate: [AdminGuard]
  }
  clearSearch() {
    this.searchString = ''
    this.helpers.reloadData()
  }
  showDeleted = false
  searchString: string = ''
  numOfColsInGrid = 4
  helpers = new GridSettings(remult.repo(Helpers), {
    allowDelete: false,
    allowInsert: true,
    allowUpdate: true,
    knowTotalRows: true,

    rowCssClass: (h) =>
      h.archive ? 'deliveredProblem' : h.isFrozen ? 'forzen' : '',

    gridButtons: [
      {
        name: use.language.filterCity,
        click: async () => {
          let prev = this.city
          openDialog(
            InputAreaComponent,
            (x) =>
              (x.args = {
                title: use.language.filterCity,
                helpText: use.language.filterCityHelp,
                fields: [getFields<HelpersComponent>(this).city],
                ok: async () => {
                  this.helpers.reloadData()
                },
                cancel: () => {
                  this.city = ''
                  this.helpers.reloadData()
                }
              })
          )
        }
      },
      {
        name: use.language.exportToExcel,
        click: async () => {
          await saveToExcel(
            this.settings,
            remult.repo(Helpers),
            this.helpers,
            use.language.volunteer,
            this.dialog,
            (d: Helpers, c) =>
              c == d.$.id ||
              c == d.$.password ||
              c == d.$.totalKm ||
              c == d.$.totalTime ||
              c == d.$.smsDate ||
              c == d.$.reminderSmsDate ||
              c == d.$.realStoredPassword ||
              c == d.$.shortUrlKey ||
              c == d.$.admin,
            undefined,
            async (h, addColumn) => {
              addColumn(
                use.language.city,
                h.preferredDistributionAreaAddressHelper.getGeocodeInformation.getCity(),
                's'
              )
              addColumn(
                use.language.city + '2',
                h.preferredFinishAddressHelper.getGeocodeInformation.getCity(),
                's'
              )
            }
          )
        },
        visible: () => remult.isAllowed(Roles.admin)
      },

      {
        name: use.language.showDeletedHelpers,
        click: () => {
          this.showDeleted = !this.showDeleted
          this.helpers.reloadData()
        }
      },
      {
        name: use.language.clearAllVolunteerComments,
        click: async () => {
          if (
            await openDialog(
              YesNoQuestionComponent,
              (x) =>
                (x.args = {
                  question: use.language.clearAllVolunteerCommentsAreYouSure
                }),
              (x) => x.yes
            )
          ) {
            await HelpersController.clearCommentsOnServer()
            this.helpers.reloadData()
          }
        },
        visible: () =>
          this.settings.showHelperComment && remult.isAllowed(Roles.admin)
      },
      {
        name: use.language.clearEscortInfo,
        click: async () => {
          if (
            await openDialog(
              YesNoQuestionComponent,
              (x) =>
                (x.args = { question: use.language.clearEscortInfoAreYouSure }),
              (x) => x.yes
            )
          ) {
            await HelpersController.clearEscortsOnServer()
            this.helpers.reloadData()
          }
        },
        visible: () => remult.isAllowed(Roles.admin)
      },
      {
        name: use.language.sendMessageToInviteVolunteers,
        click: async () => {
          let c = new SendBulkSms()
          openDialog(
            InputAreaComponent,
            (x) =>
              (x.args = {
                title: use.language.sendMessageToInviteVolunteers,
                helpText:
                  'ניתן לסנן לפי עיר בה המתנדב חילק בעבר, ולהגביל את מספר ההודעות שישלחו כאשר אם יש הגבלה - ההודעות תשלחנה למתנדבים להם שלחנו הודעה הכי מזמן. במסך הבא ניתן לנסח את ההודעה ולשלוח, בהצלחה',
                fields: [c.$.city, c.$.limit, c.$.hours],
                ok: async () => {
                  c.sendBulkDialog(this.dialog, this.helpers.currentRow)
                },
                cancel: () => {}
              })
          )
        },
        visible: () =>
          remult.isAllowed(Roles.admin) && this.settings.bulkSmsEnabled
      }

      // , {
      //   name: 'temp',
      //   click: async () => {
      //     for (let index = 0; index < 70; index++) {
      //       await remult.repo(Helpers).create({
      //         name: 'name ' + index, phone: new Phone('05073330' + index)
      //       }).save();

      //     }
      //   }
      // }
    ],
    rowButtons: [
      {
        name: '',
        icon: 'edit',
        showInLine: true,
        textInMenu: () => use.language.volunteerInfo,
        click: async (f) => {
          f.displayEditDialog(this.dialog)
        }
      },
      {
        name: use.language.assignDeliveryMenu,
        icon: 'list_alt',
        visible: (h) => !h.isNew(),
        click: async (h) =>
          openDialog(HelperAssignmentComponent, (s) => (s.argsHelper = h))
      },
      {
        name: this.settings.lang.sendWhats,
        click: (h) => h.phone.sendWhatsapp(),
        icon: 'textsms'
      },
      {
        name: this.settings.lang.smsMessages,
        click: (h) => h.smsMessages(this.dialog)
      },
      {
        name: use.language.resetPassword,
        click: async (h) => {
          this.dialog.YesNoQuestion(
            use.language.resetPasswordAreYouSureFor + ' ' + h.name,
            async () => {
              await HelpersController.resetPassword(h.id)
              this.dialog.Info(use.language.passwordWasReset)
            }
          )
        },
        visible: (h) => remult.isAllowed(Roles.admin) || !h.admin
      },
      {
        name: use.language.invalidatePassword,
        click: async (h) => {
          this.dialog.YesNoQuestion(
            use.language.invalidatePassword + ' ' + h.name,
            async () => {
              await HelpersController.invalidatePassword(h.id)
              this.dialog.Info(use.language.passwordInvalidated)
            }
          )
        },
        visible: (h) =>
          (remult.isAllowed(Roles.admin) || !h.admin) &&
          this.settings.daysToForcePasswordChange > 0
      },
      {
        name: use.language.sendInviteBySms,
        click: async (h) => {
          let r = await HelpersController.sendInvite(h.id)
          this.dialog.Info(r)
        },
        visible: (h) => h.admin || h.distCenterAdmin
      },
      {
        name: use.language.freezeHelper,
        visible: () =>
          remult.isAllowed(Roles.admin) && this.settings.isSytemForMlt,
        click: async (h) => this.editFreezeDate(h)
      },
      {
        textInMenu: (h) =>
          h.archive ? use.language.unDeleteHelper : use.language.archiveHelper,
        visible: () => remult.isAllowed(Roles.admin),
        click: async (h) => {
          if (h.archive) await h.reactivate()
          else {
            if (
              await openDialog(
                YesNoQuestionComponent,
                (q) =>
                  (q.args = {
                    question:
                      getLang().areYouSureYouWantToDelete + ' ' + h.name + '?'
                  }),
                (q) => q.yes
              )
            ) {
              await h.deactivate()
              this.helpers.items.splice(this.helpers.items.indexOf(h), 1)
            }
          }
        }
      },
      {
        name: use.language.deliveries,
        visible: (h) => !h.isNew(),
        click: async (h) => {
          await h.showDeliveryHistory(this.dialog)
        }
      },
      new SendBulkSms().sendSingleHelperButton(this.dialog),
      {
        name: use.language.changeLog,
        visible: (h) => remult.isAllowed(Roles.admin),
        click: (h) =>
          openDialog(ChangeLogComponent, (x) => (x.args = { for: h }))
      },
      {
        name: use.language.assignHistory,
        visible: (h) => remult.repo(DeliveryChanges).metadata.apiReadAllowed,
        click: (h) =>
          openDialog(
            GridDialogComponent,
            (x) =>
              (x.args = {
                title: use.language.assignHistory + ' - ' + h.name,
                settings: new GridSettings(remult.repo(DeliveryChanges), {
                  numOfColumnsInGrid: 8,
                  columnSettings: (x) => [
                    x.deliveryName,
                    x.courier,
                    x.previousCourier,
                    x.status,
                    x.previousDeliveryStatus,
                    x.deleted,
                    x.userName,
                    x.changeDate,
                    x.appUrl,
                    x.apiUrl
                  ],
                  where: {
                    $or: [{ courier: h }, { previousCourier: h }]
                  }
                })
              })
          )
      }
    ],

    orderBy: { name: 'asc' },
    rowsInPage: 25,
    where: () => ({
      name: { $contains: this.searchString },
      archive: !this.showDeleted ? false : undefined,
      $and: [this.city && Helpers.deliveredPreviously({ city: this.city })]
    }),
    columnSettings: (helpers) => {
      this.numOfColsInGrid = 4
      if (remult.isAllowed(Roles.admin)) this.numOfColsInGrid++
      if (this.settings.isSytemForMlt) this.numOfColsInGrid += 6

      return [
        ...Helpers.selectColumns(helpers),
        helpers.preferredDistributionAreaAddressCity,
        helpers.preferredFinishAddressCity
      ]
    },
    confirmDelete: (h) => this.dialog.confirmDelete(h.name)
  })

  private freezeDateEntry(h: Helpers) {
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

  private editFreezeDate(h: Helpers) {
    openDialog(
      InputAreaComponent,
      (x) =>
        (x.args = {
          title: getLang().freezeHelper,
          ok: () => {
            h.save()
          },
          cancel: () => {},
          fields: this.freezeDateEntry(h)
        })
    )
  }

  async doSearch() {
    if (this.helpers.currentRow && this.helpers.currentRow._.wasChanged())
      return
    this.busy.donotWait(async () => await this.helpers.reloadData())
  }

  async ngOnInit() {
    let s = await ApplicationSettings.getAsync()
    this.helpers.columns.numOfColumnsInGrid = this.numOfColsInGrid
    new columnOrderAndWidthSaver(this.helpers).load('helpers')
  }
}
