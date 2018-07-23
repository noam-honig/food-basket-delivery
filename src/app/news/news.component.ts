import { Component, OnInit, OnDestroy } from '@angular/core';
import { NewsUpdate, DeliveryStatus, DeliveryStatusColumn, changeDate, HelperId } from '../models';
import { StringColumn } from 'radweb';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit, OnDestroy {

  onDestroy = () => { };
  constructor(dialog: SelectService) {
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
  newsEntity = new NewsUpdate();
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
