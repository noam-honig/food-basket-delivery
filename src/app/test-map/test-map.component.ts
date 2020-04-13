import { Component, OnInit, ViewChild } from '@angular/core';
import { Context } from '@remult/core';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { AsignFamilyComponent } from '../asign-family/asign-family.component';


@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})



export class TestMapComponent implements OnInit {
  helpers: HelpersAndStats[];

  constructor(private context: Context) { }

  async ngOnInit() {
    this.helpers = await this.context.for(HelpersAndStats).find();
  }
  async assignFamilies(h: HelpersAndStats) {
    alert('disabled for now');
    this.ngOnInit();
  }

}
