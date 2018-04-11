import { Component, OnInit, Input, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { GridSettings } from 'radweb';
import { Helpers, ProjectHelpers, ItemsPerHelper } from '../models';
import { MatDialog } from '@angular/material';

import { SelectService } from '../select-popup/select-service';
import { ProjectParticipantComponent } from '../project-participant/project-participant.component';

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


      },
      {
        columnSettings: h => [h.name, h.phone]
      });
  }
  @ViewChildren(ProjectParticipantComponent) participent: QueryList<ProjectParticipantComponent>;
  async saveAll() {
    var p = this.participent.map(x => x);
    for (let i = 0; i < p.length; i++) {
      await p[i].saveAll();
    }
  }
  async deleteHelper(helper: ProjectHelpers) {
    let hi = new ItemsPerHelper();
    let items = await hi.source.find({ where: hi.projectHelperId.isEqualTo(helper.id) });

    for (let i = 0; i < items.length; i++) {
      await items[i].delete();
    }
    await helper.delete();
  }


}
