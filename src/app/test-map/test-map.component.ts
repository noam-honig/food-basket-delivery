import { Component, OnInit, ViewChild } from '@angular/core';
import { openDialog } from '@remult/angular';
import { Remult, IdEntity } from 'remult';
import { CreateNewEvent } from '../create-new-event/create-new-event';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { EditCustomMessageComponent } from '../edit-custom-message/edit-custom-message.component';
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
  a:string='asdf';
   ngOnInit() {
     setTimeout(() => {
       
       openDialog(EditCustomMessageComponent);
     }, 100);
  }





}




