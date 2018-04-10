import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-project-helpers',
  templateUrl: './project-helpers.component.html',
  styleUrls: ['./project-helpers.component.css']
})
export class ProjectHelpersComponent implements OnInit {

  constructor() { }
  @Input() projectId: string = "02acfe14-6704-469f-9ff6-b7c94ce48fc4";
  ngOnInit() {
  }

}
