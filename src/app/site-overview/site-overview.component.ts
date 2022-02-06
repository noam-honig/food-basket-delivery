import { Component, OnInit } from '@angular/core';
import { siteItem, dateRange } from '../overview/overview.controller';
import { MatDialogRef } from '@angular/material/dialog';
import { Remult } from 'remult';
import { Phone } from '../model-shared/phone';
import { Manager, SiteOverviewController } from './site-overview.controller';

@Component({
  selector: 'app-site-overview',
  templateUrl: './site-overview.component.html',
  styleUrls: ['./site-overview.component.scss']
})
export class SiteOverviewComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<any>, private remult: Remult) { }
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


    Phone.sendWhatsappToPhone(m.phone, message.replace('!שם!', m.name), this.remult, true);
  }

}
