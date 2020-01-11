import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction, DateColumn } from '@remult/core';
import { Roles } from '../auth/roles';
import { FamilyDeliveriesStats } from '../delivery-history/delivery-history.component';
import { Sites } from '../sites/sites';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {

  constructor() { }
  overview: overviewResult;
  sortBy: string;
  async ngOnInit() {
    this.overview = await OverviewComponent.getOverview();

  }
  doSort(s: dateRange) {
    this.sortBy = s.caption;
    this.overview.sites.sort((a, b) => b.stats[s.caption] - a.stats[s.caption]);
  }
  @ServerFunction({ allowed: Roles.overview })
  static async getOverview(context?: Context) {
    let today = new Date();
    let result: overviewResult = {
      statistics: [
        {
          caption: 'היום',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        },
        {
          caption: 'אתמול',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
          to: new Date(today.getFullYear(), today.getMonth(), today.getDate())
        },
        {
          caption: 'השבוע',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay()),
          to: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 7)
        },
        {
          caption: 'השבוע שעבר',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - 7),
          to: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
        },
        {
          caption: 'החודש',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), 1),
          to: new Date(today.getFullYear(), today.getMonth() + 1, 1)
        },
        {
          caption: 'חודש שעבר',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
          to: new Date(today.getFullYear(), today.getMonth(), 1)
        },
        {
          caption: 'השנה',
          value: 0,
          from: new Date(today.getFullYear(), 0, 1),
          to: new Date(today.getFullYear() + 1, 0, 1)
        }
      ],
      sites: []
    };




    for (const org of Sites.schemas) {
      let dp = Sites.getDataProviderForOrg(org);
      let s = await context.for(ApplicationSettings, dp).findFirst();
      let site: siteItem = {
        name: s.organisationName.value,
        site: org,
        logo: s.logoUrl.value,
        stats: {}
      };
      result.sites.push(site);
      for (const dateRange of result.statistics) {
        let r = await context.for(FamilyDeliveriesStats, dp).count(f => f.deliveryStatusDate.isGreaterOrEqualTo(dateRange.from).and(f.deliveryStatusDate.isLessThan(dateRange.to)));
        dateRange.value += +r;
        site.stats[dateRange.caption] = r;

      }

    }
    return result;

  }

}
interface siteItem {
  site: string;
  name: string;
  logo: string;
  stats: {
    [index: string]: number;
  }
}
interface overviewResult {
  statistics: dateRange[];
  sites: siteItem[];
}

interface dateRange {
  caption: string;
  value: number;
  from: Date;
  to: Date;

}
