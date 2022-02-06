import { Component, OnInit } from '@angular/core';
import { Remult } from 'remult';
import { DateValueConverter } from 'remult/valueConverters';
import { PreviousDeliveryController } from './previous-delivery-comments.controller';

@Component({
  selector: 'app-previous-delivery-comments',
  templateUrl: './previous-delivery-comments.component.html',
  styleUrls: ['./previous-delivery-comments.component.scss']
})
export class PreviousDeliveryCommentsComponent implements OnInit {
  args: { family: string; };

  constructor(public remult: Remult) { }
  comments: {
    date,
    comment
  }[] = [];

  ngOnInit(): void {
    PreviousDeliveryController.getHistory(this.args.family).then(r => this.comments = r.map(i => ({
      comment: i.courierComments,
      date: DateValueConverter.fromJson(i.date)
    })))
  }

}
