import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Helpers } from '../models';

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit {
  helpers = new GridSettings(new Helpers(), {
    allowDelete: true,
    allowInsert: true,
    allowUpdate: true,
    numOfColumnsInGrid:3,
    columnSettings: helpers => [
      helpers.name,
      helpers.phone,
      helpers.email,
      helpers.address,
      helpers.userName
      
    ]
  });
  constructor() { }

  ngOnInit() {
  }

}
