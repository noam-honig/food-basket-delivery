import { Component, OnInit } from '@angular/core';


import { Helpers } from './helpers';


import { Route } from '@angular/router';

import { ServerFunction, DataControlSettings, DataControlInfo, ServerContext, AndFilter, Column } from '@remult/core';
import { Context } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
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

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit {
  constructor(private dialog: DialogService, public context: Context, private busy: BusyService, public settings: ApplicationSettings) {

  }
  quickAdd() {
    this.helpers.addNewRow();

    this.editHelper(this.helpers.currentRow);
  }
  static route: Route = {
    path: 'helpers',
    component: HelpersComponent,
    data: { name: 'מתנדבים' }, canActivate: [distCenterAdminGuard]
  };
  clearSearch() {
    this.searchString = '';
    this.helpers.getRecords();
  }
  searchString: string = '';
  numOfColsInGrid = 4;
  helpers = this.context.for(Helpers).gridSettings({
    allowDelete: false,
    allowInsert: true,
    allowUpdate: true,
    knowTotalRows: true,
    hideDataArea: true,
    gridButton: [
      {
        name: 'יצוא לאקסל',
        click: async () => {
          await saveToExcel(this.context.for(Helpers), this.helpers, "מתנדבים", this.busy, (d: Helpers, c) => c == d.id || c == d.password || c == d.totalKm || c == d.totalTime || c == d.smsDate || c == d.reminderSmsDate || c == d.realStoredPassword || c == d.shortUrlKey || c == d.admin);
        }
      },
      {
        name: 'נקה הערות לכל המתנדבים',
        click: async () => {
          if (await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: 'האם אתה בטוח שברצונך לנקות את כל ההערות למתנדבים?' }, x => x.yes)) {
            await HelpersComponent.clearCommentsOnServer();
            this.helpers.getRecords();
          }
        },
        visible: () => this.settings.showHelperComment.value
      },
      {
        name: 'נקה נתוני ליווי לכל המתנדבים',
        click: async () => {
          if (await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: 'האם אתה בטוח שברצונך לנקות את נתוני המלווים לכל המתנדבים?' }, x => x.yes)) {
            await HelpersComponent.clearEscortsOnServer();
            this.helpers.getRecords();
          }
        },
        visible: () => this.settings.showHelperComment.value
      }

    ],
    rowButtons: [
      {
        name: '',
        icon: 'edit',
        showInLine: true,
        textInMenu: () => 'כרטיס מתנדב',
        click: async f => {
          this.editHelper(f);
        }
      },
      {
        name: 'שיוך משפחות',
        visible: h => !h.isNew(),
        click: async h =>
          this.context.openDialog(
            HelperAssignmentComponent, s => s.argsHelper = h)

      },
      {
        name: 'אתחל סיסמה',
        click: async h => {
          this.dialog.YesNoQuestion("האם את בטוחה שאת רוצה למחוק את הסיסמה של " + h.name.value, async () => {
            await HelpersComponent.resetPassword(h.id.value);
            this.dialog.Info("הסיסמה נמחקה");
          });
        }
      },
      {
        name: 'שלח הזמנה בSMS למנהל',
        click: async h => {
          let r = await HelpersComponent.sendInvite(h.id.value);
          this.dialog.Info(r);
        },
        visible: h => h.admin.value || h.distCenterAdmin.value
      }
      ,
      {
        name: 'היסטורית משלוחים',
        visible: h => !h.isNew(),
        click: async h => {
          this.context.openDialog(GridDialogComponent, x => x.args = {
            title: 'משלוחים עבור ' + h.name.value,
            settings: this.context.for(FamilyDeliveries).gridSettings({
              numOfColumnsInGrid: 6,
              hideDataArea: true,
              knowTotalRows: true,
              rowCssClass: fd => fd.deliverStatus.getCss(),
              columnSettings: fd => {
                let r: Column<any>[] = [
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
      return this.selectColumns(helpers);
    },
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes),


  });

  private editHelper(f: Helpers) {
    this.context.openDialog(InputAreaComponent, x => x.args = {
      title: f.isNew() ? 'הוסף מתנדב' : 'עדכן פרטי ' + f.name.value,
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
    if (this.context.isAllowed(Roles.admin)) {
      r.push(helpers.distributionCenter);
    }

    if (this.settings.manageEscorts.value)
      r.push(helpers.company);
    if (this.settings.manageEscorts.value) {
      r.push(helpers.escort, helpers.theHelperIAmEscorting, helpers.needEscort);
    }
    r.push(helpers.createDate);
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

    await context.for(Helpers).foreach(h => h.id.isEqualTo(helperId), async h => {
      h.realStoredPassword.value = '';
      await h.save();
    });
  }

  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async sendInvite(helperId: string, context?: ServerContext) {
    let h = await context.for(Helpers).findFirst(x => x.id.isEqualTo(helperId));
    if (!h)
      return 'לא מתאים להזמנה';
    if (!(h.admin.value || h.distCenterAdmin.value))
      return 'לא מתאים להזמנה';
    let url = context.getOrigin() + '/' + Sites.getOrganizationFromContext(context);
    let s = await ApplicationSettings.getAsync(context);
    let hasPassword = h.password.value && h.password.value.length > 0;
    let message = `שלום ${h.name.value}
ברוך הבא לסביבה של ${s.organisationName.value}.
אנא הכנס למערכת באמצעות הקישור:
${url}
`;
    if (!hasPassword) {
      message += `מכיוון שלא מוגדרת לך סיסמה עדיין - אנא הכנס בפעם הראשונה, על ידי הקלדת מספר הטלפון שלך ללא סיסמה ולחיצה על הכפתור "כניסה". המערכת תבקש שתגדיר סיסמה וזו תהיה סיסמתך.
בהצלחה`
    }
    let from = await context.for(Helpers).findFirst(h => h.id.isEqualTo(context.user.id));
    await new SendSmsUtils().sendSms(h.phone.value, from.phone.value, message, context.getOrigin(), Sites.getOrganizationFromContext(context));
    return 'הזמנה נשלחה בהצלחה'





  }



  async ngOnInit() {
    let s = await ApplicationSettings.getAsync(this.context);
    this.helpers.columns.numOfColumnsInGrid = this.numOfColsInGrid;



  }
  fromDate = new DateColumn({
    caption: 'מתאריך',
    valueChange: () => {

      if (this.toDate.value < this.fromDate.value) {
        //this.toDate.value = this.getEndOfMonth();
      }

    }
  });
  toDate = new DateColumn('עד תאריך');
  rangeArea = new DataAreaSettings({
    columnSettings: () => [this.fromDate, this.toDate],
    numberOfColumnAreas: 2
  });

  @ServerFunction({ allowed: Roles.admin })
  static async clearCommentsOnServer(context?: Context) {
    for (const h of await context.for(Helpers).find({ where: h => h.eventComment.isDifferentFrom('') })) {
      h.eventComment.value = '';
      await h.save();
    }
  }

  @ServerFunction({ allowed: Roles.admin })
  static async clearEscortsOnServer(context?: Context) {
    for (const h of await context.for(Helpers).find()) {
      h.escort.value = '';
      h.needEscort.value = false;
      h.theHelperIAmEscorting.value = '';
      await h.save();
    }
  }

}
