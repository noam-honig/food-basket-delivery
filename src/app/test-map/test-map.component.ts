import { Component, OnInit, ViewChild } from '@angular/core';
import { Context, EntityClass, IdEntity, StringColumn, BoolColumn, NumberColumn, ServerFunction } from '@remult/core';
import { CreateNewEvent } from '../create-new-event/create-new-event';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { ApplicationSettings } from '../manage/ApplicationSettings';


@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})



export class TestMapComponent implements OnInit {


  constructor(private context: Context) { }


  async ngOnInit() {
    setTimeout(() => {

      this.doIt();
    }, 1000);
  }
  async doIt() {



  }


}




