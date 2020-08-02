import { Component, OnInit, ViewChild } from '@angular/core';
import { Context, EntityClass, IdEntity, StringColumn, BoolColumn, NumberColumn, ServerFunction } from '@remult/core';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { ApplicationSettings } from '../manage/ApplicationSettings';


@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})



export class TestMapComponent implements OnInit {


  constructor(private context: Context) { }

  results: string[] = [];
  run = false;
  async ngOnInit() {
    this.doIt();
  }
  doIt() {
    return;

    
  }
  @ServerFunction({ allowed: true })
  static async testtest(context?: Context) {
    var r = (await ApplicationSettings.getAsync(context)).organisationName.value;
    return r;
  }
  async assignFamilies(h: HelpersAndStats) {
    alert('disabled for now');
    this.ngOnInit();
  }

}


