import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MatDialogActions } from '@angular/material/dialog';
import { Families, duplicateFamilyInfo, displayDupInfo } from '../families/families';

import { Context, DialogConfig, DataControlSettings, DataAreaSettings, GridSettings } from '@remult/core';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyDeliveryStats } from '../family-deliveries/family-deliveries-stats';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { PreviewFamilyComponent } from '../preview-family/preview-family.component';
import { DialogService } from '../select-popup/dialog';

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
    familyDelivery?: FamilyDeliveries,
    familyId?: string,
    deliveryId?: string,
    message?: string,
    disableSave?: boolean,
    onSave?: () => void
  };
  constructor(
    private dialogRef: MatDialogRef<any>,

    private context: Context,
    private settings: ApplicationSettings,
    private dialog: DialogService

  ) {

  }
  preview() {
    let fd = this.args.family.createDelivery(this.dialog.distCenter.value);
    this.context.openDialog(PreviewFamilyComponent, x => { x.argsFamily = fd });
  }
  updateInfo() {
    let f = this.families.currentRow;
    this.context.openDialog(InputAreaComponent, x => x.args = {
      title: 'פרטי עדכונים עבור ' + f.name.value,
      ok: () => { },
      settings: {
        columnSettings: () => [
          [f.createDate, f.createUser],
          [f.lastUpdateDate, f.lastUpdateUser],
          [f.statusDate, f.statusUser]
        ]
      }
    });
  }
  cancel() {
    this.families.currentRow.undoChanges();
    this.dialogRef.close();
  }
  async confirm() {
    await this.families.currentRow.save();
    if (this.delivery && this.delivery.wasChanged()) {
      await this.delivery.save();
    }
    this.dialogRef.close();
    if (this.args && this.args.onSave)
      this.args.onSave();
  }
  async newDelivery() {
    await this.args.family.showNewDeliveryDialog(this.dialog, this.delivery);
  }
  showNewDelivery() {
    return this.delivery && DeliveryStatus.IsAResultStatus(this.delivery.deliverStatus.value);
  }



  families = this.context.for(Families).gridSettings({ allowUpdate: true });

  delivery: FamilyDeliveries;

  async showDuplicate(dup: duplicateFamilyInfo) {
    let f = await this.context.for(Families).findId(dup.id);
    this.context.openDialog(UpdateFamilyDialogComponent, x => x.args = { family: f });
  }
  displayDupInfo(info: duplicateFamilyInfo) {
    return displayDupInfo(info);
  }


  familiesInfo = new DataAreaSettings<Families>();
  familiesAddress = new DataAreaSettings<Families>();
  phones = new DataAreaSettings<Families>();
  callInfo = new DataAreaSettings<Families>();
  deliverInfo = new DataAreaSettings<Families>();
  extraFamilyInfo = new DataAreaSettings<Families>();
  deliveryDefaults = new DataAreaSettings<Families>();
  async ngOnInit() {
    if (!this.args.familyDelivery) {
      if (this.args.deliveryId) {
        this.args.familyDelivery = await this.context.for(FamilyDeliveries).findFirst(x => x.id.isEqualTo(this.args.deliveryId));
        this.args.familyId = this.args.familyDelivery.family.value;
      }

    }
    if (!this.args.family) {
      if (this.args.familyDelivery) {
        this.args.familyId = this.args.familyDelivery.family.value;
      }
      if (this.args.familyId)
        this.args.family = await this.context.for(Families).findFirst(x => x.id.isEqualTo(this.args.familyId));
    }
    if (this.args.familyDelivery)
      this.delivery = this.args.familyDelivery;



    this.families.currentRow = this.args.family;


    this.familiesInfo = this.families.addArea({
      columnSettings: families => [
        families.name
      ],
    });
    this.extraFamilyInfo = this.families.addArea({
      columnSettings: families => [
        families.groups,
        [families.familyMembers, families.status],
        families.internalComment,
        [
          families.tz,
          families.tz2
        ],
        families.familySource,
        families.socialWorker,
        [
          families.socialWorkerPhone1,
          families.socialWorkerPhone2
        ],


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
        [families.city, families.area],
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
    this.deliveryDefaults = this.families.addArea({
      columnSettings: f =>
        [
          [f.basketType, f.quantity],
          f.deliveryComments,
          f.defaultSelfPickup,
          f.fixedCourier,
          f.special
        ].filter(x => this.settings.usingSelfPickupModule.value ? true : x != f.defaultSelfPickup)
    });
    if (this.delivery)
      this.deliverInfo = new DataAreaSettings({
        columnSettings: () => {

          let r = [
            this.delivery.deliverStatus,
            this.delivery.deliveryComments,
            this.delivery.courier,
            this.delivery.distributionCenter,
            this.delivery.needsWork,
            this.delivery.courierComments,
            this.delivery.special
          ];
          return r;
        }
      });
  }



}
