import { Component, OnInit, OnDestroy } from '@angular/core';


import { Helpers } from './helpers';


import { Route } from '@angular/router';

import { ServerFunction, DataControlSettings, DataControlInfo, ServerContext, AndFilter, Column } from '@remult/core';
import { Context } from '@remult/core';
import { DialogService, DestroyHelper } from '../select-popup/dialog';
import { BusyService } from '@remult/core';
import { DateColumn, DataAreaSettings } from '@remult/core';
import { Roles, AdminGuard, distCenterAdminGuard } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { saveToExcel } from '../shared/saveToExcel';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { Sites } from '../sites/sites';
import { SendSmsAction, SendSmsUtils } from '../asign-family/send-sms-action';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { visitAll } from '@angular/compiler';
import { use, TranslationOptions } from '../translate';
import { getLang } from '../sites/sites';
import { FamilyDeliveresStatistics } from '../family-deliveries/family-deliveries-stats';
import { Families } from '../families/families';

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit, OnDestroy {
  constructor(private dialog: DialogService, public context: Context, private busy: BusyService, public settings: ApplicationSettings) {
    this.dialog.onDistCenterChange(async () => {
      this.helpers.getRecords();
    }, this.destroyHelper);
  }
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
    this.helpers.getRecords();
  }
  showDeleted = false;
  searchString: string = '';
  numOfColsInGrid = 4;
  helpers = this.context.for(Helpers).gridSettings({
    showFilter: true,
    allowDelete: false,
    allowInsert: true,
    allowUpdate: true,
    knowTotalRows: true,

    rowCssClass: h => (h.archive.value ? 'deliveredProblem' : h.isFrozen.value ? 'forzen' : ''),

    gridButtons: [
      {
        name: use.language.exportToExcel,
        click: async () => {
          await saveToExcel(this.settings, this.context.for(Helpers), this.helpers, use.language.volunteer, this.busy, (d: Helpers, c) => c == d.id || c == d.password || c == d.totalKm || c == d.totalTime || c == d.smsDate || c == d.reminderSmsDate || c == d.realStoredPassword || c == d.shortUrlKey || c == d.admin, undefined,
            async (h, addColumn) => {
              addColumn(use.language.city, h.preferredDistributionAreaAddress.getGeocodeInformation().getCity(), 's');
              addColumn(use.language.city + "2", h.preferredFinishAddress.getGeocodeInformation().getCity(), 's');

            });
        }
        , visible: () => this.context.isAllowed(Roles.admin)
      },
      {
        name: use.language.showDeletedHelpers,
        click: () => {
          this.showDeleted = !this.showDeleted;
          this.helpers.getRecords();
        }
      },
      {
        name: use.language.clearAllVolunteerComments,
        click: async () => {
          if (await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: use.language.clearAllVolunteerCommentsAreYouSure }, x => x.yes)) {
            await HelpersComponent.clearCommentsOnServer();
            this.helpers.getRecords();
          }
        },
        visible: () => this.settings.showHelperComment.value && this.context.isAllowed(Roles.admin)

      },
      {
        name: use.language.clearEscortInfo,
        click: async () => {
          if (await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: use.language.clearEscortInfoAreYouSure }, x => x.yes)) {
            await HelpersComponent.clearEscortsOnServer();
            this.helpers.getRecords();
          }
        },
        visible: () => this.context.isAllowed(Roles.admin)
      }

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
          this.context.openDialog(
            HelperAssignmentComponent, s => s.argsHelper = h)

      },
      {
        name: use.language.resetPassword,
        click: async h => {
          this.dialog.YesNoQuestion(use.language.resetPasswordAreYouSureFor + " " + h.name.value, async () => {
            await HelpersComponent.resetPassword(h.id.value);
            this.dialog.Info(use.language.passwordWasReset);
          });
        },
        visible: h => (this.context.isAllowed(Roles.admin) || !h.admin.value)
      },
      {
        name: use.language.invalidatePassword,
        click: async h => {
          this.dialog.YesNoQuestion(use.language.invalidatePassword + " " + h.name.value, async () => {
            await HelpersComponent.invalidatePassword(h.id.value);
            this.dialog.Info(use.language.passwordInvalidated);
          });
        },
        visible: h => ((this.context.isAllowed(Roles.admin) || !h.admin.value) && this.settings.daysToForcePasswordChange.value > 0)
      },
      {
        name: use.language.sendInviteBySms,
        click: async h => {
          let r = await HelpersComponent.sendInvite(h.id.value);
          this.dialog.Info(r);
        },
        visible: h => h.admin.value || h.distCenterAdmin.value
      },
      {
        name: use.language.freezeHelper,
        visible: () => this.context.isAllowed(Roles.admin)&&this.settings.isSytemForMlt(),
        click: async h => this.editFreezeDate(h)
      },
      {
        textInMenu: h => h.archive.value ? use.language.unDeleteHelper : use.language.archiveHelper,
        visible: () => this.context.isAllowed(Roles.admin),
        click: async h => {
          if (h.archive.value)
            await h.reactivate();
          else {
            if (await this.context.openDialog(YesNoQuestionComponent, q => q.args = {
              question: getLang(this.context).areYouSureYouWantToDelete + ' ' + h.name.value + '?'
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
      }
    ],

    get: {
      orderBy: h => [h.name],
      limit: 25,
      where: h => {
        let r = h.name.isContains(this.searchString);
        if (this.showDeleted)
          return r;
        else return r.and(h.archive.isEqualTo(false));
      }
    },
    columnSettings: helpers => {
      this.numOfColsInGrid = 4;
      if (this.context.isAllowed(Roles.admin))
        this.numOfColsInGrid++;
      if (this.settings.isSytemForMlt())
        this.numOfColsInGrid += 6;

      return helpers.selectColumns();
    },
    confirmDelete: (h) => this.dialog.confirmDelete(h.name.value),


  });

  private freezeDateEntry(h: Helpers) {
    let r: DataControlInfo<Helpers>[] = [
      {
        column: h.frozenTill,
        width: '150'
      },
      {
        column: h.internalComment,
        width: '150'
      },
    ];
    return r;
  }

  private editFreezeDate(h: Helpers) {
    this.context.openDialog(InputAreaComponent, x => x.args = {
      title: getLang(this.context).freezeHelper,
      ok: () => {
        h.save();
      },
      cancel: () => {
      },
      settings: {
        columnSettings: () => this.freezeDateEntry(h)
      }
    });
  }




  async doSearch() {
    if (this.helpers.currentRow && this.helpers.currentRow.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.helpers.getRecords());
  }





  @ServerFunction({ allowed: Roles.admin })
  static async resetPassword(helperId: string, context?: Context) {

    await context.for(Helpers).iterate(h => h.id.isEqualTo(helperId)).forEach(async h => {
      h.realStoredPassword.value = '';
      await h.save();
    });
  }
  @ServerFunction({ allowed: Roles.admin })
  static async invalidatePassword(helperId: string, context?: Context) {

    await context.for(Helpers).iterate(h => h.id.isEqualTo(helperId)).forEach(async h => {
      h.passwordChangeDate.value = new Date(1901, 1, 1);
      await h.save();
    });
  }

  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async sendInvite(helperId: string, context?: ServerContext) {
    let h = await context.for(Helpers).findFirst(x => x.id.isEqualTo(helperId));
    if (!h)
      return getLang(context).unfitForInvite;
    if (!(h.admin.value || h.distCenterAdmin.value))
      return getLang(context).unfitForInvite;
    let url = context.getOrigin() + '/' + Sites.getOrganizationFromContext(context);
    let s = await ApplicationSettings.getAsync(context);
    let hasPassword = h.password.value && h.password.value.length > 0;
    let message = getLang(context).hello + ` ${h.name.value}
`+ getLang(context).welcomeTo + ` ${s.organisationName.value}.
`+ getLang(context).pleaseEnterUsing + `
${url}
`;
    if (!hasPassword) {
      message += getLang(context).enterFirstTime
    }
    let from = await context.for(Helpers).findFirst(h => h.id.isEqualTo(context.user.id));
    await new SendSmsUtils().sendSms(h.phone.value, from.phone.value, message, context.getOrigin(), Sites.getOrganizationFromContext(context), await ApplicationSettings.getAsync(context));
    return getLang(context).inviteSentSuccesfully





  }



  async ngOnInit() {
    let s = await ApplicationSettings.getAsync(this.context);
    this.helpers.columns.numOfColumnsInGrid = this.numOfColsInGrid;



  }
  fromDate = new DateColumn({
    caption: use.language.fromDate,
    valueChange: () => {

      if (this.toDate.value < this.fromDate.value) {
        //this.toDate.value = this.getEndOfMonth();
      }

    }
  });
  toDate = new DateColumn(use.language.toDate);
  rangeArea = new DataAreaSettings({
    columnSettings: () => [this.fromDate, this.toDate],
    numberOfColumnAreas: 2
  });

  @ServerFunction({ allowed: Roles.admin })
  static async clearCommentsOnServer(context?: Context) {
    for await (const h of context.for(Helpers).iterate({ where: h => h.eventComment.isDifferentFrom('') })) {
      h.eventComment.value = '';
      await h.save();
    }
  }

  @ServerFunction({ allowed: Roles.admin })
  static async clearEscortsOnServer(context?: Context) {
    for await (const h of context.for(Helpers).iterate()) {
      h.escort.value = '';
      h.needEscort.value = false;
      h.theHelperIAmEscorting.value = '';
      await h.save();
    }
  }

}
