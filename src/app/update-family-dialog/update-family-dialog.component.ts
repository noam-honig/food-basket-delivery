import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MatDialogActions } from '@angular/material/dialog';
import { Families, duplicateFamilyInfo, displayDupInfo } from '../families/families';

import { Context, DialogConfig, DataControlSettings, DataAreaSettings, GridSettings, StringColumn, ServerFunction, ServerContext } from '@remult/core';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyDeliveryStats } from '../family-deliveries/family-deliveries-stats';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { PreviewFamilyComponent } from '../preview-family/preview-family.component';
import { DialogService } from '../select-popup/dialog';
import { wasChanged } from '../model-shared/types';
import { UpdateCommentComponent } from '../update-comment/update-comment.component';
import { Helpers } from '../helpers/helpers';
import { Roles } from '../auth/roles';
import { SendSmsAction, SendSmsUtils } from '../asign-family/send-sms-action';
import { Sites } from '../sites/sites';
import { async } from '@angular/core/testing';

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
    userCanUpdateButDontSave?: boolean,
    onSave?: () => void
  };
  constructor(
    private dialogRef: MatDialogRef<any>,

    private context: Context,
    public settings: ApplicationSettings,
    private dialog: DialogService

  ) {

  }
  async sendSmsToCourier() {
    let h = await this.context.for(Helpers).findId(this.args.familyDelivery.courier);
    let phone = h.phone.value;
    if (phone.startsWith('0')) {
      phone = '972' + phone.substr(1);
    }
    await this.context.openDialog(UpdateCommentComponent, x => x.args = {
      helpText: () => new StringColumn(),
      ok: async (comment) => {
        try {
          await UpdateFamilyDialogComponent.SendCustomMessageToCourier(this.args.familyDelivery.courier.value, comment);
          this.dialog.Info("הודעה נשלחה");
        }
        catch (err) {
          this.dialog.exception("שליחת הודעה למתנדב ", err);
        }
      },
      cancel: () => { },
      hideLocation: true,
      title: 'שלח הודעת ל' + h.name.value,
      family: this.args.familyDelivery,
      comment: 'שלום ' + h.name.value + '\nבקשר למשפחת "' + this.args.familyDelivery.name.value + '" מ "' + this.args.familyDelivery.address.value + '"\n'
    });
  }
  @ServerFunction({ allowed: Roles.admin })
  static async SendCustomMessageToCourier(courier: string, message: string, context?: ServerContext) {
    let h = await context.for(Helpers).findId(courier);
    await new SendSmsUtils().sendSms(h.phone.value, await SendSmsAction.getSenderPhone(context), message, context.getOrigin(), Sites.getOrganizationFromContext(context), await ApplicationSettings.getAsync(context));

  }
  preview() {
    let fd = this.args.familyDelivery;
    if (!fd)
      fd = this.args.family.createDelivery(this.dialog.distCenter.value);
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
  refreshDeliveryStatistics = false;
  cancel() {
    if (!this.args.userCanUpdateButDontSave)
      this.families.currentRow.undoChanges();
    this.dialogRef.close();
  }
  async confirm() {
    await this.families.currentRow.save();
    if (this.delivery) {
      let d = this.delivery;
      if (d.changeRequireStatsRefresh())
        this.refreshDeliveryStatistics = true;

      await this.delivery.save();
    }
    this.dialogRef.close();
    if (this.args && this.args.onSave)
      this.args.onSave();
  }
  async newDelivery() {
    if (this.delivery && this.delivery.wasChanged())
      this.delivery.save();
    await this.args.family.showNewDeliveryDialog(this.dialog, this.settings, this.delivery, async (id) => {
      if (this.delivery)
        this.refreshDeliveryStatistics = true;
      this.delivery = await this.context.for(ActiveFamilyDeliveries).findId(id);

    });
  }
  showNewDelivery() {
    return this.delivery && DeliveryStatus.IsAResultStatus(this.delivery.deliverStatus.value);
  }



  families = this.context.for(Families).gridSettings({ allowUpdate: true });

  delivery: ActiveFamilyDeliveries;

  async showDuplicate(dup: duplicateFamilyInfo) {
    let f = await this.context.for(Families).findId(dup.id);
    this.context.openDialog(UpdateFamilyDialogComponent, x => x.args = { family: f });
  }
  displayDupInfo(info: duplicateFamilyInfo) {
    return displayDupInfo(info, this.context);
  }


  familiesInfo = new DataAreaSettings<Families>();
  familiesAddress = new DataAreaSettings<Families>();
  phones = new DataAreaSettings<Families>();
  callInfo = new DataAreaSettings<Families>();
  deliverInfo = new DataAreaSettings<Families>();
  extraFamilyInfo = new DataAreaSettings<Families>();
  deliveryDefaults = new DataAreaSettings<Families>();
  familyDeliveries: GridSettings<FamilyDeliveries>;
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
    if (this.args.userCanUpdateButDontSave)
      this.args.disableSave = true;


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
        families.iDinExcel
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
    if (this.delivery) {
      this.deliverInfo = new DataAreaSettings(this.delivery.deilveryDetailsAreaSettings(this.dialog));


    }
    if (!this.families.currentRow.isNew())
      this.familyDeliveries = this.args.family.deliveriesGridSettings();

  }



}
