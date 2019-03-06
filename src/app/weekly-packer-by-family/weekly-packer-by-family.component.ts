import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin, PackerGuard } from '../auth/auth-guard';
import { Context } from '../shared/context';
import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatus, WeeklyFamilyDeliveryProducts, WeeklyFamilyDeliveryProductStats } from '../weekly-families-deliveries/weekly-families-deliveries';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { WeeklyFamilyDeliveryList } from '../weekly-family-delivery-product-list/weekly-family-delivery-product-list.component';
import { BusyService } from '../select-popup/busy-service';

@Component({
  selector: 'app-weekly-packer-by-family',
  templateUrl: './weekly-packer-by-family.component.html',
  styleUrls: ['./weekly-packer-by-family.component.scss']
})
export class WeeklyPackerByFamilyComponent implements OnInit {
  

  constructor(private context: Context,private busy:BusyService) { }
  deliveries: WeeklyFamilyDeliveries[] = [];

  async ngOnInit() {
    this.deliveries = await this.context.for(WeeklyFamilyDeliveries).find(
      { where: d => d.status.IsGreaterOrEqualTo(WeeklyFamilyDeliveryStatus.Pack.id).and(d.status.IsLessOrEqualTo(WeeklyFamilyDeliveryStatus.Ready.id)) });
  }

  static route: Route = {
    path: 'weekly-packer-by-family',
    component: WeeklyPackerByFamilyComponent,
    data: { name: 'אריזה לפי חבילות' }, canActivate: [PackerGuard]
  }
  deliveryList = new WeeklyFamilyDeliveryList(this.context,this.busy);

  
  getDeliveryName(d: WeeklyFamilyDeliveries) {
    
    return d.getFamily().codeName.value;
    
  }
  

  showReadyToPickup() {
    return this.deliveryList.currentDelivery && this.deliveryList.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Pack;
  }
  showReturnToPack() {
    return this.deliveryList.currentDelivery && this.deliveryList.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Ready;

  }
  readyToPickupDisabled() {
    let hasQ = this.deliveryList.deliveryProducts.find(x => x.Quantity.value > 0);
    return !hasQ;
  }
  clickReturnToPack() {
    this.deliveryList.currentDelivery.changeStatus(WeeklyFamilyDeliveryStatus.Pack);
  }
  clickReadyToPickup() {
    this.deliveryList.currentDelivery.changeStatus(WeeklyFamilyDeliveryStatus.Ready);
  }
}
