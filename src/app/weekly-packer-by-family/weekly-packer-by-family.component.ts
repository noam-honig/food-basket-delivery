import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/router';
import { HolidayDeliveryAdmin, PackerGuard } from '../auth/auth-guard';
import { Context } from '../shared/context';
import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatus, WeeklyFamilyDeliveryProducts, WeeklyFamilyDeliveryProductStats } from '../weekly-families-deliveries/weekly-families-deliveries.component';
import { WeeklyFamilies } from '../weekly-families/weekly-families';

@Component({
  selector: 'app-weekly-packer-by-family',
  templateUrl: './weekly-packer-by-family.component.html',
  styleUrls: ['./weekly-packer-by-family.component.scss']
})
export class WeeklyPackerByFamilyComponent implements OnInit {
  deliveryProducts: WeeklyFamilyDeliveryProductStats[] = [];

  constructor(private context:Context) { }
  deliveries:WeeklyFamilyDeliveries[]=[];

  async ngOnInit() {
    this.deliveries = await this.context.for(WeeklyFamilyDeliveries).find(
      {where: d => d.status.isEqualTo(WeeklyFamilyDeliveryStatus.Pack.id)});
  }
  static route: Route = {
    path: 'weekly-packer-by-family',
    component: WeeklyPackerByFamilyComponent,
    data: { name: 'אריזה לפי חבילות' }, canActivate: [PackerGuard]
  }

   getDeliveryName(d : WeeklyFamilyDeliveries)
  {
    return this.context.for(WeeklyFamilies).lookup(f => f.id.isEqualTo(d.familyId)).codeName.value;
  }

    async showDelivery(d:WeeklyFamilyDeliveries)
  {
    this.deliveryProducts = await this.context.for(WeeklyFamilyDeliveryProductStats).find({where: x => x.delivery.isEqualTo(d.id).and(x.requestQuanity.IsGreaterOrEqualTo(1))});
  }
}
