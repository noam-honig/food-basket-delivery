import { Component, OnInit, ViewChild, AfterViewChecked, AfterViewInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Families, duplicateFamilyInfo, displayDupInfo, autocompleteResult as autoCompleteResult, sendWhatsappToFamily, canSendWhatsapp } from '../families/families';

import { DataAreaFieldsSetting, DataAreaSettings, GridSettings } from '@remult/angular/interfaces';
import { Remult } from 'remult';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { PreviewFamilyComponent } from '../preview-family/preview-family.component';
import { DialogService } from '../select-popup/dialog';

import { MatExpansionPanel } from '@angular/material/expansion';
import { ShowOnMapComponent } from '../show-on-map/show-on-map.component';
import { isGpsAddress, Location } from '../shared/googleApiHelpers';
import { AddressInputComponent } from '../address-input/address-input.component';
import { ImageInfo } from '../images/images.component';
import { FamilyImage } from '../families/DeiveryImages';
import { columnOrderAndWidthSaver } from '../families/columnOrderAndWidthSaver';
import { BusyService, DialogConfig, openDialog } from '@remult/angular';
import { UpdateFamilyDialogArgs } from '../helpers/init-context';
import { ChangeLogComponent } from '../change-log/change-log.component';

@Component({
  selector: 'app-update-family-dialog',
  templateUrl: './update-family-dialog.component.html',
  styleUrls: ['./update-family-dialog.component.scss']
})
@DialogConfig({

  minWidth: '95vw'
})
export class UpdateFamilyDialogComponent implements OnInit, AfterViewChecked, AfterViewInit, OnDestroy {
  public args: UpdateFamilyDialogArgs;
  constructor(
    private dialogRef: MatDialogRef<any>,

    private remult: Remult,
    public settings: ApplicationSettings,
    public dialog: DialogService,
    private cd: ChangeDetectorRef,
    private zone: NgZone,
    public busy: BusyService

  ) {
    dialogRef.afterClosed().toPromise().then(() => {
      if (!this.confirmed)
        if (!this.args.userCanUpdateButDontSave) {
          this.families.currentRow._.undoChanges();
          if (this.delivery)
            this.delivery._.undoChanges();
        }
    });
  }
  ngOnDestroy(): void {

  }
  ngAfterViewInit(): void {

  }
  init = false;

  ngAfterViewChecked(): void {
    if (!this.init && this.addressPanel) {
      if (this.args.focusOnAddress)
        this.addressPanel.open();
      this.init = true;
      this.cd.detectChanges();

    }
  }
  getAddressDescription() {
    let f = this.families.currentRow;
    if (!f.$.address.valueChanged())
      return f.getAddressDescription();
    return f.$.address.originalValue + ' (' + this.settings.lang.previousValue + ')';
  }

  addressOpen() {
    this.addressInput.initAddress(x => {
      this.onMapLocation = x.location;
      this.families.currentRow.addressByGoogle = x.addressByGoogle;
      this.families.currentRow.city = x.city;
      this.families.currentRow.addressOk = true;
      this.families.currentRow.autoCompleteResult = JSON.stringify({
        address: this.families.currentRow.address,
        result: x.autoCompleteResult
      } as autoCompleteResult);
    });

  }
  @ViewChild('deliveryPanel', { static: false }) deliveryPanel: MatExpansionPanel;
  @ViewChild('addressPanel', { static: false }) addressPanel: MatExpansionPanel;
  @ViewChild('addressInput', { static: false }) addressInput: AddressInputComponent;

  async sendSmsToCourier() {
    let h = await this.args.familyDelivery.courier.getHelper();
    h.sendSmsToCourier(this.dialog, 'בקשר למשפחת "' + this.args.familyDelivery.name + '" מ "' + this.args.familyDelivery.address + '"\n')
  }

