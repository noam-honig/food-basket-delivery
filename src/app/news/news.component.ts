import { Component, OnInit } from '@angular/core';
import { NewsUpdate, DeliveryStatus } from '../models';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit {

  constructor() { }
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
  describe(n: NewsUpdate) {
    switch (n.updateType.value) {
      case 1:
        switch (n.deliverStatus.listValue) {
          case DeliveryStatus.ReadyForDelivery:
            break;
          case DeliveryStatus.Success:
          case DeliveryStatus.FailedBadAddress:
          case DeliveryStatus.FailedNotHome:
          case DeliveryStatus.FailedOther:
            let duration = '';
            if (n.courierAssingTime.value && n.deliveryStatusDate.value)
              duration = ' תוך ' + new Date(n.deliveryStatusDate.dateValue.valueOf() - n.courierAssingTime.dateValue.valueOf()).getMinutes().toString() + " דק'";
            return n.deliverStatus.displayValue + ' למשפחת ' + n.name.value + ' על ידי ' + n.courier.getValue() + duration;

        }
        return 'משפחת ' + n.name.value + ' עודכנה ל' + n.deliverStatus.displayValue;
      case 2:
        if (n.courier.value)
          return 'משפחת ' + n.name.value + ' שוייכה ל' + n.courier.getValue();
        else
          return "בוטל השיוך למשפחת " + n.name.value;
    }
    return n.deliverStatus.displayValue;
  }

}
