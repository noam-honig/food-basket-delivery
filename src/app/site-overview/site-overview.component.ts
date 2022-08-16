import { Component, OnInit } from '@angular/core';
import { siteItem, dateRange } from '../overview/overview.controller';
import { MatDialogRef } from '@angular/material/dialog';
import { remult } from 'remult';
import { Phone } from '../model-shared/phone';
import { Manager, SiteOverviewController } from './site-overview.controller';
import { messageMerger } from '../edit-custom-message/messageMerger';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-site-overview',
  templateUrl: './site-overview.component.html',
  styleUrls: ['./site-overview.component.scss']
})
export class SiteOverviewComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<any>, private ui: DialogService) { }
  args: {
    site: siteItem,
    statistics: dateRange[]
  }
  managers: Manager[] = [];
  ngOnInit() {
    SiteOverviewController.siteInfo(this.args.site.site).then(x => this.managers = x);
  }
  openSite() {
    window.open(location.origin + '/' + this.args.site.site, '_blank');
  }

  sendWhatsapp(m: Manager) {
    let message: string = localStorage.getItem("message");
    if (!message)
      message = "הי !שם!\n";


    Phone.sendWhatsappToPhone(m.phone, this.createMessage(m).merge(message), remult, true);
  }
  createMessage(m: Manager) {
    return new messageMerger([
      { token: "שם", value: m.name },
      { token: "ארגון", value: this.args.site.name },
      { token: "אתר", value: this.args.site.site }
    ])
  }
  editMessage() {
    this.ui.editCustomMessageDialog({
      message: this.createMessage(this.managers[0]),
      templateText: localStorage.getItem("message") || "הי !שם! מ!ארגון!",
      title: "מבנה הודעה למנהל",
      helpText: "ערוך את ההודעה כאן, ואז לחץ על שמור ובמסך הארגון לחץ על שם המנהל כדי לשלוח לו הודעה",
      buttons: [{
        name: "שמור",
        click: x => {
          localStorage.setItem("message", x.templateText);
          x.close();
        }
      }]
    })
  }

}
