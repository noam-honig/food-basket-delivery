import { Component, OnInit, Injectable, HostListener } from '@angular/core';
import { Context, GridSettings, BusyService } from 'radweb';
import { Families } from '../families/families';
import { saveToExcel } from '../shared/saveToExcel';
import { DateTimeColumn } from '../model-shared/types';
import { DialogService } from '../select-popup/dialog';
import { CanDeactivate } from '@angular/router';

@Component({
  selector: 'app-create-backup-excel-file',
  templateUrl: './create-backup-excel-file.component.html',
  styleUrls: ['./create-backup-excel-file.component.scss']
})
export class CreateBackupExcelFileComponent implements OnInit {

  constructor(private context: Context, private busy: BusyService, private dialog: DialogService) { }

  ngOnInit() {
  }
  families = this.context.for(Families).gridSettings({ get: { limit: 500 } });
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    if (this.command && this.command.active) {
      $event.returnValue = true;
    }
  }
  command: CurrentBackupCommand;
  activate() {
    this.command = new CurrentBackupCommand(async () => {
      this.dialog.analytics('גיבוי אוטומטי');
      if (true)
        await saveToExcel<Families, GridSettings<Families>>(
          this.families,
          'גיבוי משפחות ' + new Date().toLocaleString('he').replace(/:/g,'-').replace(/\./g,'-').replace(/,/g,'')
          ,
          this.busy,
          (f, c) => c == f.id || c == f.addressApiResult,
          (f, c) => c == f.correntAnErrorInStatus || c == f.visibleToCourier);
      console.log("done backup");
    });
  }
  stop() {
    if (this.command) {
      this.command.active = false;
      this.command = undefined;
    }
  }

}
class CurrentBackupCommand {
  active = true;
  running = false;
  nextRun: Date;
  lastError: string;
  interval = 10 * 60000;
  constructor(private what: (() => Promise<void>)) {
    this.init();
  }
  async init() {
    this.running = true;
    try {
      this.lastError = undefined;
      await this.what();
    } catch (err) {
      this.lastError = err;
    }
    this.running = false;
    this.nextRun = new Date(new Date().valueOf() + this.interval);
    setTimeout(async () => {
      if (this.active) {
        await this.init();
      }
    }, this.interval);
  }
}

@Injectable()
export class CanDeactivateGuard implements CanDeactivate<CreateBackupExcelFileComponent> {
  canDeactivate(component: CreateBackupExcelFileComponent): boolean {

    if (component.command && component.command.active) {
      if (confirm("עזיבת הדף תגרום לגיבוי להפסיק - האם אתה בטוח שאתה רוצה לעזוב את הדף?")) {
        component.stop();
        return true;
      } else {
        return false;
      }
    }
    return true;
  }
}