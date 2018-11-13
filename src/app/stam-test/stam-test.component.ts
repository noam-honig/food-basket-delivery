import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { FamilyDeliveryEventsView } from "../families/FamilyDeliveryEventsView";
import { Context } from '../shared/context';
import { Helpers } from '../helpers/helpers';

@Component({
  selector: 'app-stam-test',
  templateUrl: './stam-test.component.html',
  styleUrls: ['./stam-test.component.scss']
})
export class StamTestComponent implements OnInit {

  constructor(private context: Context) { }
  settings = this.context.for(Helpers).gridSettings({
    allowDelete: true,
    allowInsert: true,
    allowUpdate: true
  });
  ngOnInit() {
  }

}
