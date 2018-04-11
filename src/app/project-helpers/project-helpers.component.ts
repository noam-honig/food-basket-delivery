import { Component, OnInit, Input, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { GridSettings } from 'radweb';
import { Helpers, ProjectHelpers, ItemsPerHelper } from '../models';
import { MatDialog } from '@angular/material';

import { SelectService } from '../select-popup/select-service';
import { ProjectHelperItemsComponent } from '../project-helper-items/project-helper-items.component';
import { foreachSync } from '../shared/utils';

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
    return h.helper().name.value;
  }

  addOne() {
    this.dialog.showPopup(new Helpers(),
      h => {
        this.helpers.addNewRow();
        let newRow = this.helpers.items[this.helpers.items.length - 1];
        newRow.projectId.value = this.projectId;
        newRow.helperId.value = h.id.value;
        newRow.id.setToNewId();
      },
      {
        columnSettings: h => [h.name, h.phone]
      });
  }
  @ViewChildren(ProjectHelperItemsComponent) itemsPerHelperComponent: QueryList<ProjectHelperItemsComponent>;
  async saveAll() {
    foreachSync(this.helpers.items, async h => h.save());
    foreachSync(this.itemsPerHelperComponent.toArray(), async x => x.saveAll());
  }

  async deleteHelper(helper: ProjectHelpers) {

    this.dialog.confirmDelete(helper.helper().name.value + " מפרוייקט " + (await helper.project()).name.value,
      async () => {
        if (helper.isNew())
          helper.reset();
        await helper.delete();
      });
  }


}
