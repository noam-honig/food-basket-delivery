import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { MatDialogRef, MatDialogActions } from '@angular/material/dialog';
import { Families, duplicateFamilyInfo, displayDupInfo, autocompleteResult as autoCompleteResult, sendWhatsappToFamily, canSendWhatsapp } from '../families/families';

import { BusyService, DataAreaFieldsSetting, DataAreaSettings, DialogConfig, GridSettings, InputField, openDialog } from '@remult/angular';
import { Context, ServerFunction, ServerContext } from '@remult/core';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyDeliveryStats } from '../family-deliveries/family-deliveries-stats';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { PreviewFamilyComponent } from '../preview-family/preview-family.component';
import { DialogService } from '../select-popup/dialog';

import { GetVolunteerFeedback } from '../update-comment/update-comment.component';
import { HelperId, Helpers, HelpersBase } from '../helpers/helpers';
import { Roles } from '../auth/roles';
import { SendSmsAction, SendSmsUtils } from '../asign-family/send-sms-action';
import { Sites } from '../sites/sites';
import { async } from '@angular/core/testing';
import { MatExpansionPanel } from '@angular/material/expansion';
import { ShowOnMapComponent } from '../show-on-map/show-on-map.component';
import { isGpsAddress, Location } from '../shared/googleApiHelpers';
import { AsignFamilyComponent } from '../asign-family/asign-family.component';
import { FamilyStatus } from '../families/FamilyStatus';
import { LatLng } from 'spherical-geometry-js';
import { AddressInputComponent } from '../address-input/address-input.component';

@Component({
  selector: 'app-update-family-dialog',
  templateUrl: './update-family-dialog.component.html',
  styleUrls: ['./update-family-dialog.component.scss']
})
@DialogConfig({

  minWidth: '95vw'
})
export class UpdateFamilyDialogComponent implements OnInit, AfterViewChecked, AfterViewInit, OnDestroy {
  public args: {
    family?: Families,
    familyDelivery?: FamilyDeliveries,
    familyId?: string,
    deliveryId?: string,
    focusOnAddress?: boolean,
    message?: string,
    disableSave?: boolean,
    userCanUpdateButDontSave?: boolean,
    onSave?: () => void
  };
  constructor(
    private dialogRef: MatDialogRef<any>,

    private context: Context,
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
    if (f.$.address.wasChanged())
      return f.getAddressDescription();
    return f.$.address.originalValue;
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
    let h = await this.context.for(Helpers).findId(this.args.familyDelivery.courier);

    await openDialog(GetVolunteerFeedback, x => x.args = {
      helpText: () => '',
      ok: async (comment) => {
        await UpdateFamilyDialogComponent.SendCustomMessageToCourier(this.args.familyDelivery.courier, comment);
        this.dialog.Info("הודעה נשלחה");
      },
      cancel: () => { },
      hideLocation: true,
      title: 'שלח הודעת ל' + h.name,
      family: this.args.familyDelivery,
      comment: 'שלום ' + h.name + '\nבקשר למשפחת "' + this.args.familyDelivery.name + '" מ "' + this.args.familyDelivery.address + '"\n'
    });
  }
  @ServerFunction({ allowed: Roles.admin })
  static async SendCustomMessageToCourier(h: HelpersBase, message: string, context?: ServerContext) {   
    await new SendSmsUtils().sendSms(h.phone.thePhone, await SendSmsAction.getSenderPhone(context), message, context.getOrigin(), Sites.getOrganizationFromContext(context), await ApplicationSettings.getAsync(context));

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
    openDialog(InputAreaComponent, x => x.args = {
      title: 'פרטי עדכונים עבור ' + f.name,
      ok: () => { },
      settings: {
        fields: () => {
          let r: DataAreaFieldsSetting<any>[] =
            [
              f.$.createDate, f.$.createUser,
              f.$.lastUpdateDate, f.$.lastUpdateUser,
              f.$.statusDate, f.$.statusUser
            ];
          if (this.args.familyDelivery) {
            let fd = this.args.familyDelivery;
            r.push(
              {
                getValue: () => 'עדכונים למשלוח'
              },
              fd.$.deliveryStatusDate,
              fd.$.deliveryStatusUser,
              fd.$.courierAssingTime,
              fd.$.courierAssignUser,
              fd.$.createDate,
              fd.$.createUser
            )
          }
          return r;
        }
      }
    });
  }
  refreshDeliveryStatistics = false;
  reloadDeliveries = false;
  cancel() {

    this.dialogRef.close();
  }
  confirmed = false;
  async confirm() {
    if (this.delivery) {
      let d = this.delivery;
      if (d.changeRequireStatsRefresh())
        this.refreshDeliveryStatistics = true;
      await this.delivery.save();
    }
    this.confirmed = true;
    this.reloadDeliveries = this.families.currentRow.$.status.wasChanged();
    if (!this.refreshDeliveryStatistics)
      this.refreshDeliveryStatistics = this.reloadDeliveries;
    await this.families.currentRow.save();
    if (this.delivery)
      this.delivery._.reload();


    this.dialogRef.close();
    if (this.args && this.args.onSave)
      this.args.onSave();

  }
  async newDelivery() {
    if (this.delivery && this.delivery.wasChanged())
      this.delivery.save();
    await this.args.family.showNewDeliveryDialog(this.dialog, this.settings, this.busy, {
      copyFrom: this.delivery,
      aDeliveryWasAdded: async (id) => {
        if (this.delivery)
          this.refreshDeliveryStatistics = true;
        this.delivery = await this.context.for(ActiveFamilyDeliveries).findId(id);
      }
    });
  }
  showNewDelivery() {
    return this.delivery && this.delivery.deliverStatus.IsAResultStatus();
  }



