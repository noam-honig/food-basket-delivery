import { Component, OnInit, ViewChild } from '@angular/core';
import { Context, EntityClass, IdEntity, StringColumn, BoolColumn, NumberColumn } from '@remult/core';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { AsignFamilyComponent } from '../asign-family/asign-family.component';
import { Families, FamilyId, GroupsColumn } from '../families/families';
import { SqlBuilder, changeDate, PhoneColumn } from '../model-shared/types';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { Roles } from '../auth/roles';
import { BasketId } from '../families/BasketType';
import { DistributionCenterId } from '../manage/distribution-centers';
import { DeliveryStatusColumn } from '../families/DeliveryStatus';
import { HelperId, HelperIdReadonly, Helpers } from '../helpers/helpers';
import { YesNoColumn } from '../families/YesNo';


@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})



export class TestMapComponent implements OnInit {


  constructor(private context: Context) { }

  

  async ngOnInit() {

  }
  async assignFamilies(h: HelpersAndStats) {
    alert('disabled for now');
    this.ngOnInit();
  }

}


