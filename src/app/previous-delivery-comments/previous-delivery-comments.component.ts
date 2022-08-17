import { Component, OnInit } from '@angular/core';
import { remult,  ValueConverters } from 'remult';

import { PreviousDeliveryController } from './previous-delivery-comments.controller';

@Component({
  selector: 'app-previous-delivery-comments',
  templateUrl: './previous-delivery-comments.component.html',
  styleUrls: ['./previous-delivery-comments.component.scss']
})
export class PreviousDeliveryCommentsComponent implements OnInit {
  args: { family: string; };

  remult = remult;
  comments: {
    date,
    comment
  }[] = [];

  ngOnInit(): void {
    PreviousDeliveryController.getHistory(this.args.family).then(r => this.comments = r.map(i => ({
      comment: i.courierComments,
      date: ValueConverters.Date.fromJson(i.date)
    })))
  }

}
