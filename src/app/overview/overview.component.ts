import { Component, OnInit } from '@angular/core';
import { Remult } from 'remult';
import { validSchemaName } from '../sites/sites';

import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { DialogService } from '../select-popup/dialog';
import { extractError } from "../select-popup/extractError";
import { SiteOverviewComponent } from '../site-overview/site-overview.component';
import { BusyService, openDialog } from '@remult/angular';
import { actionInfo } from 'remult/src/server-action';
import { InputField } from '@remult/angular/interfaces';
import { dateRange, OverviewController, overviewResult, siteItem } from './overview.controller';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {

  constructor(private remult: Remult, private dialog: DialogService, private busy: BusyService) { }
  overview: overviewResult;
  sortBy: string;
  progress = 0;
  spinner = true;
  async ngOnInit() {
    this.overview = await OverviewController.getOverview(false);
    this.busy.donotWait(() => {
      const z = actionInfo.startBusyWithProgress;
      actionInfo.startBusyWithProgress = () => ({
        progress: x => this.progress = x * 100,
        close: () => { }
      })
      return OverviewController.getOverview(true).then(x => { this.overview = x; this.spinner = false; this.sort(); }).finally(() => actionInfo.startBusyWithProgress = z);
    });


    this.sort();

  }
  searchString = '';
  private sort() {
    for (const s of this.overview.sites) {
      s.lastSignIn = new Date(s.lastSignIn);
    }
    this.overview.sites.sort((a, b) => b.lastSignIn?.valueOf() - a.lastSignIn?.valueOf());
  }

  showSite(s: siteItem) {
    return !this.searchString || s.name.includes(this.searchString);
  }
  showSiteInfo(s: siteItem) {
    openDialog(SiteOverviewComponent, x => x.args = { site: s, statistics: this.overview.statistics });
  }
  doSort(s: dateRange) {
    this.sortBy = s.caption;
    this.overview.sites.sort((a, b) => b.stats[s.caption] - a.stats[s.caption]);
  }

  trackBy(index: number, s: siteItem) {
    return s.site;
  }
  async createNewSchema() {
    let id = new InputField<string>({ caption: 'id' });
    let name = new InputField<string>({ caption: 'שם הארגון' });
    let address = new InputField<string>({ caption: 'כתובת מרכז חלוקה', customInput: c => c.addressInput() });
    let manager = new InputField<string>({ caption: 'שם מנהל' });
    let phone = new InputField<string>({ caption: 'טלפון', inputType: 'tel' });
    openDialog(InputAreaComponent, x => x.args = {
      title: 'הוספת סביבה חדשה',
      fields: [id, name, address, manager, phone],
      validate: async () => {
        let x = validSchemaName(id.value);
        if (x != id.value) {
          if (await this.dialog.YesNoPromise('המזהה כלל תוים לא חוקיים שהוסרו, האם להמשיך עם המזהה "' + x + '"')) {
            id.value = x;
          } else
            throw "שם לא חוקי";
        }
        id.value = validSchemaName(id.value);
        let r = await OverviewController.validateNewSchema(id.value);
        if (r) {
          throw r;
        }
      },
      cancel: () => { },
      ok: async () => {
        try {
          let r = await OverviewController.createSchema(id.value, name.value, address.value, manager.value, phone.value);
          if (!r.ok)
            throw r.errorText;
          window.open(location.href = '/' + id.value, '_blank');
          this.ngOnInit();
        }
        catch (err) {
          this.dialog.Error(err);
        }
      }
    });
  }

}

