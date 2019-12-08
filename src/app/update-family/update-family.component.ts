import { Component, OnInit, Input } from '@angular/core';
import { DataAreaSettings, ColumnCollection, FilterHelper, GridSettings, ColumnSetting } from '@remult/core';
import { Families } from '../families/families';
import { Helpers } from '../helpers/helpers';

import { BasketType } from '../families/BasketType';
import { FamilySources } from '../families/FamilySources';
import { Context } from '@remult/core';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { DialogService } from '../select-popup/dialog';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';

@Component({
  selector: 'app-update-family',
  templateUrl: './update-family.component.html',
  styleUrls: ['./update-family.component.scss']
})
export class UpdateFamilyComponent implements OnInit {
  constructor(private context: Context, private dialog: DialogService) { }
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
        [
          families.basketType,
          families.familyMembers
        ],
        families.internalComment,
        families.familySource,
        families.socialWorker,
        [
          families.socialWorkerPhone1,
          families.socialWorkerPhone2
        ], [
          families.tz,
          families.tz2],
        families.iDinExcel
      ],
    });
    this.familiesAddress = this.families.addArea({
      columnSettings: families => [

        families.address,
        [
          families.floor,
          families.appartment,
          families.entrance
        ],
        families.addressComment,
        families.addressByGoogle(),
        families.city,
        families.addressOk,
        families.postalCode

      ]
    });

    this.phones = this.families.addArea({
      columnSettings: families => [
        [
          families.phone1,
          families.phone1Description],
        [families.phone2,
        families.phone2Description]
      ]
    });

    this.deliverInfo = this.families.addArea({
      columnSettings: families => {

        let r = [
          families.deliverStatus,
          families.internalComment,
          families.deliveryComments,
          families.addressComment,
          families.groups,
          families.special,

          families.courier,

          families.courierComments,
          families.needsWork,

          families.defaultSelfPickup,
          families.fixedCourier
        ];
        if (!DeliveryStatus.usingSelfPickupModule)
          r = r.filter(x => x != families.defaultSelfPickup);
        return r;
      }
    });
  }
  deliveryInfo(fd: FamilyDeliveries) {
    let columns: ColumnSetting<any>[] =
      [
        fd.deliverStatus,
        fd.deliveryStatusDate,
        fd.courier,
        fd.courierComments,
        fd.courierAssingTime,
        fd.deliveryStatusUser,
        fd.courierAssignUser
      ];
    for (const c of columns) {
      c.readonly = true;
    }


    this.context.openDialog(InputAreaComponent, x => x.args = {
      title: 'פרטי משלוח',
      settings: {
        columnSettings: () => columns
      },
      ok: () => { },
      buttons: [{
        text: 'מחקי', click: close => {
          this.dialog.confirmDelete('פרטי משלוח זה', () => {
            fd.delete();
            this.familyDeliveries.splice(this.familyDeliveries.indexOf(fd), 0);
            close();
          });
        }
      }]
    });
  }


}
