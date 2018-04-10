import { Component, OnInit, Input } from '@angular/core';
import { GridSettings } from 'radweb';
import { Helpers } from '../models';
import { MatDialog } from '@angular/material';

import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-project-helpers',
  templateUrl: './project-helpers.component.html',
  styleUrls: ['./project-helpers.component.css']
})
export class ProjectHelpersComponent implements OnInit {

  constructor(private dialog: SelectService) {

  }
  @Input() projectId: string = "02acfe14-6704-469f-9ff6-b7c94ce48fc4";
  ngOnInit() {
  }
  addOne() {
    this.dialog.showPopup(new Helpers(), h => alert(h.name.value), {
      columnSettings: h => [h.name, h.phone]
    });
  }



}