  preview() {
    let fd = this.args.familyDelivery;
    if (!fd)
      fd = this.args.family.createDelivery(this.dialog.distCenter);
    this.args.family.updateDelivery(fd);
    openDialog(PreviewFamilyComponent, x => { x.argsFamily = fd });
  }
  updateInfo() {
    let f = this.families.currentRow;
    const fields: DataAreaFieldsSetting<any>[] =
      [
        [f.$.createUser,
        f.$.createDate],
        [f.$.lastUpdateUser,
        f.$.lastUpdateDate],
        [f.$.statusUser,
        f.$.statusDate]
      ];
    if (this.args.familyDelivery) {
      let fd = this.args.familyDelivery;
      fields.push(
        {
          getValue: () => 'עדכונים למשלוח'
        },
        [fd.$.deliveryStatusUser,
        fd.$.deliveryStatusDate],
        [fd.$.courierAssignUser,
        fd.$.courierAssingTime],
        [fd.$.createUser,
        fd.$.createDate]
      )
    }
    openDialog(InputAreaComponent, x => x.args = {
      title: 'פרטי עדכונים עבור ' + f.name,
      ok: () => { },
      fields,
      buttons: [{
        text: "הצג שינויים",
        click: () => openDialog(ChangeLogComponent, x => x.args = {
          for: this.args.family
        })
      }]
    });
  }
  refreshDeliveryStatistics = false;
  reloadDeliveries = false;
  cancel() {

    this.dialogRef.close();
  }
  confirmed = false;
  async confirm() {
    if (!this.families.currentRow.defaultDistributionCenter && this.onMapLocation)
      this.families.currentRow.defaultDistributionCenter = await this.remult.findClosestDistCenter(this.onMapLocation);
    if (this.delivery) {
      let d = this.delivery;
      if (d.changeRequireStatsRefresh())
        this.refreshDeliveryStatistics = true;
      await this.delivery.save();
    }
    this.confirmed = true;
    this.reloadDeliveries = this.families.currentRow.$.status.valueChanged();
    if (!this.refreshDeliveryStatistics)
      this.refreshDeliveryStatistics = this.reloadDeliveries;
    await this.families.currentRow.save();
    if (this.delivery)
      this.delivery._.reload();
    for (const image of this.images) {
      if (image.deleted && image.entity)
        await image.entity.delete();
      if (!image.deleted && !image.entity) {
        await this.remult.repo(FamilyImage).create({
          familyId: this.args.family.id, image: image.image
        }).save();
      }
    }


    this.dialogRef.close();
    if (this.args && this.args.onSave)
      this.args.onSave();
    if (this.args.afterSave) {
      this.args.afterSave({
        refreshDeliveryStatistics: this.refreshDeliveryStatistics,
        reloadDeliveries: this.reloadDeliveries
      })
    }
  }
  async newDelivery() {
    if (this.delivery && this.delivery._.wasChanged())
      this.delivery.save();
    await this.args.family.showNewDeliveryDialog(this.dialog, this.settings, {
      copyFrom: this.delivery,
      aDeliveryWasAdded: async (id) => {
        if (this.delivery)
          this.refreshDeliveryStatistics = true;
        this.delivery = await this.remult.repo(ActiveFamilyDeliveries).findId(id);
      }
    });
  }
  showNewDelivery() {
    return this.delivery && this.delivery.deliverStatus.IsAResultStatus();
  }



  families = new GridSettings(this.remult.repo(Families), { allowUpdate: true });

  delivery: ActiveFamilyDeliveries;

  async showDuplicate(dup: duplicateFamilyInfo) {
    let f = await this.remult.repo(Families).findId(dup.id);
    openDialog(UpdateFamilyDialogComponent, x => x.args = { family: f });
  }
  displayDupInfo(info: duplicateFamilyInfo) {
    return displayDupInfo(info, this.remult);
  }


