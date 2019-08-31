import { Component, OnInit } from '@angular/core';
import { DateColumn, DataAreaSettings, Context, BusyService } from 'radweb';
import { Helpers } from '../helpers/helpers';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { PhoneColumn } from '../model-shared/types';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-send-bulk-sms',
  templateUrl: './send-bulk-sms.component.html',
  styleUrls: ['./send-bulk-sms.component.scss']
})
export class SendBulkSmsComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService, private busy: BusyService) {

  }

  fromDate = new DateColumn({
    caption: 'מתאריך'

  });
  toDate = new DateColumn('עד תאריך');

  rangeArea = new DataAreaSettings({
    columnSettings: () => [this.fromDate, this.toDate],
    numberOfColumnAreas: 2
  });
  ngOnInit() {
    this.toDate.value = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1);
    this.fromDate.value = new Date(this.toDate.value.getFullYear() - 1, this.toDate.value.getMonth(), this.toDate.value.getDate());
    this.refresh();
  }
  smsText: string = 'שלום !משנע!';
  testSms() {
    let name = 'ישראל ישראלי';
    let shortKey = "zxcvdf";
    if (this.matchingHelpers.length > 0) {
      name = this.matchingHelpers[0].name.value;
      shortKey = this.matchingHelpers[0].shortUrlKey.value;
    }
    return SendSmsAction.getMessage(this.smsText, ApplicationSettings.get(this.context).organisationName.value, name, this.context.user.name, window.location.origin + '/x/' + shortKey);
  }
  matchingHelpers: Helpers[] = [];
  async refresh() {
    this.matchingHelpers = await this.context.for(Helpers).find({
      where: h => h.smsDate.isGreaterOrEqualTo(this.fromDate).and(h.smsDate.isLessOrEqualTo(this.toDate).and(h.declineSms.isEqualTo(false)))
      , orderBy: h => h.name
    });
  }
  async sendTestMessage() {
    try {
      await SendSmsAction.SendCustomSmsMessage([this.context.user.id], this.smsText, window.location.origin, true);
      this.dialog.Info("הודעה נשלחה");
    }
    catch (err) {

      this.dialog.Error("תקלה בשליחה: " + err);
      console.error(err);


    }

  }
  async sendTheMessage() {

    await this.refresh();
    this.dialog.YesNoQuestion("האם אתה בטוח שאתה מעוניין לשלוח " + this.matchingHelpers.length + " הודעות?", () => {
      this.busy.doWhileShowingBusy(async () => {
        let send: string[] = [];
        let i = 0;
        for (const h of this.matchingHelpers) {
          send.push(h.id.value);
          i++;
          if (send.length == 40) {
            this.dialog.Info("שולח הודעה " + i + " ל" + h.name.value);
            await SendSmsAction.SendCustomSmsMessage(send, this.smsText, window.location.origin, false);
            send = [];
          }
        }
        if (send.length > 0) {
          this.dialog.Info("שולח הודעה " + i);
          await SendSmsAction.SendCustomSmsMessage(send, this.smsText, window.location.origin, false);
        }
      });
    });
  }



}
