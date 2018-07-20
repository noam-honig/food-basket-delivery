import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Helpers, HelpersAndStats } from '../models';

@Component({
  selector: 'app-stam-test',
  templateUrl: './stam-test.component.html',
  styleUrls: ['./stam-test.component.scss']
})
export class StamTestComponent implements OnInit {
  settings = new GridSettings(new HelpersAndStats(),{
    allowDelete:true,
    allowInsert:true,
    allowUpdate:true
  });
  constructor() { }

  ngOnInit() {
  }

}
