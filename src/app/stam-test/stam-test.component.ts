import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { FamilyDeliveryEventsView } from "../families/FamilyDeliveryEventsView";
import { Context } from '../shared/context';

@Component({
  selector: 'app-stam-test',
  templateUrl: './stam-test.component.html',
  styleUrls: ['./stam-test.component.scss']
})
export class StamTestComponent implements OnInit {
  settings = new GridSettings(new FamilyDeliveryEventsView(this.context),{
    allowDelete:true,
    allowInsert:true,
    allowUpdate:true
  });
  constructor(private context:Context) { }

  ngOnInit() {
  }

}
