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
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { visitAll } from '@angular/compiler';
import { use, getLang, TranslationOptions } from '../translate';

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

    this.editHelper(this.helpers.currentRow);

  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }
  static route: Route = {
    path: 'helpers',
    component: HelpersComponent,
    canActivate: [distCenterAdminGuard]
  };
  clearSearch() {
    this.searchString = '';
    this.helpers.getRecords();
  }
  searchString: string = '';
  numOfColsInGrid = 4;
  helpers = this.context.for(Helpers).gridSettings({
    showFilter:true,
    allowDelete: false,
    allowInsert: true,
    allowUpdate: true,
    knowTotalRows: true,
    
    gridButtons: [
      {
        name: use.language.exportToExcel,
        click: async () => {
          await saveToExcel(this.context.for(Helpers), this.helpers, use.language.volunteer, this.busy, (d: Helpers, c) => c == d.id || c == d.password || c == d.totalKm || c == d.totalTime || c == d.smsDate || c == d.reminderSmsDate || c == d.realStoredPassword || c == d.shortUrlKey || c == d.admin);
        }
        , visible: () => this.context.isAllowed(Roles.admin)
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
          this.editHelper(f);
        }
      },
      {
        name: use.language.assignDeliveryMenu,
        icon:'list_alt',
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
        name: use.language.sendInviteBySms,
        click: async h => {
          let r = await HelpersComponent.sendInvite(h.id.value);
          this.dialog.Info(r);
        },
        visible: h => h.admin.value || h.distCenterAdmin.value
      }
      ,
      {
        name: use.language.deliveries,
        visible: h => !h.isNew(),
        click: async h => {
          this.context.openDialog(GridDialogComponent, x => x.args = {
            title: use.language.deliveriesFor + ' ' + h.name.value,
            settings: this.context.for(FamilyDeliveries).gridSettings({
              numOfColumnsInGrid: 6,
              knowTotalRows: true,
              rowCssClass: fd => fd.deliverStatus.getCss(),
              columnSettings: fd => {
                let r: Column[] = [
                  fd.deliverStatus,
                  fd.deliveryStatusDate,
                  fd.basketType,
                  fd.quantity,
                  fd.name,
                  fd.address,
                  fd.distributionCenter,
                  fd.courierComments
                ]
                r.push(...fd.columns.toArray().filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.defs.caption.localeCompare(b.defs.caption)));
                return r;
              },
              get: {
                where: fd => fd.courier.isEqualTo(h.id),
                orderBy: fd => [{ column: fd.deliveryStatusDate, descending: true }],
                limit: 25
              }
            })
          });
        }
      }

    ],

    get: {
      orderBy: h => [h.name],
      limit: 25,
      where: h => {
        return h.name.isContains(this.searchString);
      }
    },
    columnSettings: helpers => {
      this.numOfColsInGrid = 4;
      if (this.context.isAllowed(Roles.admin))
        this.numOfColsInGrid++;
      if (this.settings.forWho.value == TranslationOptions.donors)
        this.numOfColsInGrid+=4;

      return this.selectColumns(helpers);
    },
    confirmDelete: (h) => this.dialog.confirmDelete(h.name.value),


  });

  private editHelper(f: Helpers) {
    this.context.openDialog(InputAreaComponent, x => x.args = {
      title: f.isNew() ? use.language.newVolunteers : f.name.value,
      ok: () => {
        f.save();
      },
      cancel: () => {
      },
      settings: {
        columnSettings: () => this.selectColumns(f)
      }
    });
  }

  private selectColumns(helpers: Helpers) {
    let r: DataControlInfo<Helpers>[] = [
      {
        column: helpers.name,
        width: '150'
      },
      {
        column: helpers.phone,
        width: '150'
      },
    ];
    r.push({
      column: helpers.eventComment,
      width: '120'
    });
    if (this.context.isAllowed(Roles.admin)) {
      r.push({
        column: helpers.admin,
        width: '160'
      });

    }
    if (this.context.isAllowed(Roles.distCenterAdmin)) {
      r.push({
        column: helpers.distCenterAdmin, width: '160'
      });
    }
    if (this.context.isAllowed(Roles.lab)) {
      r.push({
        column:helpers.lab,width:'120'
      });
      r.push({
        column:helpers.distributionCenter, width: '150', 
      });
    }
    r.push({
      column: helpers.preferredDistributionAreaAddress, width: '120',
    });
    r.push({
      column: helpers.preferredDistributionAreaAddress2, width: '120',
    });
    r.push({
      column: helpers.company, width: '120'
    });

    r.push(helpers.createDate);

    if (this.context.isAllowed(Roles.admin)) {
      r.push(helpers.distributionCenter);
    }
    r.push(helpers.email);
    if (this.settings.manageEscorts.value) {
      r.push(helpers.escort, helpers.theHelperIAmEscorting, helpers.needEscort);
    }

    r.push({
      column: helpers.socialSecurityNumber, width: '80'
    });

    return r;
  }

  async doSearch() {
    if (this.helpers.currentRow && this.helpers.currentRow.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.helpers.getRecords());
  }





  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async resetPassword(helperId: string, context?: Context) {

    await context.for(Helpers).iterate(h => h.id.isEqualTo(helperId)).forEach( async h => {
      h.realStoredPassword.value = '';
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
    for await  (const h of context.for(Helpers).iterate({ where: h => h.eventComment.isDifferentFrom('') })) {
      h.eventComment.value = '';
      await h.save();
    }
  }

  @ServerFunction({ allowed: Roles.admin })
  static async clearEscortsOnServer(context?: Context) {
    for await  (const h of context.for(Helpers).iterate()) {
      h.escort.value = '';
      h.needEscort.value = false;
      h.theHelperIAmEscorting.value = '';
      await h.save();
    }
  }

}
