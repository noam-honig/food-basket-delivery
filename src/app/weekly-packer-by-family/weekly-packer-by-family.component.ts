import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin, PackerGuard } from '../auth/auth-guard';
import { Context } from '../shared/context';
import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatus, WeeklyFamilyDeliveryProducts, WeeklyFamilyDeliveryProductStats } from '../weekly-families-deliveries/weekly-families-deliveries';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { WeeklyFamilyDeliveryList } from '../weekly-family-delivery-product-list/weekly-family-delivery-product-list.component';
import { BusyService } from '../select-popup/busy-service';
import { SelectService } from '../select-popup/select-service';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-weekly-packer-by-family',
  templateUrl: './weekly-packer-by-family.component.html',
  styleUrls: ['./weekly-packer-by-family.component.scss']
})
export class WeeklyPackerByFamilyComponent  {

  static route: Route = {
    path: 'weekly-packer-by-family',
    component: WeeklyPackerByFamilyComponent,
    data: { name: 'אריזה לפי חבילות' }, canActivate: [PackerGuard]
  }
 

  
}