  families = new GridSettings(this.context.for(Families), { allowUpdate: true });

  delivery: ActiveFamilyDeliveries;

  async showDuplicate(dup: duplicateFamilyInfo) {
    let f = await this.context.for(Families).findId(dup.id);
    openDialog(UpdateFamilyDialogComponent, x => x.args = { family: f });
  }
  displayDupInfo(info: duplicateFamilyInfo) {
    return displayDupInfo(info, this.context);
  }


  familiesInfo = new DataAreaSettings<Families>();
  familiesAddress = new DataAreaSettings<Families>();
  phones = new DataAreaSettings<Families>();
  callInfo = new DataAreaSettings<Families>();
  deliverInfo = new DataAreaSettings();
  extraFamilyInfo = new DataAreaSettings<Families>();
  extraFamilyInfo2 = new DataAreaSettings<Families>();
  deliveryDefaults = new DataAreaSettings<Families>();
  familyDeliveries: GridSettings<FamilyDeliveries>;
  onMapLocation: Location;
  showOnMap() {
    if (!this.onMapLocation)
      this.onMapLocation = this.families.currentRow.addressHelper.location();
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
  async ngOnInit() {
    if (!this.args.familyDelivery) {
      if (this.args.deliveryId) {
        this.args.familyDelivery = await this.context.for(FamilyDeliveries).findFirst(x => x.id.isEqualTo(this.args.deliveryId));
        this.args.familyId = this.args.familyDelivery.family;
      }

    }
    if (!this.args.family) {
      if (this.args.familyDelivery) {
        this.args.familyId = this.args.familyDelivery.family;
      }
      if (this.args.familyId)
        this.args.family = await this.context.for(Families).findFirst(x => x.id.isEqualTo(this.args.familyId));
    }
    if (this.args.familyDelivery)
      this.delivery = this.args.familyDelivery;
    if (this.args.userCanUpdateButDontSave)
      this.args.disableSave = true;


    this.families.currentRow = this.args.family;


    this.familiesInfo = this.families.addArea({
      fields: families => [
        families.name
      ],
    });
    this.extraFamilyInfo = this.families.addArea({
      fields: families => [
        families.groups,
        [families.status, families.familyMembers]

      ]
    });
    this.extraFamilyInfo2 = this.families.addArea({
      fields: families => [
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


        [families.birthDate, {
          caption: 'גיל',
          getValue: (f) => {
            if (!f.birthDate) {
              return '';
            }
            return Math.round((new Date().valueOf() - f.birthDate.valueOf()) / (365 * 86400000))
          }
        }],
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
          f.special
        ].filter(x => this.settings.usingSelfPickupModule ? true : x != f.defaultSelfPickup)
    });
    if (this.delivery) {
      this.deliverInfo = new DataAreaSettings(this.delivery.deilveryDetailsAreaSettings(this.dialog));


    }
    if (!this.families.currentRow.isNew())
      this.familyDeliveries = await this.args.family.deliveriesGridSettings({
        settings: this.settings,
        dialog: this.dialog,
        busy: this.busy
      });

  }

  sendWhatsApp() {
    sendWhatsappToFamily(this.args.family, this.context);
  }
  canSendWhatsApp() {
    return canSendWhatsapp(this.args.family);

  }
}
