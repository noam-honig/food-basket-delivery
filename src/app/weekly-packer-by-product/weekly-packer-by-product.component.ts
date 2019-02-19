import { Component, OnInit } from '@angular/core';
import { Context } from '../shared/context';
import { HolidayDeliveryAdmin, PackerGuard } from '../auth/auth-guard';
import { Route } from '@angular/router';
import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatus, WeeklyFamilyDeliveryProducts, Products, WeeklyFamilyDeliveryProductStats } from '../weekly-families-deliveries/weekly-families-deliveries.component';
import { Families } from '../families/families';
import { WeeklyFamilies } from '../weekly-families/weekly-families';

@Component({
  selector: 'app-weekly-packer-by-product',
  templateUrl: './weekly-packer-by-product.component.html',
  styleUrls: ['./weekly-packer-by-product.component.scss']
})
export class WeeklyPackerByProductComponent implements OnInit {
  products: Products[] = [];

  constructor(private context: Context) { }

  static route: Route = {
    path: 'weekly-packer-by-product',
    component: WeeklyPackerByProductComponent,
    data: { name: 'אריזה לפי מוצרים' }, canActivate: [PackerGuard]
  }


  async ngOnInit() {
    this.products = await this.context.for(Products).find({ where: x => x.quantityToPack.IsGreaterThan(0) });
  }

  deliveryProducts: WeeklyFamilyDeliveryProductStats[] = []
  async showProduct(p: Products) {
    this.deliveryProducts = await this.context.for(WeeklyFamilyDeliveryProductStats).find({ where: x => x.product.isEqualTo(p.id) });
  }
  getFamilyCode(p: WeeklyFamilyDeliveryProductStats) {
    return this.context.for(WeeklyFamilies).lookup(x => x.id.isEqualTo(p.familyId)).codeName.value;
  }
}
