import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';
import { Helpers, ProjectHelpers } from '../models';
import { MatDialog } from '@angular/material';

import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-project-helpers',
  templateUrl: './project-helpers.component.html',
  styleUrls: ['./project-helpers.component.scss']
})
export class ProjectHelpersComponent implements OnInit {

  constructor(private dialog: SelectService) {

  }
  @Input() projectId;
  ngOnInit() {
    this.helpers.getRecords();
  }
  helpers = new GridSettings(new ProjectHelpers(), {
    get: {
      where: h => h.projectId.isEqualTo(this.projectId),
      limit: 1000
    }
  });
  getName(h: ProjectHelpers) {
    return h.lookup(new Helpers(), h.helperId).name.value;
  }

  addOne() {
    this.dialog.showPopup(new Helpers(),
      h => {
        this.helpers.addNewRow();
        let newRow = this.helpers.items[this.helpers.items.length - 1];
        newRow.projectId.value = this.projectId;
        newRow.helperId.value = h.id.value;
        newRow.save();

      },
      {
        columnSettings: h => [h.name, h.phone]
      });
  }
}
