import { Component, OnInit } from '@angular/core';
import { BackendMethod, Remult } from 'remult';
import { DateValueConverter } from 'remult/valueConverters';
import { Roles } from '../auth/roles';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { getSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-previous-delivery-comments',
  templateUrl: './previous-delivery-comments.component.html',
  styleUrls: ['./previous-delivery-comments.component.scss']
})
export class PreviousDeliveryCommentsComponent implements OnInit {
  args: { family: string; };

  constructor(public remult:Remult) { }
  comments: {
    date,
    comment
  }[] = [];

  ngOnInit(): void {
    PreviousDeliveryCommentsComponent.getHistory(this.args.family).then(r => this.comments = r.map(i => ({
      comment: i.courierComments,
      date: DateValueConverter.fromJson(i.date)
    })))
  }
  @BackendMethod({ allowed: r => getSettings(r).allowVolunteerToSeePreviousActivities })
  static async getHistory(family: string, remult?: Remult) {
    return (await remult.repo(FamilyDeliveries).find({
      where: {
        family: [family],
        courier: remult.isAllowed(Roles.admin) ? undefined : await remult.getCurrentUser()
      },
      orderBy: {
        deliveryStatusDate: "desc"
      }
    })).map(({ deliveryStatusDate, courierComments }) => ({
      date: DateValueConverter.toJson(deliveryStatusDate),
      courierComments
    }))
  }
}
