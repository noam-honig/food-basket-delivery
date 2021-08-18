import { Component, OnInit } from '@angular/core';
import { siteItem, dateRange } from '../overview/overview.component';
import { MatDialogRef } from '@angular/material/dialog';
import { BackendMethod, Remult } from 'remult';
import { Roles } from '../auth/roles';
import { createSiteContext } from '../helpers/init-context';
import { Helpers } from '../helpers/helpers';
import { Phone } from '../model-shared/phone';

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
    SiteOverviewComponent.siteInfo(this.args.site.site).then(x => this.managers = x);
  }
  openSite() {
    window.open(location.origin + '/' + this.args.site.site, '_blank');
  }
  @BackendMethod({ allowed: Roles.overview })
  static async siteInfo(site: string, remult?: Remult): Promise<Manager[]> {
    let c = await createSiteContext(site, remult);
    return (await c.repo(Helpers).find({ where: x => x.admin.isEqualTo(true), orderBy: x => x.lastSignInDate.descending() })).map(
      ({ name, phone, lastSignInDate }) => ({
        name, phone: phone?.thePhone, lastSignInDate
      })
    ).sort((a, b) => b.lastSignInDate?.valueOf() - a.lastSignInDate?.valueOf());
  }
  sendWhatsapp(m: Manager) {
    let message: string = localStorage.getItem("message");
    if (!message)
      message = "הי !שם!\n";


    Phone.sendWhatsappToPhone(m.phone, message.replace('!שם!', m.name), this.remult,true);
  }

}
interface Manager {
  name: string,
  phone: string,
  lastSignInDate: Date
}
