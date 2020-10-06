import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { distCenterAdminGuard } from '../auth/roles';

@Component({
  selector: 'app-weekly-report-mlt',
  templateUrl: './weekly-report-mlt.component.html',
  styleUrls: ['./weekly-report-mlt.component.scss']
})
export class WeeklyReportMltComponent implements OnInit {
  static route: Route = {path: 'weekly-report-mlt', component: WeeklyReportMltComponent, canActivate: [distCenterAdminGuard]};

  constructor() { }

  ngOnInit() {
  }

}
