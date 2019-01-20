import { Component, OnInit } from '@angular/core';
import { Context } from '../shared/context';
import { WeeklyFamilies, WeeklyFullFamilyInfo } from './weekly-families';
import { Route } from '@angular/router';
import { AdminGuard, WeeklyFamilyAdminGuard } from '../auth/auth-guard';

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
  constructor(private context: Context) { }
  families = this.context.for(WeeklyFamilies).gridSettings({
    allowUpdate: true,
    allowDelete: true,
    allowInsert: true,

  });
  fullFamilies = this.context.for(WeeklyFullFamilyInfo).gridSettings({
    allowUpdate: true,
    allowDelete: true,
    allowInsert: true,

  });
  ngOnInit() {
  }

}
