import { Component, OnInit } from '@angular/core';
import { siteItem, dateRange } from '../overview/overview.component';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'app-site-overview',
  templateUrl: './site-overview.component.html',
  styleUrls: ['./site-overview.component.scss']
})
export class SiteOverviewComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<any>) { }
  args: {
    site: siteItem,
    statistics: dateRange[]
  }
  ngOnInit() {
  }
  openSite() {
    window.open(location.origin + '/' + this.args.site.site, '_blank');
  }

}
