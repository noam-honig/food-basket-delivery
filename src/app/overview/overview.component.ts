import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction, DateColumn } from '@remult/core';
import { Roles } from '../auth/roles';
import { FamilyDeliveriesStats } from '../delivery-history/delivery-history.component';
import { Sites } from '../sites/sites';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {

  constructor() { }
  overview: dateRange[];
  async ngOnInit() {
    this.overview = await OverviewComponent.getOverview();
  }
  @ServerFunction({ allowed: Roles.overview })
  static async getOverview(context?: Context) {
    let today = new Date();
    let statistics: dateRange[] = [{
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
      caption: 'השבוע',
      value: 0,
      from: new Date(today.getFullYear(), today.getMonth(), -today.getDay() + 2),
      to: new Date(today.getFullYear(), today.getMonth(), -today.getDay() + 9)
    },
    {
      caption: 'השבוע שעבר',
      value: 0,
      from: new Date(today.getFullYear(), today.getMonth(), -today.getDay() + 1-7),
      to: new Date(today.getFullYear(), today.getMonth(), -today.getDay() + 2)
    },
    {
      caption: 'השנה',
      value: 0,
      from: new Date(today.getFullYear(), 0, 1),
      to: new Date(today.getFullYear() + 1, 0, 1)
    }
    ];




    for (const org of Sites.schemas) {
      for (const dateRange of statistics) {
        let r = await context.for(FamilyDeliveriesStats, Sites.getDataProviderForOrg(org)).count(f => f.deliveryStatusDate.isGreaterOrEqualTo(dateRange.from).and(f.deliveryStatusDate.isLessThan(dateRange.to)));
        dateRange.value += +r;
      }

    }
    return statistics;

  }

}

interface dateRange {
  caption: string;
  value: number;
  from: Date;
  to: Date;

}
