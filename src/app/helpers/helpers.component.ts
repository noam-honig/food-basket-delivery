import { Component, OnInit, OnDestroy } from '@angular/core';
import { Helpers } from './helpers';
import { Route } from '@angular/router';
import { BackendMethod, Field, getFields } from 'remult';
import { Remult } from 'remult';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { BusyService, DataControlInfo, GridSettings, openDialog } from '@remult/angular';

import { Roles, AdminGuard, distCenterAdminGuard } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { saveToExcel } from '../shared/saveToExcel';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { Sites } from '../sites/sites';
import { SendSmsAction, SendSmsUtils } from '../asign-family/send-sms-action';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { use, TranslationOptions } from '../translate';
import { getLang } from '../sites/sites';
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver';
import { Phone } from '../model-shared/phone';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { HelperCommunicationHistory } from '../in-route-follow-up/in-route-helpers';
import { SendBulkSms } from './send-bulk-sms';
import { EditCustomMessageComponent, messageMerger } from '../edit-custom-message/edit-custom-message.component';

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit, OnDestroy {
  constructor(private dialog: DialogService, public remult: Remult, private busy: BusyService, public settings: ApplicationSettings) {
    this.dialog.onDistCenterChange(async () => {
      this.helpers.reloadData();
    }, this.destroyHelper);
  }
  @Field()
  city: string = '';
  quickAdd() {
    this.helpers.addNewRow();

    this.helpers.currentRow.displayEditDialog(this.dialog, this.busy);

  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }
  static route: Route = {
    path: 'helpers',
    component: HelpersComponent,
    canActivate: [AdminGuard]
  };
  clearSearch() {
    this.searchString = '';
    this.helpers.reloadData();
  }
  showDeleted = false;
  searchString: string = '';
  numOfColsInGrid = 4;
  helpers = new GridSettings(this.remult.repo(Helpers), {
    allowDelete: false,
    allowInsert: true,
    allowUpdate: true,
    knowTotalRows: true,

    rowCssClass: h => (h.archive ? 'deliveredProblem' : h.isFrozen ? 'forzen' : ''),

    gridButtons: [{
      name: use.language.filterCity,
      click: async () => {
        let prev = this.city;
        openDialog(InputAreaComponent, x => x.args = {
          title: use.language.filterCity,
          helpText: use.language.filterCityHelp,
          settings: {
            fields: () => [getFields(this).city]
          },
          ok: async () => {
            this.helpers.reloadData();
          },
          cancel: () => {
            this.city = '';
            this.helpers.reloadData();
          }

        });
      }
    },
    {
      name: use.language.exportToExcel,
      click: async () => {
        await saveToExcel(this.settings, this.remult.repo(Helpers), this.helpers, use.language.volunteer, this.busy, (d: Helpers, c) => c == d.$.id || c == d.$.password || c == d.$.totalKm || c == d.$.totalTime || c == d.$.smsDate || c == d.$.reminderSmsDate || c == d.$.realStoredPassword || c == d.$.shortUrlKey || c == d.$.admin, undefined,
          async (h, addColumn) => {
            addColumn(use.language.city, h.preferredDistributionAreaAddressHelper.getGeocodeInformation.getCity(), 's');
            addColumn(use.language.city + "2", h.preferredFinishAddressHelper.getGeocodeInformation.getCity(), 's');

          });
      }
      , visible: () => this.remult.isAllowed(Roles.admin)
    },

    {
      name: use.language.showDeletedHelpers,
      click: () => {
        this.showDeleted = !this.showDeleted;
        this.helpers.reloadData();
      }
    },
    {
      name: use.language.clearAllVolunteerComments,
      click: async () => {
        if (await openDialog(YesNoQuestionComponent, x => x.args = { question: use.language.clearAllVolunteerCommentsAreYouSure }, x => x.yes)) {
          await HelpersComponent.clearCommentsOnServer();
          this.helpers.reloadData();
        }
      },
      visible: () => this.settings.showHelperComment && this.remult.isAllowed(Roles.admin)

    },
    {
      name: use.language.clearEscortInfo,
      click: async () => {
        if (await openDialog(YesNoQuestionComponent, x => x.args = { question: use.language.clearEscortInfoAreYouSure }, x => x.yes)) {
          await HelpersComponent.clearEscortsOnServer();
          this.helpers.reloadData();
        }
      },
      visible: () => this.remult.isAllowed(Roles.admin)
    },
    {
      name: use.language.sendMessageToInviteVolunteers,
      click: async () => {
        let c = new SendBulkSms(this.remult);
        openDialog(InputAreaComponent, x => x.args = {
          title: use.language.sendMessageToInviteVolunteers,
          helpText: "ניתן לסנן לפי עיר בה המתנדב חילק בעבר, ולהגביל את מספר ההודעות שישלחו כאשר אם יש הגבלה - ההודעות תשלחנה למתנדבים להם שלחנו הודעה הכי מזמן. במסך הבא ניתן לנסח את ההודעה ולשלוח, בהצלחה",
          settings: {
            fields: () => [c.$.city, c.$.limit]
          },
          ok: async () => {
            c.sendBulkDialog(this.dialog, this.helpers.currentRow);
          },
          cancel: () => { }
        });
      },
      visible: () => this.remult.isAllowed(Roles.admin) && this.settings.bulkSmsEnabled
    }

      // , {
      //   name: 'temp',
      //   click: async () => {
      //     for (let index = 0; index < 70; index++) {
      //       await this.remult.repo(Helpers).create({
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
        click: async f => {
          f.displayEditDialog(this.dialog, this.busy);
        }
      },
      {
        name: use.language.assignDeliveryMenu,
        icon: 'list_alt',
        visible: h => !h.isNew(),
        click: async h =>
          openDialog(
            HelperAssignmentComponent, s => s.argsHelper = h)

      },
      {
        name: this.settings.lang.sendWhats,
        click: h => h.phone.sendWhatsapp(this.remult),

        icon: 'textsms'
      },
      {
        name: use.language.resetPassword,
        click: async h => {
          this.dialog.YesNoQuestion(use.language.resetPasswordAreYouSureFor + " " + h.name, async () => {
            await HelpersComponent.resetPassword(h.id);
            this.dialog.Info(use.language.passwordWasReset);
          });
        },
        visible: h => (this.remult.isAllowed(Roles.admin) || !h.admin)
      },
      {
        name: use.language.invalidatePassword,
        click: async h => {
          this.dialog.YesNoQuestion(use.language.invalidatePassword + " " + h.name, async () => {
            await HelpersComponent.invalidatePassword(h.id);
            this.dialog.Info(use.language.passwordInvalidated);
          });
        },
        visible: h => ((this.remult.isAllowed(Roles.admin) || !h.admin) && this.settings.daysToForcePasswordChange > 0)
      },
      {
        name: use.language.sendInviteBySms,
        click: async h => {
          let r = await HelpersComponent.sendInvite(h.id);
          this.dialog.Info(r);
        },
        visible: h => h.admin || h.distCenterAdmin
      },
      {
        name: use.language.freezeHelper,
        visible: () => this.remult.isAllowed(Roles.admin) && this.settings.isSytemForMlt,
        click: async h => this.editFreezeDate(h)
      },
      {
        textInMenu: h => h.archive ? use.language.unDeleteHelper : use.language.archiveHelper,
        visible: () => this.remult.isAllowed(Roles.admin),
        click: async h => {
          if (h.archive)
            await h.reactivate();
          else {
            if (await openDialog(YesNoQuestionComponent, q => q.args = {
              question: getLang(this.remult).areYouSureYouWantToDelete + ' ' + h.name + '?'
            }, q => q.yes)) {
              await h.deactivate();
              this.helpers.items.splice(this.helpers.items.indexOf(h), 1);
            }
          }
        }
      },
      {
        name: use.language.deliveries,
        visible: h => !h.isNew(),
        click: async h => {
          await h.showDeliveryHistory(this.dialog, this.busy);
        }
      },
      new SendBulkSms(this.remult).sendSingleHelperButton(this.dialog)
    ],


    orderBy: { name: "asc" },
    rowsInPage: 25,
    where: () => ({
      name: { $contains: this.searchString },
      archive: !this.showDeleted ? false : undefined,
      $and: [this.city && Helpers.deliveredPreviously({ city: this.city })]
    })
    ,
    columnSettings: helpers => {
      this.numOfColsInGrid = 4;
      if (this.remult.isAllowed(Roles.admin))
        this.numOfColsInGrid++;
      if (this.settings.isSytemForMlt)
        this.numOfColsInGrid += 6;

      return Helpers.selectColumns(helpers, this.remult);
    },
    confirmDelete: (h) => this.dialog.confirmDelete(h.name),


  });



  private freezeDateEntry(h: Helpers) {
    let r: DataControlInfo<Helpers>[] = [
      {
        field: h.$.frozenTill,
        width: '150'
      },
      {
        field: h.$.internalComment,
        width: '150'
      },
    ];
    return r;
  }

  private editFreezeDate(h: Helpers) {
    openDialog(InputAreaComponent, x => x.args = {
      title: getLang(this.remult).freezeHelper,
      ok: () => {
        h.save();
      },
      cancel: () => {
      },
      settings: {
        fields: () => this.freezeDateEntry(h)
      }
    });
  }




  async doSearch() {
    if (this.helpers.currentRow && this.helpers.currentRow._.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.helpers.reloadData());
  }





  @BackendMethod({ allowed: Roles.admin })
  static async resetPassword(helperId: string, remult?: Remult) {

    await remult.repo(Helpers).query({ where: { id: helperId } }).forEach(async h => {
      h.realStoredPassword = '';
      await h.save();
    });
  }
  @BackendMethod({ allowed: Roles.admin })
  static async invalidatePassword(helperId: string, remult?: Remult) {

    await remult.repo(Helpers).query({ where: { id: helperId } }).forEach(async h => {
      h.passwordChangeDate = new Date(1901, 1, 1);
      await h.save();
    });
  }

  @BackendMethod({ allowed: Roles.distCenterAdmin })
  static async sendInvite(helperId: string, remult?: Remult) {
    let h = await remult.repo(Helpers).findId(helperId);
    if (!h)
      return getLang(remult).unfitForInvite;
    if (!(h.admin || h.distCenterAdmin))
      return getLang(remult).unfitForInvite;
    let url = remult.getOrigin() + '/' + Sites.getOrganizationFromContext(remult);
    let s = await ApplicationSettings.getAsync(remult);
    let hasPassword = h.password && h.password.length > 0;
    let message = getLang(remult).hello + ` ${h.name}
`+ getLang(remult).welcomeTo + ` ${s.organisationName}.
`+ getLang(remult).pleaseEnterUsing + `
${url}
`;
    if (!hasPassword) {
      message += getLang(remult).enterFirstTime
    }
    await new SendSmsUtils().sendSms(h.phone.thePhone, message, remult, h);
    return getLang(remult).inviteSentSuccesfully





  }



  async ngOnInit() {
    let s = await ApplicationSettings.getAsync(this.remult);
    this.helpers.columns.numOfColumnsInGrid = this.numOfColsInGrid;
    new columnOrderAndWidthSaver(this.helpers).load('helpers');



  }



  @BackendMethod({ allowed: Roles.admin })
  static async clearCommentsOnServer(remult?: Remult) {
    for await (const h of remult.repo(Helpers).query({ where: { eventComment: { "!=": "" } } })) {
      h.eventComment = '';
      await h.save();
    }
  }

  @BackendMethod({ allowed: Roles.admin })
  static async clearEscortsOnServer(remult?: Remult) {
    for await (const h of remult.repo(Helpers).query()) {
      h.escort = null;
      h.needEscort = false;
      h.theHelperIAmEscorting = null;
      await h.save();
    }
  }

}
