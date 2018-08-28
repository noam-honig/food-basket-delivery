import { Component, OnInit, OnDestroy } from '@angular/core';
import { NewsUpdate } from "./NewsUpdate";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { StringColumn } from 'radweb';
import { SelectService } from '../select-popup/select-service';
import { AdminGuard } from '../auth/auth-guard';
import { Route } from '@angular/router';
import { Context } from '../shared/entity-provider';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit, OnDestroy {
  static route:Route = {
    path: 'news', component: NewsComponent, canActivate: [AdminGuard], data: { name: 'חדשות' }
  };

  onDestroy = () => { };
  constructor(dialog: SelectService,private context:Context) {
    let y = dialog.newsUpdate.subscribe(() => {
      this.refresh();
    });
    this.onDestroy = () => {
      y.unsubscribe();
    };

  }
  ngOnDestroy(): void {
    this.onDestroy();
  }
  news: NewsUpdate[] = [];
  async ngOnInit() {
    this.refresh();
  }
  newsEntity = new NewsUpdate(this.context);
  async refresh() {

    this.news = await this.newsEntity.source.find({ orderBy: [{ column: this.newsEntity.updateTime, descending: true }], limit: 1000 });
  }
  icon(n: NewsUpdate) {

    switch (n.updateType.value) {
      case 1:
        switch (n.deliverStatus.listValue) {
          case DeliveryStatus.ReadyForDelivery:

            break;
          case DeliveryStatus.Success:
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
