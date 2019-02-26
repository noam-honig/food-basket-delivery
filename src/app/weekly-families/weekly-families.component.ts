import { Component, OnInit } from '@angular/core';
import { Context } from '../shared/context';
import { WeeklyFamilies, WeeklyFullFamilyInfo } from './weekly-families';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin, WeeklyFamilyAdminGuard } from '../auth/auth-guard';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-weekly-families',
  templateUrl: './weekly-families.component.html',
  styleUrls: ['./weekly-families.component.scss']
})
export class WeeklyFamiliesComponent implements OnInit {
  static route: Route = {
    path: 'weekly-families',
    component: WeeklyFamiliesComponent,
    data: { name: 'משפחות שבועיות' }, canActivate: [WeeklyFamilyAdminGuard]
  }
  constructor(private context: Context, private selectService: SelectService) { }

  fullFamilies = this.context.for(WeeklyFullFamilyInfo).gridSettings({
    allowUpdate: true,
    allowDelete: true,
    allowInsert: true,
    knowTotalRows:true,
    columnSettings: f => [
      f.name,
      f.assignedHelper.getColumn(this.selectService, h => h.weeklyFamilyVolunteer.isEqualTo(true)),
      f.codeName
    ],
    get: {
      limit: 100,
      orderBy:f=>[f.name]
    }

  });
  ngOnInit() {
  }

}
