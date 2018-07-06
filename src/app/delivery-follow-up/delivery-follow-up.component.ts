import { Component, OnInit } from '@angular/core';
import { HelpersAndStats, Helpers } from '../models';
import { GridSettings } from 'radweb';
import { UserFamiliesList } from '../my-families/user-families';

@Component({
  selector: 'app-delivery-follow-up',
  templateUrl: './delivery-follow-up.component.html',
  styleUrls: ['./delivery-follow-up.component.scss']
})
export class DeliveryFollowUpComponent implements OnInit {

  familyLists = new UserFamiliesList();
  selectCourier(c: Helpers) {
    this.familyLists.initForHelper(c.id.value);
    console.log('GOT HERE');
  }
  constructor() { }
  couriers = new GridSettings(new HelpersAndStats(), {
    columnSettings: h => [
      h.name, h.phone, h.deliveriesInProgress, h.firstDeliveryInProgressDate
    ],
    get: {
      where: h => h.deliveriesInProgress.IsGreaterOrEqualTo(1)
    }
  });
  ngOnInit() {


  }

  relativeDate(d: Date, now?: Date) {
    if (!d)
      return '';
    if (!now)
      now = new Date();
    let sameDay = (x: Date, y: Date)=>{
      return x.getFullYear() == y.getFullYear() && x.getMonth() == y.getMonth() && x.getDate() == y.getDate()
    }
    let diffInMinues = Math.ceil((now.valueOf() - d.valueOf()) / 60000);
    if (diffInMinues < 60)
      return 'לפני ' + diffInMinues + ' דקות';
    if (diffInMinues < 60 * 10 || sameDay(d, now)) {
      let hours = Math.floor(diffInMinues / 60);
      let min = diffInMinues % 60;
      if (min > 50) {
        hours += 1;
        min = 0;
      }
      let r;
      switch (hours) {
        case 1:
          r = 'שעה';
          break
        case 2:
          r = "שעתיים";
          break;
        default:
          r = hours + ' שעות';
      }

      if (min > 35)
        r += ' ושלושת רבעי';
      else if (min > 22) {
        r += ' וחצי';
      }
      else if (min > 7) {
        r += ' ורבע ';
      }
      return 'לפני ' + r;

    }
    if (sameDay(d, new Date(now.valueOf() - 86400 * 1000))) {
      return 'אתמול';
    }
    if (sameDay(d, new Date(now.valueOf() - 86400 * 1000 * 2))) {
      return 'שלשום';
    }
    else {
      return 'ב' + d.toLocaleDateString();
    }

  }

}
