import { Component, OnInit, ViewChild } from '@angular/core';
import { openDialog } from '@remult/angular';
import { Remult, IdEntity } from 'remult';
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

  constructor(private remult: Remult) { }
  filterGroup: string='';
  groups: { familiesCount: number, name: string }[];
  refreshBaskets() {
    this.groups = [
      { name: '', familiesCount: 1 },
      { name: 'a', familiesCount: 1 },
      { name: 'b', familiesCount: 1 }
    ]
  }
  async ngOnInit() {
    this.refreshBaskets();
  }





}




