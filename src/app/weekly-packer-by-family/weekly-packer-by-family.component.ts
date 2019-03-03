import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin, PackerGuard } from '../auth/auth-guard';
import { Context } from '../shared/context';
import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatus, WeeklyFamilyDeliveryProducts, WeeklyFamilyDeliveryProductStats } from '../weekly-families-deliveries/weekly-families-deliveries.component';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { WeeklyFamilyDeliveryList } from '../weekly-family-delivery-product-list/weekly-family-delivery-product-list.component';
import { BusyService } from '../select-popup/busy-service';

@Component({
  selector: 'app-weekly-packer-by-family',
  templateUrl: './weekly-packer-by-family.component.html',
  styleUrls: ['./weekly-packer-by-family.component.scss']
})
export class WeeklyPackerByFamilyComponent implements OnInit {
  deliveryProducts: WeeklyFamilyDeliveryProductStats[] = [];

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
    let f = this.context.for(WeeklyFamilies).lookup(f => f.id.isEqualTo(d.familyId));
    return f.assignedHelper.getValue() +' - ' +f.codeName.value;
    
  }
  currentDelivery: WeeklyFamilyDeliveries;
  async showDelivery(d: WeeklyFamilyDeliveries) {
    this.currentDelivery = d;
    this.deliveryProducts = await this.context.for(WeeklyFamilyDeliveryProductStats).find(
      {
        where: x => x.delivery.isEqualTo(d.id).and(x.requestQuanity.IsGreaterOrEqualTo(1)),
        orderBy: dp => [dp.productOrder, dp.productName]
      });
  }
  showReadyToPickup() {
    return this.currentDelivery && this.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Pack;
  }
  showReturnToPack() {
    return this.currentDelivery && this.currentDelivery.status.listValue == WeeklyFamilyDeliveryStatus.Ready;

  }
  readyToPickupDisabled() {
    let hasQ = this.deliveryProducts.find(x => x.Quantity.value > 0);
    return !hasQ;
  }
  clickReturnToPack() {
    this.currentDelivery.changeStatus(WeeklyFamilyDeliveryStatus.Pack);
  }
  clickReadyToPickup() {
    this.currentDelivery.changeStatus(WeeklyFamilyDeliveryStatus.Ready);
  }
}
