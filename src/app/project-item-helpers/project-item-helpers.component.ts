import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';

import { ItemsPerHelper, ProjectHelpers } from '../models';

@Component({
  selector: 'app-project-item-helpers',
  templateUrl: './project-item-helpers.component.html',
  styleUrls: ['./project-item-helpers.component.scss']
})
export class ProjectItemHelpersComponent implements OnInit {

  @Input() itemId = '';
  constructor() { }
  items = new GridSettings(new ItemsPerHelper(), {
    columnSettings: i => [
      {
        getValue: i => i.lookup(new ProjectHelpers(), i.projectHelperId).helper().name.value,
        caption: 'מתנדב/ת'
      },
      i.quantity
    ],
    get: {
      where: i => i.itemId.isEqualTo(this.itemId)
    }
  });
  ngOnInit() {
  }

}
