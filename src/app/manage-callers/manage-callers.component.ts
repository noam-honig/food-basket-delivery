import { Component, OnInit } from '@angular/core';
import { GridSettings } from '@remult/angular/interfaces';
import { Remult } from 'remult';
import { Callers } from './callers';

@Component({
  selector: 'app-manage-callers',
  templateUrl: './manage-callers.component.html',
  styleUrls: ['./manage-callers.component.scss']
})
export class ManageCallersComponent implements OnInit {

  constructor(private remult: Remult) { }

  grid = new GridSettings(this.remult.repo(Callers), {
    allowUpdate: true,
    columnSettings: x => [
      x.name,
      x.callQuota,
      x.callsCompleted,
      x.lastCallDate,
      x.includeGroups,
      x.excludeGroups
    ]
  });

  ngOnInit(): void {
  }

}
