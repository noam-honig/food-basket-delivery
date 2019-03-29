import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { FamilyDeliveryEventsView } from "../families/FamilyDeliveryEventsView";
import { Context } from '../shared/context';
import { Helpers } from '../helpers/helpers';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { myThrottle } from '../model-shared/types';

@Component({
  selector: 'app-stam-test',
  templateUrl: './stam-test.component.html',
  styleUrls: ['./stam-test.component.scss']
})
export class StamTestComponent implements OnInit {

  constructor(private context: Context) { }
  time: string;
  times = 0;
  clicks = 0;
  test() {
    this.clicks++;
    this.t.do(() => {
      this.doSomething(new Date().toLocaleTimeString());
    });
  }
  t = new myThrottle(5000);
  doSomething(what: string) {
    this.times++;
    this.time = what;
    
  }
  ngOnInit() {
  }

}
