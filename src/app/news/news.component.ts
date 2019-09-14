import { Component, OnInit, OnDestroy } from '@angular/core';
import { NewsUpdate } from "./NewsUpdate";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { Context } from 'radweb';
import { DialogService } from '../select-popup/dialog';

import { Route } from '@angular/router';
import { SelectService } from '../select-popup/select-service';
import { Families } from '../families/families';
import { FilterBase } from 'radweb';
import { BusyService } from 'radweb';
import { Roles, AdminGuard } from '../auth/roles';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit, OnDestroy {
  static route: Route = {
    path: 'news', component: NewsComponent, canActivate: [AdminGuard], data: { name: 'חדשות' }
  };
  filters: NewsFilter[] = [{
    name: 'כל החדשות'
  }, 
  {
    name: 'בעיות מצריכות טיפול',
    where: f => f.deliverStatus.isProblem().and(f.updateType.isEqualTo(1)).and(f.needsWork.isEqualTo(true))
  },
  {
    name: 'כל הצריך טיפול',
    where: f =>f.updateType.isEqualTo(1).and(f.needsWork.isEqualTo(true))
  },{
    name: 'בעיות',
    where: f => f.deliverStatus.isProblem().and(f.updateType.isEqualTo(1))
  }, {
    name: 'הערות',
    where: f => f.courierComments.isDifferentFrom('').and(f.updateType.isEqualTo(1).and(f.deliverStatus.isAResultStatus()))
  }];
  currentFilter: NewsFilter = this.filters[0];
  filterChange() {

    this.refresh();
  }
  onDestroy = () => { };
  constructor(dialog: DialogService, private selectService: SelectService, private context: Context, private busy: BusyService) {
    let y = dialog.refreshStatusStats.subscribe(() => {
      this.refresh();
    });
    this.onDestroy = () => {
      y.unsubscribe();
    };

  }
  async updateFamily(n: NewsUpdate) {

    let f = await this.context.for(Families).findFirst(fam => fam.id.isEqualTo(n.id));
    this.selectService.updateFamiliy({ f: f,onSave:()=>{
      
        n.needsWork.value = f.needsWork.value;
    } });
    
  }
  ngOnDestroy(): void {
    this.onDestroy();
  }
  news: NewsUpdate[] = [];
  async ngOnInit() {
    this.refresh();
  }
  newsRows = 50;
  async refresh() {

    this.busy.donotWait(async () => {
      this.news = await this.context.for(NewsUpdate).find({ where: this.currentFilter.where, orderBy: n => [{ column: n.updateTime, descending: true }], limit: this.newsRows });
    });
  }
  moreNews() {
    this.newsRows *= 2;
    this.refresh();
  }
  icon(n: NewsUpdate) {

    switch (n.updateType.value) {
      case 1:
        switch (n.deliverStatus.value) {
          case DeliveryStatus.ReadyForDelivery:

            break;
          case DeliveryStatus.Success:
          case DeliveryStatus.SuccessLeftThere:
          case DeliveryStatus.SuccessPickedUp:
            return 'check';
          case DeliveryStatus.FailedBadAddress:
          case DeliveryStatus.FailedNotHome:
          case DeliveryStatus.FailedOther:
            return 'error';

        }
        return "create";
      case 2:
        if (n.courier.value)
          return "how_to_reg";
        else
          return "clear";
    }
    return n.deliverStatus.displayValue;
  }
}
interface NewsFilter {
  name: string;
  where?: (rowType: NewsUpdate) => FilterBase;
}