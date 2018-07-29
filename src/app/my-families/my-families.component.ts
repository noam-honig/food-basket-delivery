import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, DeliveryStatus } from '../models';
import { AuthService } from '../auth/auth-service';
import { SelectService } from '../select-popup/select-service';
import { UserFamiliesList } from './user-families';
import { MapComponent } from '../map/map.component';

@Component({
  selector: 'app-my-families',
  templateUrl: './my-families.component.html',
  styleUrls: ['./my-families.component.scss']
})
export class MyFamiliesComponent implements OnInit {

  familyLists = new UserFamiliesList();

  constructor(public auth: AuthService, private dialog: SelectService) { }
  async ngOnInit() {
    await this.familyLists.initForHelper(this.auth.auth.info.helperId,this.auth.auth.info.name);
    
  }


}
