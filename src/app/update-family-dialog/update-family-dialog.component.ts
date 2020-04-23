import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MatDialogActions } from '@angular/material/dialog';
import { Families } from '../families/families';

import { Context, DialogConfig, DataControlSettings, DataAreaSettings, GridSettings } from '@remult/core';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyDeliveryStats } from '../family-deliveries/family-deliveries-stats';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

@Component({
  selector: 'app-update-family-dialog',
  templateUrl: './update-family-dialog.component.html',
  styleUrls: ['./update-family-dialog.component.scss']
})
@DialogConfig({

  minWidth: '90vw'
})
export class UpdateFamilyDialogComponent implements OnInit {
  public args: {
    family?: Families,
    delivery?: FamilyDeliveries,
    familyDelivery?: FamilyDeliveries,
    familyId?: string,
    deliveryId?: string,
    message?: string,
    disableSave?: boolean,
    onSave?: () => void
  };
  constructor(
    private dialogRef: MatDialogRef<any>,

    private context: Context

  ) {

  }
  cancel() {
    this.families.currentRow.undoChanges();
    this.dialogRef.close();
  }
  async confirm() {
    await this.families.currentRow.save();
    if (this.delivery && this.delivery.wasChanged())
      await this.delivery.save();
    this.dialogRef.close();
    if (this.args && this.args.onSave)
      this.args.onSave();
  }



  families = this.context.for(Families).gridSettings({ allowUpdate: true });

  delivery: FamilyDeliveries;




  familiesInfo: DataAreaSettings<Families>;
  familiesAddress: DataAreaSettings<Families>;
  phones: DataAreaSettings<Families>;
  callInfo: DataAreaSettings<Families>;
  deliverInfo: DataAreaSettings<Families>;
  extraFamilyInfo: DataAreaSettings<Families>;
  async ngOnInit() {
    if (!this.args.delivery) {
      if (this.args.familyDelivery) {
        this.args.deliveryId = this.args.familyDelivery.id.value;
      }
      if (this.args.deliveryId) {
        this.args.delivery = await this.context.for(FamilyDeliveries).findFirst(x => x.id.isEqualTo(this.args.deliveryId));
        this.args.familyId = this.args.delivery.family.value;
      }

    }
    if (!this.args.family) {
      if (this.args.familyId)
        this.args.family = await this.context.for(Families).findFirst(x => x.id.isEqualTo(this.args.familyId));
    }



    this.families.currentRow = this.args.family;


    this.familiesInfo = this.families.addArea({
      columnSettings: families => [
        families.name
      ],
    });
    this.extraFamilyInfo = this.families.addArea({
      columnSettings: families => [
        families.groups,
        families.distributionCenter,

        families.familyMembers,
        families.internalComment,
        families.familySource,
        families.socialWorker,
        [
          families.socialWorkerPhone1,
          families.socialWorkerPhone2
        ], [
          families.tz,
          families.tz2
        ],
        families.special,
        [families.birthDate, {
          caption: 'גיל',
          getValue: (f) => {
            if (!f.birthDate.value) {
              return '';
            }
            return Math.round((new Date().valueOf() - f.birthDate.value.valueOf()) / (365 * 86400000))
          }
        }],
        families.iDinExcel,
        families.defaultSelfPickup,
        families.fixedCourier
      ]
    });
    this.familiesAddress = this.families.addArea({
      columnSettings: families => [

        families.address,
        [
          families.appartment,
          families.floor,
          families.entrance
        ],
        families.addressComment,
        families.addressByGoogle,
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
        families.phone2Description],
        [families.phone3,
        families.phone3Description],
        [families.phone4,
        families.phone4Description]
      ]
    });

    if (this.delivery = this.args.delivery)
      if (this.delivery)
        this.deliverInfo = this.families.addArea({
          columnSettings: families => {

            let r = [
              this.delivery.deliverStatus,
              this.delivery.deliveryComments,
              this.delivery.courier,
              this.delivery.needsWork,
              this.delivery.courierComments
            ];
            return r;
          }
        });
  }



}
