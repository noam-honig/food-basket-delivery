import { Component, OnInit } from '@angular/core';
import { HelpersAndStats, Helpers } from '../models';
import { GridSettings, DateTimeColumn } from 'radweb';
import { UserFamiliesList } from '../my-families/user-families';

@Component({
  selector: 'app-delivery-follow-up',
  templateUrl: './delivery-follow-up.component.html',
  styleUrls: ['./delivery-follow-up.component.scss']
})
export class DeliveryFollowUpComponent implements OnInit {

  familyLists = new UserFamiliesList();
  selectCourier(c: Helpers) {
    this.familyLists.initForHelper(c.id.value,c.name.value, c);

  }
  showAll = 'false';
  changeToggle(showAll: string) {
    if (showAll != this.showAll) {
      this.showAll = showAll;
      this.getRecords();
    }
  }

  constructor() { }
  couriers = new GridSettings(new HelpersAndStats(), {

    columnSettings: h => [
      h.name, h.phone, h.deliveriesInProgress, h.firstDeliveryInProgressDate
    ],

  });
  getRecords() {
    let showAll = this.showAll == 'true';

    this.couriers.get({
      limit: 1000,
      orderBy: c => [{ column: c.firstDeliveryInProgressDate, descending: showAll }],
      where: h => {
        let r = h.deliveriesInProgress.IsGreaterOrEqualTo(1);
        if (!showAll) {
          return r.and(h.firstDeliveryInProgressDate.IsLessOrEqualTo(DateTimeColumn.dateToString(new Date(new Date().valueOf() - 3600000 * 1.5))));
        }
        return r;
      }
    });
  }
  ngOnInit() {
    this.getRecords();

  }


}
