import { Component, OnInit, ViewChild } from '@angular/core';
import { Context, EntityClass, IdEntity, StringColumn, BoolColumn, NumberColumn, ServerFunction } from '@remult/core';
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

    setTimeout(async () => {
      if (this.run)
        this.results = [await TestMapComponent.testtest(), ...this.results];
      this.doIt();
    }, 100);
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


