import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items, Projects } from '../models';
import { ProjectItemsComponent } from '../project-items/project-items.component';
import { ProjectHelpersComponent } from '../project-helpers/project-helpers.component';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
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
  saveAll(projectsItems: ProjectItemsComponent,projectHelpers:ProjectHelpersComponent) {
    this.projects.currentRow.save();
    projectsItems.saveAll();
    projectHelpers.saveAll();
  }

}
