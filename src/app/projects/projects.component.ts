import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items, Projects } from '../models';
import { ProjectItemsComponent } from '../project-items/project-items.component';
import { ProjectHelpersComponent } from '../project-helpers/project-helpers.component';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {

  constructor(
    private dialogs: SelectService
  ) { }

  ngOnInit(): void {
    this.projects.getRecords();
  }
  projects = new GridSettings(new Projects(), {
    onNewRow: p => p.id.setToNewId()
  });
  //tab implementation becaust mat tab sucks!!!!
  tabs = ['תאור כללי', 'מה צריך', 'מתנדבות'];
  selectedTab = 0;
  //end tab implementation
  saveAll(projectsItems: ProjectItemsComponent, projectHelpers: ProjectHelpersComponent) {
    if (this.projects.currentRow.wasChanged())
      this.projects.currentRow.save();
    projectsItems.saveAll();
    projectHelpers.saveAll();
  }
  addProject() {

    this.projects.addNewRow();
    let p = this.projects.items[this.projects.items.length - 1];
    this.dialogs.displayArea({
      title: 'אירוע חדש',
      settings: {
        columnSettings: () => [p.name]
      },
      ok: () => { 
        p.save();
      },
      cancel: () => { 
        
        p.reset();
      }
    });
  }
  delete(p: Projects) {
    this.dialogs.confirmDelete(p.name.value, () => {
      p.delete();
    });
  }

}
