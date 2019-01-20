import { Component, OnInit } from '@angular/core';
import { Context } from '../shared/context';
import { AdminGuard, PackerGuard } from '../auth/auth-guard';
import { Route } from '@angular/router';
import { WeeklyFamilyDeliveries, WeeklyFamilyDeliveryStatus, WeeklyFamilyDeliveryProducts, Products } from '../weekly-families-deliveries/weekly-families-deliveries.component';

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
    this.products = await this.context.for(Products).find({where: x => x.quantityToPack.IsGreaterThan(0)});
  }

  deliveryProducts: WeeklyFamilyDeliveryProducts[]=[]
  async showProduct(p:Products)
  {
    let deliveries = await this.context.for(WeeklyFamilyDeliveries).find({where: x => x.status.isEqualTo(WeeklyFamilyDeliveryStatus.Pack.id)});
    this.deliveryProducts = [];
    for (let d of deliveries)
      this.deliveryProducts.push(await this.context.for(WeeklyFamilyDeliveryProducts).lookupAsync(x => x.delivery.isEqualTo(d.id).and(x.product.isEqualTo(p.id))));
  }
}
