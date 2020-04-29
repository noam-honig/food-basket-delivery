import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction, DataAreaSettings } from '@remult/core';
import { Families } from '../families/families';
import { Roles } from '../auth/roles';
import { PromiseThrottle } from '../import-from-excel/import-from-excel.component';
import { DialogService } from '../select-popup/dialog';
import { DistributionCenterId, allCentersToken } from '../manage/distribution-centers';
import { GeocodeInformation } from '../shared/googleApiHelpers';


@Component({
  selector: 'app-geocode',
  templateUrl: './geocode.component.html',
  styleUrls: ['./geocode.component.scss']
})
export class GeocodeComponent implements OnInit {
  distCenter = new DistributionCenterId(this.context, {
    valueChange:()=>this.ngOnInit()
  }, true);
  distCenterArea = new DataAreaSettings({ columnSettings: () => [this.distCenter] });
  constructor(private context: Context, private dialog: DialogService) {
    this.distCenter.value = allCentersToken;
  }
  families = 0;
  async ngOnInit() {
    this.families = await this.context.for(Families).count(f => filterBadGeocoding(f, this.distCenter.value));
  }
  message = '';
  async doIt() {

    let startNumber = this.families;
    let start = new Date().valueOf();
    try {
      while (this.families > 0) {
        await GeocodeComponent.geocodeOnServer(this.distCenter.value);
        let x = this.families;
        await this.ngOnInit();
        if (x - this.families < 100) {
          throw ('עדכון GEOCODE הופסתק בגלל אי התקדמות במספרים לפני הספירה היה: ' + x);
          return;
        }
        let timeLeft = ((new Date().valueOf() - start) / (this.families - startNumber)) * (this.families) / 1000 / 60;
        this.dialog.Info(this.message = "נשאר עוד " + timeLeft.toFixed(1) + ' דקות ');
      }
      this.dialog.Info('זהו נגמר');
    } catch (err) {
      this.dialog.Error(err);
    }

  }
  @ServerFunction({ allowed: Roles.admin })
  static async geocodeOnServer(distCenter: string, context?: Context) {
    let p = new PromiseThrottle(10);
    let start = new Date().valueOf();
    for (const f of await context.for(Families).find({ where: f => filterBadGeocoding(f, distCenter), limit: 1000 })) {
      await p.push(f.reloadGeoCoding().then(() => f.save()));
      if (new Date().valueOf() - start > 20000)
        break;
    }
    await p.done();
  }

}

function filterBadGeocoding(f: Families, distCenter: string) {
  return f.address.isDifferentFrom('').and(f.addressApiResult.isEqualTo(new GeocodeInformation().saveToString()));
}