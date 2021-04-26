import { Component, OnInit, ViewChild } from '@angular/core';
import { Context, EntityClass, IdEntity, StringColumn, BoolColumn, NumberColumn, ServerFunction, DateColumn, DataAreaSettings } from '@remult/core';
import { CreateNewEvent } from '../create-new-event/create-new-event';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { ApplicationSettings } from '../manage/ApplicationSettings';


@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})



export class TestMapComponent implements OnInit {
  a = new DateColumn({valueChange:()=>this.b.rawValue = this.a.rawValue});
  b = new DateColumn();
  toRaw(){
    return DateColumn.dateToString(this.a.value);
  }
  area = new DataAreaSettings({ columnSettings: () => [this.a, this.b] });
  constructor(private context: Context) { }


  async ngOnInit() {
    this.a.value = new Date();
    setTimeout(() => {

      this.doIt();
    }, 1000);
  }
  async doIt() {



  }


}




