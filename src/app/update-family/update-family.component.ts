import { Component, OnInit, Input } from '@angular/core';
import { DataAreaSettings, ColumnCollection, FilterHelper, GridSettings } from 'radweb';
import { Families } from '../families/families';
import { Helpers } from '../helpers/helpers';
import { SelectService } from '../select-popup/select-service';
import { BasketType } from '../families/BasketType';
import { FamilySources } from '../families/FamilySources';
import { Context } from '../shared/context';

@Component({
  selector: 'app-update-family',
  templateUrl: './update-family.component.html',
  styleUrls: ['./update-family.component.scss']
})
export class UpdateFamilyComponent implements OnInit {

  constructor(private selectService: SelectService, private context: Context) { }
  @Input() families: GridSettings<Families>;
  familiesInfo: DataAreaSettings<Families>;
  familiesAddress: DataAreaSettings<Families>;
  phones: DataAreaSettings<Families>;
  callInfo: DataAreaSettings<Families>;
  deliverInfo: DataAreaSettings<Families>;
  ngOnInit() {
    this.familiesInfo = this.families.addArea({
      columnSettings: families => [
        families.name,
        families.familyMembers,
        {
          column: families.language,
          dropDown: {
            items: families.language.getOptions()
          }
        },
        {
          column: families.basketType,
          dropDown: { source: this.context.for(BasketType).create() }
        },
        {
          column: families.familySource,
          dropDown: { source: this.context.for(FamilySources).create() }
        },
        families.internalComment,
        families.iDinExcel,
        families.tz,
        families.deliveryComments,
        families.special.getColumn(),
        families.createUser,
        families.createDate




      ],
    });
    this.familiesAddress = this.families.addArea({
      columnSettings: families => [
        families.address,
        families.floor,
        families.appartment,
        families.addressComment,
        families.addressByGoogle(),
        families.city

      ]
    });
    this.phones = this.families.addArea({
      columnSettings: families => [
        families.phone1,
        families.phone1Description,
        families.phone2,
        families.phone2Description
      ]
    });
 
    this.deliverInfo = this.families.addArea({
      columnSettings: families => [
        families.fixedCourier.getColumn(this.selectService),
        families.courier.getColumn(this.selectService),
        {
          caption: 'טלפון משנע',
          getValue: f => f.courier.getPhone()
        },
        families.courierAssignUser,
        families.courierAssingTime,
        families.deliverStatus.getColumn(),
        families.deliveryStatusUser,
        families.deliveryStatusDate,
        families.courierComments,
        families.getPreviousDeliveryColumn()
      ]
    });
  }


}