  familiesInfo = new DataAreaSettings<Families>();
  familiesAddress = new DataAreaSettings<Families>();
  phones = new DataAreaSettings<Families>();
  callInfo = new DataAreaSettings<Families>();
  deliverInfo = new DataAreaSettings();
  extraFamilyInfo = new DataAreaSettings<Families>();
  deliveryDefaults = new DataAreaSettings<Families>();
  familyDeliveries: GridSettings<FamilyDeliveries>;
  onMapLocation: Location;
  showOnMap() {
    if (!this.onMapLocation)
      this.onMapLocation = this.families.currentRow.addressHelper.location;
    openDialog(ShowOnMapComponent, x => x.args = {
      location: this.onMapLocation,
      save: s => {
        if (!isGpsAddress(this.args.family.address))
          this.args.family.addressComment = (this.args.family.address + " " + this.args.family.addressComment).trim()
        this.args.family.address = s.lat.toFixed(6) + "," + s.lng.toFixed(6);
        this.onMapLocation = s
        this.args.family.addressByGoogle = "יתעדכן בשמירה";
      }
    });
  }
  images: ImageInfo[] = [];
  async ngOnInit() {
    if (!this.args.familyDelivery) {
      if (this.args.deliveryId) {
        this.args.familyDelivery = await this.remult.repo(FamilyDeliveries).findFirst({ id: this.args.deliveryId });
        this.args.familyId = this.args.familyDelivery.family;
      }

    }
    if (!this.args.family) {
      if (this.args.familyDelivery) {
        this.args.familyId = this.args.familyDelivery.family;
      }
      if (this.args.familyId)
        this.args.family = await this.remult.repo(Families).findFirst({ id: this.args.familyId });
    }
    const { addressLongitude, addressLatitude, drivingLatitude, drivingLongitude, addressHelper } = this.args.family;
    console.log({ addressLatitude, addressLongitude, drivingLatitude, drivingLongitude, loc: addressHelper.location });
    if (this.args.familyDelivery)
      this.delivery = this.args.familyDelivery;
    if (this.args.userCanUpdateButDontSave)
      this.args.disableSave = true;


    this.families.currentRow = this.args.family;
    this.images = await (await this.remult.repo(FamilyImage).find({ where: { familyId: this.args.family.id } })).map(i => ({
      image: i.image,
      entity: i
    } as ImageInfo));

    this.familiesInfo = this.families.addArea({
      fields: families => [
        families.name
      ],
    });
    const families = this.args.family.$;
    this.extraFamilyInfo = new DataAreaSettings({
      fields: () => [
        families.groups,
        [families.status, families.familyMembers],
        families.internalComment,
        families.email,
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
        [
          families.custom1,
          families.custom2
        ],
        [
          families.custom3,
          families.custom4
        ],
        families.numOfActiveReadyDeliveries,


        [families.birthDate
          , {
          caption: 'גיל',
          getValue: () => {
            const f = this.args.family;
            if (!f.birthDate) {
              return '';
            }
            return Math.round((new Date().valueOf() - f.birthDate.valueOf()) / (365 * 86400000))
          }
        }
        ],
        families.iDinExcel
      ]
    });
    this.familiesAddress = this.families.addArea({
      fields: families => [

        [
          families.appartment,
          families.floor,
          families.entrance
        ],
        families.addressComment,
        [families.buildingCode, families.area],
        families.addressByGoogle,
        [families.addressOk, families.city, families.postalCode]

      ]
    });

    this.phones = this.families.addArea({
      fields: families => [
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
      fields: f =>
        [
          [f.basketType, f.quantity],
          f.deliveryComments,
          f.defaultSelfPickup,
          f.fixedCourier,
          { field: f.defaultDistributionCenter, visible: () => this.dialog.hasManyCenters },
          f.special
        ].filter(x => this.settings.usingSelfPickupModule ? true : x != f.defaultSelfPickup)
    });
    if (this.delivery) {
      this.deliverInfo = new DataAreaSettings({ fields: () => this.delivery.deilveryDetailsAreaSettings(this.dialog) });


    }
    if (!this.families.currentRow.isNew()) {
      this.familyDeliveries = await this.args.family.deliveriesGridSettings({
        settings: this.settings,
        ui: this.dialog
      });
      new columnOrderAndWidthSaver(this.familyDeliveries).load('familyDeliveriesInUpdateFamily');
    }

  }

  sendWhatsApp() {
    sendWhatsappToFamily(this.args.family, this.remult);
  }
  canSendWhatsApp() {
    return canSendWhatsapp(this.args.family);

  }
}
