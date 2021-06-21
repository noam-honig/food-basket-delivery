import { Component, OnInit, ViewChild } from '@angular/core';
import { openDialog } from '@remult/angular';
import { Context, IdEntity } from '@remult/core';
import { CreateNewEvent } from '../create-new-event/create-new-event';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { Families } from '../families/families';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { MergeFamiliesComponent } from '../merge-families/merge-families.component';


@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})



export class TestMapComponent implements OnInit {

  constructor(private context: Context) { }
  async ngOnInit() {
    let f = await this.context.for(Families).find();
    openDialog(MergeFamiliesComponent, x => x.families = [f[0], f[1], f[2]]);
  }





}




