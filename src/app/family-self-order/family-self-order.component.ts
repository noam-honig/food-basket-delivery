import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Controller, Remult } from 'remult';
import { Families } from '../families/families';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyStatus } from '../families/FamilyStatus';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { FamilySelfOrderController } from './family-self-order.controller';

@Component({
  selector: 'app-family-self-order',
  templateUrl: './family-self-order.component.html',
  styleUrls: ['./family-self-order.component.scss']
})
@Controller('family-self-order')
export class FamilySelfOrderComponent extends FamilySelfOrderController implements OnInit {

  constructor(remult: Remult, public settings: ApplicationSettings, private route: ActivatedRoute) {
    super(remult);
  }

  ngOnInit(): void {
    this.familyUrl = this.route.snapshot.params['id'];
    this.load();
  }

  async loadFamily() {
    let f = await this.remult.repo(Families).findFirst({ shortUrlKey: this.familyUrl, status: FamilyStatus.Active });
    if (!f) {
      this.message = "לא נמצא";
      return;
    }
    if (await this.remult.repo(ActiveFamilyDeliveries).count({ family: f.id })) {
      this.message = "המשלוח כבר מעודכן במערכת, לשינוי נא ליצור קשר טלפוני";
      return;
    }
    return f;
  }


}
