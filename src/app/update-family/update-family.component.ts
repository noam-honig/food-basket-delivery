import { Component, OnInit, Input } from '@angular/core';
import { DataAreaSettings, ColumnCollection, FilterHelper, GridSettings } from 'radweb';
import { Families } from '../families/families';
import { Helpers } from '../helpers/helpers';
import { SelectService } from '../select-popup/select-service';
import { BasketType } from '../families/BasketType';
import { FamilySources } from '../families/FamilySources';
import { Context } from '../shared/context';
import { FamilyDeliveries } from '../families/FamilyDeliveries';

@Component({
  selector: 'app-update-family',
  templateUrl: './update-family.component.html',
  styleUrls: ['./update-family.component.scss']
})
export class UpdateFamilyComponent implements OnInit {
  constructor(private selectService: SelectService, private context: Context) { }
  @Input() families: GridSettings<Families>;
  @Input() familyDeliveries: FamilyDeliveries[];
  
  familiesInfo: DataAreaSettings<Families>;
  familiesAddress: DataAreaSettings<Families>;
  phones: DataAreaSettings<Families>;
  callInfo: DataAreaSettings<Families>;
  deliverInfo: DataAreaSettings<Families>;
  ngOnInit() {
    this.familiesInfo = this.families.addArea({
      columnSettings: families => [
        families.name,
        families.basketType.getColumn(),
        families.deliverStatus.getColumn(),
        families.special.getColumn(),
        families.internalComment,
        families.deliveryComments,
        families.familySource.getColumn(),
        families.tz,
        families.familyMembers,
        {
          column: families.language,
          dropDown: {
            items: families.language.getOptions()
          }
        },
        families.iDinExcel,
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
        families.city,
        families.addressOk

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
        families.deliverStatus.getColumn(),
        families.courier.getColumn(this.selectService),
        families.courierComments,
        {
          caption: 'טלפון משנע',
          getValue: f => f.courier.getPhone()
        },
        families.getPreviousDeliveryColumn(),
        families.courierAssignUser,
        families.courierAssingTime,
        families.deliveryStatusUser,
        families.deliveryStatusDate,
        families.fixedCourier.getColumn(this.selectService)
      ]
    });
  }
  deliveryInfo(fd:FamilyDeliveries) {
      
  }


}
