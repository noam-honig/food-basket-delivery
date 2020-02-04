import { Component, OnInit } from '@angular/core';


import { Helpers } from './helpers';

import { Families } from '../families/families';
import { Route } from '@angular/router';

import { ServerFunction, DataControlSettings, DataControlInfo } from '@remult/core';
import { Context } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { BusyService } from '@remult/core';
import { DateColumn, DataAreaSettings } from '@remult/core';
import { Roles, AdminGuard } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { saveToExcel } from '../shared/saveToExcel';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit {
  constructor(private dialog: DialogService, public context: Context, private busy: BusyService, public settings: ApplicationSettings) {
  }
  static route: Route = {
    path: 'helpers',
    component: HelpersComponent,
    data: { name: 'מתנדבים' }, canActivate: [AdminGuard]
  };
  searchString: string;

  helpers = this.context.for(Helpers).gridSettings({
    allowDelete: true,
    allowInsert: true,
    allowUpdate: true,
    knowTotalRows: true,
    hideDataArea: true,
    numOfColumnsInGrid: 3,

    get: {
      orderBy: h => [h.name],
      limit: 10,
      where: h => {
        if (this.searchString)
          return h.name.isContains(this.searchString);
        return undefined;
      }
    },
    columnSettings: helpers => {
      let r: DataControlInfo<Helpers>[] = [
        helpers.name,
        helpers.phone
      ];
      r.push({
        column: helpers.admin,
        width: '100'
      });
      if (this.settings.manageEscorts.value)
        r.push(helpers.company);
      if (this.settings.manageEscorts.value) {
        r.push(helpers.escort, helpers.theHelperIAmEscorting, helpers.needEscort);
      }
      r.push(helpers.eventComment);
      r.push(helpers.createDate);
      return r;
    },
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes),


  });

  async doSearch() {
    if (this.helpers.currentRow && this.helpers.currentRow.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.helpers.getRecords());
  }


  resetPassword() {
    this.dialog.YesNoQuestion("האם את בטוחה שאת רוצה למחוק את הסיסמה של " + this.helpers.currentRow.name.value, async () => {
      await HelpersComponent.resetPassword(this.helpers.currentRow.id.value);
      this.dialog.Info("הסיסמה נמחקה");
    });

  }
  async saveToExcel() {
    await saveToExcel(this.context.for(Helpers), this.helpers, "מתנדבים", this.busy, (d: Helpers, c) => c == d.id || c == d.password || c == d.totalKm || c == d.totalTime || c == d.smsDate || c == d.reminderSmsDate || c == d.realStoredPassword || c == d.shortUrlKey || c == d.admin);
  }

  @ServerFunction({ allowed: Roles.admin })
  static async resetPassword(helperId: string, context?: Context) {

    await context.for(Helpers).foreach(h => h.id.isEqualTo(helperId), async h => {
      h.realStoredPassword.value = '';
      await h.save();
    });
  }



  async ngOnInit() {
    let s = await ApplicationSettings.getAsync(this.context);


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
  async clearComments() {
    if (await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: 'האם אתה בטוח שברצונך לנקות את כל ההערות למתנדבים?' }, x => x.yes)) {
      await HelpersComponent.clearCommentsOnServer();
      this.helpers.getRecords();
    }
  }
  @ServerFunction({ allowed: Roles.admin })
  static async clearCommentsOnServer(context?: Context) {
    for (const h of await context.for(Helpers).find({ where: h => h.eventComment.isDifferentFrom('') })) {
      h.eventComment.value = '';
      await h.save();
    }
  }
  async clearEscorts(){
    if (await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: 'האם אתה בטוח שברצונך לנקות את נתוני המלווים לכל המתנדבים?' }, x => x.yes)) {
      await HelpersComponent.clearEscortsOnServer();
      this.helpers.getRecords();
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
