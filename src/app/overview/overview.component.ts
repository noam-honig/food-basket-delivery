import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction, DateColumn, Entity, SqlDatabase } from '@remult/core';
import { Roles } from '../auth/roles';
import { Sites } from '../sites/sites';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { SqlBuilder } from '../model-shared/types';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyDeliveries } from '../families/FamilyDeliveries';

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
    let onTheWay = "בדרך";
    let inEvent = "באירוע";
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
        ,
        {
          caption: 'שנה שעברה',
          value: 0,
          from: new Date(today.getFullYear() - 1, 0, 1),
          to: new Date(today.getFullYear(), 0, 1)
        },
        {
          caption: 'אי פעם',
          value: 0,
          from: new Date(2017, 0, 1),
          to: new Date(today.getFullYear() + 1, 0, 1)
        },
        {
          caption: inEvent,
          value: 0,
          from: undefined,
          to: undefined
        },
        {
          caption: onTheWay,
          value: 0,
          from: undefined,
          to: undefined
        }
      ],
      sites: []
    };

    var builder = new SqlBuilder();
    let f = context.for(ActiveFamilyDeliveries).create();
    let fd = context.for(FamilyDeliveries).create();



    for (const org of Sites.schemas) {
      let dp = Sites.getDataProviderForOrg(org);

      var as = context.for(ApplicationSettings, dp).create();

      let cols: any[] = [as.organisationName, as.logoUrl];

      for (const dateRange of result.statistics) {
        let key = 'a' + cols.length;
        if (dateRange.caption == inEvent) {
          cols.push(builder.countInnerSelect({ from: f }, key));


        } else if (dateRange.caption == onTheWay) {
          cols.push(builder.countInnerSelect({ from: f, where: () => [f.onTheWayFilter()] }, key));
        }
        else
          cols.push(builder.build('(select count(*) from ', fd, ' where ', builder.and(fd.deliveryStatusDate.isGreaterOrEqualTo(dateRange.from).and(fd.deliveryStatusDate.isLessThan(dateRange.to))), ') ',key));

      }

      let z = builder.query({
        select: () => cols,
        from: as,
      });
      let sql = dp as SqlDatabase;
      let zz = await sql.execute(z);
      let row = zz.rows[0];

      let site: siteItem = {
        name: row[zz.getColumnKeyInResultForIndexInSelect(0)],
        site: org,
        logo: row[zz.getColumnKeyInResultForIndexInSelect(1)],
        stats: {}
      };


      result.sites.push(site);
      let i=2;
      for (const dateRange of result.statistics) {
        let r = row[zz.getColumnKeyInResultForIndexInSelect(i++)];
        
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
