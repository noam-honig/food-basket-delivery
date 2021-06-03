import { DeliveryStatus } from "./DeliveryStatus";
import { YesNo } from "./YesNo";

import { FamilySourceId } from "./FamilySources";
import { BasketTypeId, QuantityColumn } from "./BasketType";
import { SqlBuilder, delayWhileTyping, Email, ChangeDateColumn, SqlFor } from "../model-shared/types";
import { Phone } from "../model-shared/Phone";
import { Column, Context, ServerFunction, StoreAsStringValueConverter, IdEntity, SqlDatabase, Filter, Entity, Validators, DateOnlyValueConverter, Storable, DecimalValueConverter, ColumnDefinitions, ColumnDefinitionsOf, EntityDefinitions } from '@remult/core';
import { BusyService, DataArealColumnSetting, DataControl, DataControlSettings, GridSettings, InputControl, openDialog, SelectValueDialogComponent } from '@remult/angular';

import { currentUser, HelperId, Helpers,  HelpersBase } from "../helpers/helpers";

import { GeocodeInformation, GetGeoInformation, leaveOnlyNumericChars, isGpsAddress, GeocodeResult, AddressHelper } from "../shared/googleApiHelpers";
import { ApplicationSettings, CustomColumn, customColumnInfo } from "../manage/ApplicationSettings";

import * as fetch from 'node-fetch';
import { Roles } from "../auth/roles";

import { use } from "../translate";
import { FamilyStatus } from "./FamilyStatus";

import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { DialogService } from "../select-popup/dialog";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";


import { YesNoQuestionComponent } from "../select-popup/yes-no-question/yes-no-question.component";
import { allCentersToken, DistributionCenterId, findClosestDistCenter } from "../manage/distribution-centers";
import { getLang } from "../sites/sites";




var FamilyDeliveries: factoryFor<import("./FamilyDeliveries").FamilyDeliveries>;

var ActiveFamilyDeliveries: factoryFor<import("./FamilyDeliveries").ActiveFamilyDeliveries>;

export function iniFamilyDeliveriesInFamiliesCode(
  fd: factoryFor<import("./FamilyDeliveries").FamilyDeliveries>,
  activeFd: factoryFor<import("./FamilyDeliveries").ActiveFamilyDeliveries>) {
  FamilyDeliveries = fd;
  ActiveFamilyDeliveries = activeFd;
}

declare type factoryFor<T> = {
  new(...args: any[]): T;
}

@Storable<GroupsValue>({
  valueConverter: () => new StoreAsStringValueConverter(x => x.value, x => new GroupsValue(x)),
  caption: use.language.familyGroup,
})
@DataControl<any, GroupsValue>({
  forceEqualFilter: false,
  width: '300',
  click: async (row, col) => {
    openDialog((await import('../update-group-dialog/update-group-dialog.component')).UpdateGroupDialogComponent, s => {
      s.init({
        groups: col.value.value,
        ok: x => col.value = new GroupsValue(x)
      })
    });
  }

})
export class GroupsValue {
  replace(val: string) {
    this.value = val;
  }
  constructor(private value: string) {

  }
  evilGet() {
    return this.value;
  }
  listGroups() {
    if (!this.value)
      return [];
    return this.value.split(',');
  }
  removeGroup(group: string) {
    let groups = this.value.split(",").map(x => x.trim());
    let index = groups.indexOf(group);
    if (index >= 0) {
      groups.splice(index, 1);
      this.value = groups.join(", ");
    }
  }
  addGroup(group: string) {
    if (this.value)
      this.value += ', ';
    else
      this.value = '';
    this.value += group;
  }
  selected(group: string) {
    if (!this.value)
      return false;
    return this.value.indexOf(group) >= 0;
  }

}

@Entity<Families>(
  {
    key: "Families",
    caption: use.language.deliveries,
    allowApiRead: Roles.admin,
    allowApiUpdate: Roles.admin,
    allowApiDelete: false,
    allowApiInsert: Roles.admin,
    apiDataFilter: (self, context) => {
      if (!context.isAllowed(Roles.admin)) {
        if (context.isAllowed(Roles.admin))
          return undefined;
        return self.id.isEqualTo('no rows');
      }
    },
    saving: async (self) => {
      if (self.disableOnSavingRow)
        return;
      if (self.context.onServer) {
        if (!self.quantity || self.quantity < 1)
          self.quantity = 1;
        if (self.$.area.wasChanged() && self.area)
          self.area = self.area.trim();



        if (self.$.address.wasChanged() || !self.addressHelper.ok() || self.autoCompleteResult) {
          await self.reloadGeoCoding();
        }
        if (self.isNew()) {
          self.createDate = new Date();
          self.createUser = self.context.get(currentUser);
        }
        if (self.$.status.wasChanged()) {
          self.statusDate = new Date();
          self.statusUser = self.context.get(currentUser);
        }

        if (!self._suppressLastUpdateDuringSchemaInit) {
          self.lastUpdateDate = new Date();
          self.lastUpdateUser = self.context.get(currentUser);
        }



        if (self.sharedColumns().find(x => x.value != x.originalValue) || [self.$.basketType, self.$.quantity, self.$.deliveryComments, self.$.defaultSelfPickup].find(x => x.wasChanged())) {
          for await (const fd of await self.context.for(FamilyDeliveries).find({
            where: fd =>
              fd.family.isEqualTo(self.id).and(
                fd.archive.isEqualTo(false).and(
                  DeliveryStatus.isNotAResultStatus(fd.deliverStatus)
                ))
          })) {
            self.updateDelivery(fd);
            if (self.$.basketType.wasChanged() && fd.basketType == self.$.basketType.originalValue)
              fd.basketType = self.basketType;
            if (self.$.quantity.wasChanged() && fd.quantity == self.$.quantity.originalValue)
              fd.quantity = self.quantity;
            if (self.$.deliveryComments.wasChanged() && fd.deliveryComments == self.$.deliveryComments.originalValue)
              fd.deliveryComments = self.deliveryComments;
            if (self.$.fixedCourier.wasChanged() && fd.courier == self.$.fixedCourier.originalValue)
              fd.courier = self.fixedCourier;
            if (self.$.defaultSelfPickup.wasChanged())
              if (self.defaultSelfPickup)
                if (fd.deliverStatus == DeliveryStatus.ReadyForDelivery)
                  fd.deliverStatus = DeliveryStatus.SelfPickup;
                else if (fd.deliverStatus == DeliveryStatus.SelfPickup)
                  fd.deliverStatus = DeliveryStatus.ReadyForDelivery;
            await fd.save();
          }
        }

      }
      else if (!self.context.onServer) {
        let statusChangedOutOfActive = self.$.status.wasChanged() && self.status != FamilyStatus.Active;
        if (statusChangedOutOfActive) {
          let activeDeliveries = self.context.for(ActiveFamilyDeliveries).iterate({ where: fd => fd.family.isEqualTo(self.id).and(DeliveryStatus.isNotAResultStatus(fd.deliverStatus)) });
          if (await activeDeliveries.count() > 0) {
            if (await openDialog(YesNoQuestionComponent, async x => x.args = {
              question: getLang(self.context).thisFamilyHas + " " + (await activeDeliveries.count()) + " " + getLang(self.context).deliveries_ShouldWeDeleteThem
            }, y => y.yes)) {
              for await (const d of activeDeliveries) {
                await d.delete();

              }
            }
          }
        }
      }
    }
  })
export class Families extends IdEntity {
  @ServerFunction({ allowed: Roles.admin })
  static async getDefaultVolunteers(context?: Context, db?: SqlDatabase) {
    var sql = new SqlBuilder();
    let f = SqlFor(context.for(Families));
    let r = await db.execute(sql.query({
      from: f,
      select: () => [f.fixedCourier, 'count (*) as count'],
      where: () => [f.status.isEqualTo(FamilyStatus.Active)],
      groupBy: () => [f.fixedCourier],
      orderBy: [{ column: f.fixedCourier, isDescending: false }]

    }));
    let result = r.rows.map(x => ({
      id: x.fixedcourier,
      name: '',
      count: x.count
    }));
    for (const r of result) {
      let h = await context.for(Helpers).findId(r.id);
      if (h)
        r.name = h.name;
    }
    return result;
  }
  async showFamilyDialog(tools?: { onSave?: () => Promise<void>, focusOnAddress?: boolean }) {
    openDialog((await import("../update-family-dialog/update-family-dialog.component")).UpdateFamilyDialogComponent, x => x.args = {
      family: this,
      focusOnAddress: tools && tools.focusOnAddress,
      onSave: async () => {
        if (tools && tools.onSave)
          await tools.onSave();
      }
    });
  }
  async showDeliveryHistoryDialog(args: { dialog: DialogService, settings: ApplicationSettings, busy: BusyService }) {
    let gridDialogSettings = await this.deliveriesGridSettings(args);
    openDialog(GridDialogComponent, x => x.args = {
      title: getLang(this.context).deliveriesFor + ' ' + this.name,
      stateName: 'deliveries-for-family',
      settings: gridDialogSettings,
      buttons: [{
        text: use.language.newDelivery,

        click: () => this.showNewDeliveryDialog(args.dialog, args.settings, args.busy, { doNotCheckIfHasExistingDeliveries: true })
      }]
    });
  }
  public async deliveriesGridSettings(args: { dialog: DialogService, settings: ApplicationSettings, busy: BusyService }) {
    let result = new GridSettings(this.context.for(FamilyDeliveries), {
      numOfColumnsInGrid: 7,

      rowCssClass: fd => fd.deliverStatus.getCss(),
      gridButtons: [{
        name: use.language.newDelivery,
        icon: 'add_shopping_cart',
        click: () => this.showNewDeliveryDialog(args.dialog, args.settings, args.busy, { doNotCheckIfHasExistingDeliveries: true })
      }],
      rowButtons: [
        {
          name: use.language.deliveryDetails,
          click: async fd => fd.showDeliveryOnlyDetail({
            dialog: args.dialog,
            refreshDeliveryStats: () => result.reloadData()
          })
        },
        ...(await import("../family-deliveries/family-deliveries.component")).getDeliveryGridButtons({
          context: this.context,
          refresh: () => result.reloadData(),
          deliveries: () => result,
          dialog: args.dialog,
          settings: args.settings,
          busy: args.busy

        })
      ],
      columnSettings: fd => {
        let r: ColumnDefinitions[] = [
          fd.deliverStatus,
          fd.deliveryStatusDate,
          fd.basketType,
          fd.quantity,
          fd.courier,
          fd.deliveryComments,
          fd.courierComments,
          fd.internalDeliveryComment,
          fd.distributionCenter
        ];
        r.push(...[...fd].filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.caption.localeCompare(b.caption)));
        return r;
      },

      where: fd => fd.family.isEqualTo(this.id),
      orderBy: fd => fd.deliveryStatusDate.descending(),
      rowsInPage: 25

    });
    return result;
  }

  async showNewDeliveryDialog(dialog: DialogService, settings: ApplicationSettings, busy: BusyService, args?: {
    copyFrom?: import("./FamilyDeliveries").FamilyDeliveries,
    aDeliveryWasAdded?: (newDeliveryId: string) => Promise<void>,
    doNotCheckIfHasExistingDeliveries?: boolean
  }) {
    if (!args)
      args = {};
    if (!args.doNotCheckIfHasExistingDeliveries) {
      let hasExisting = await this.context.for(ActiveFamilyDeliveries).count(d => d.family.isEqualTo(this.id).and(DeliveryStatus.isNotAResultStatus(d.deliverStatus)));
      if (hasExisting > 0) {
        if (await dialog.YesNoPromise(settings.lang.familyHasExistingDeliveriesDoYouWantToViewThem)) {
          this.showDeliveryHistoryDialog({ dialog, settings, busy });
          return;
        }
      }
    }

    let newDelivery = this.createDelivery(await (await dialog.getDistCenter(this.addressHelper.location())).evilGetId());
    let arciveCurrentDelivery = new InputControl<boolean>({
      caption: getLang(this.context).archiveCurrentDelivery,
      defaultValue: () => true
    });
    if (args.copyFrom != undefined) {
      newDelivery.copyFrom(args.copyFrom);

    }
    let selfPickup = new InputControl<boolean>({
      caption: getLang(this.context).familySelfPickup,
      defaultValue: () => this.defaultSelfPickup
    });
    if (args.copyFrom) {
      selfPickup.value = args.copyFrom.deliverStatus == DeliveryStatus.SuccessPickedUp;
      if (args.copyFrom.deliverStatus.isProblem)
        newDelivery.courier = null;
    }


    await openDialog(InputAreaComponent, x => {
      x.args = {
        settings: {
          columnSettings: () => {
            let r: DataArealColumnSetting<any>[] = [
              [newDelivery.$.basketType,
              newDelivery.$.quantity],
              newDelivery.$.deliveryComments];
            if (dialog.hasManyCenters)
              r.push(newDelivery.$.distributionCenter);
            r.push(newDelivery.$.courier);
            if (args.copyFrom != null && args.copyFrom.deliverStatus.IsAResultStatus()) {
              r.push(arciveCurrentDelivery);
            }
            r.push({ column: selfPickup, visible: () => settings.usingSelfPickupModule })

            return r;
          }
        },
        title: getLang(this.context).newDeliveryFor + this.name,
        validate: async () => {
          let count = await newDelivery.duplicateCount();
          if (count > 0) {
            if (await dialog.YesNoPromise(getLang(this.context).familyAlreadyHasAnActiveDelivery)) {
              return;
            }
            else {
              throw getLang(this.context).notOk;
            }
          }
        },
        ok: async () => {
          let newId = await Families.addDelivery(newDelivery.family, {
            basketType: newDelivery.basketType.evilGetId(),
            quantity: newDelivery.quantity,
            comment: newDelivery.deliveryComments,
            courier: HelperId.toJson(newDelivery.courier),
            distCenter: newDelivery.distributionCenter.evilGetId(),
            selfPickup: selfPickup.value

          });
          if (args.copyFrom != null && args.copyFrom.deliverStatus.IsAResultStatus() && arciveCurrentDelivery.value) {
            args.copyFrom.archive = true;
            await args.copyFrom.save();
          }
          if (args.aDeliveryWasAdded)
            await args.aDeliveryWasAdded(newId);
          dialog.Info(getLang(this.context).deliveryCreatedSuccesfully);
        }
        , cancel: () => { }

      }
    });
  }
  @ServerFunction({ allowed: Roles.admin })
  static async addDelivery(familyId: string, settings: {
    basketType: string,
    quantity: number,
    comment: string,
    distCenter: string,
    courier: string,
    selfPickup: boolean,
    deliverStatus?: DeliveryStatus,
    archive?: boolean
  }, context?: Context) {
    let f = await context.for(Families).findId(familyId);
    if (f) {
      if (settings.distCenter == allCentersToken)
        settings.distCenter = await (await findClosestDistCenter(f.addressHelper.location(), context)).evilGetId();
      let fd = f.createDelivery(settings.distCenter);
      fd.basketType = new BasketTypeId(settings.basketType, context);
      fd.quantity = settings.quantity;
      fd.deliveryComments = settings.comment;
      fd.distributionCenter = new DistributionCenterId(settings.distCenter, context);
      fd.courier = await HelperId.fromJson(settings.courier, context);
      if (settings.deliverStatus) fd.deliverStatus = settings.deliverStatus;
      if (settings.archive) fd.archive = settings.archive;
      if (settings.selfPickup)
        fd.deliverStatus = DeliveryStatus.SelfPickup;

      await fd.save();
      return fd.id;
    }
    throw getLang(context).familyWasNotFound;

  }
  createDelivery(distCenter: string) {
    let fd = this.context.for(FamilyDeliveries).create();
    fd.family = this.id;
    fd.distributionCenter = new DistributionCenterId(distCenter, this.context);
    fd.special = this.special;
    fd.basketType = this.basketType;
    fd.quantity = this.quantity;
    fd.deliveryComments = this.deliveryComments;
    fd.courier = this.fixedCourier;
    fd.deliverStatus = this.defaultSelfPickup ? DeliveryStatus.SelfPickup : DeliveryStatus.ReadyForDelivery;
    this.updateDelivery(fd);
    return fd;
  }
  sharedColumns() {
    return [
      this.$.name,
      this.$.familySource,
      this.$.groups,
      this.$.address,
      this.$.floor,
      this.$.appartment,
      this.$.entrance,
      this.$.buildingCode,
      this.$.city,
      this.$.area,
      this.$.addressComment,//
      this.$.addressLongitude,
      this.$.addressLatitude,
      this.$.drivingLongitude,
      this.$.drivingLatitude,
      this.$.addressByGoogle,
      this.$.addressOk,
      this.$.phone1,
      this.$.phone1Description,
      this.$.phone2,
      this.$.phone2Description,
      this.$.phone3,
      this.$.phone3Description,
      this.$.phone4,
      this.$.phone4Description,
      this.$.fixedCourier,
      this.$.familyMembers
    ];
  }
  isGpsAddress() {
    return isGpsAddress(this.address);
  }
  getAddressDescription() {
    if (this.isGpsAddress()) {
      return getLang(this.context).gpsLocationNear + ' ' + this.addressByGoogle;

    }
    return this.address;
  }
  updateDelivery(fd: import("./FamilyDeliveries").FamilyDeliveries) {
    fd.family = this.id;
    for (const col of this.sharedColumns()) {
      fd.$[col.defs.key].value = col.value;
    }
  }

  __disableGeocoding = false;

  constructor(private context: Context) {
    super();
  }
  disableChangeLogging = false;
  disableOnSavingRow = false;
  _suppressLastUpdateDuringSchemaInit = false;

  @Column({
    caption: use.language.familyName,
    //valueChange: () => this.delayCheckDuplicateFamilies(),
    validate: Validators.required.withMessage(use.language.nameIsTooShort)
  })
  name: string;


  @Column({
    caption: use.language.socialSecurityNumber,
    //    valueChange: () => this.delayCheckDuplicateFamilies()
  })
  tz: string;
  @Column({
    caption: use.language.spouceSocialSecurityNumber,
    //valueChange: () => this.delayCheckDuplicateFamilies()
  })
  tz2: string;
  @Column({ caption: use.language.familyMembers })
  familyMembers: number;
  @Column({ caption: use.language.birthDate, valueConverter: () => DateOnlyValueConverter })
  birthDate: Date;
  @Column<Families>({
    caption: use.language.nextBirthDay,
    sqlExpression: () => "(select cast(birthDate + ((extract(year from age(birthDate)) + 1) * interval '1' year) as date) as nextBirthday)",
    allowApiUpdate: false,
    valueConverter: () => DateOnlyValueConverter,
    displayValue: self => {
      if (!self.nextBirthday)
        return '';
      return self.$.nextBirthday.displayValue + " - " + use.language.age + " " + (self.nextBirthday.getFullYear() - self.birthDate.getFullYear())
    }
  })

  nextBirthday: Date
  @Column({ caption: use.language.defaultBasketType })
  basketType: BasketTypeId;
  @Column({ caption: use.language.defaultQuantity, allowApiUpdate: Roles.admin })
  quantity: number;
  @Column({ includeInApi: true, caption: use.language.familySource })
  familySource: FamilySourceId;
  @Column({ caption: use.language.familyHelpContact })
  socialWorker: string;
  @Column({ caption: use.language.familyHelpPhone1 })
  socialWorkerPhone1: Phone;
  @Column({ caption: use.language.familyHelpPhone2 })
  socialWorkerPhone2: Phone;
  @Column()
  groups: GroupsValue;
  @Column({ caption: use.language.specialAsignment })
  special: YesNo;
  @Column({ caption: use.language.defaultSelfPickup })
  defaultSelfPickup: boolean;
  @Column({ caption: use.language.familyUniqueId })
  iDinExcel: string;
  @Column({ caption: use.language.internalComment })
  internalComment: string;
  @Column()
  addressApiResult: string;

  @Column({
    caption: use.language.address,
    // valueChange: () => {
    //   if (!this.address.value)
    //     return;
    //   let y = parseUrlInAddress(this.address.value);
    //   if (y != this.address.value)
    //     this.address.value = y;
    // }
  })
  address: string;
  addressHelper = new AddressHelper(this.context, () => this.$.address, () => this.$.addressApiResult);


  @Column({ caption: use.language.floor })
  floor: string;
  @Column({ caption: use.language.appartment })
  appartment: string;
  @Column({ caption: use.language.entrance })
  entrance: string;
  @Column({ caption: use.language.buildingCode })
  buildingCode: string;
  @Column({ caption: use.language.cityAutomaticallyUpdatedByGoogle })
  city: string;
  @AreaColumn()
  area: string;
  @Column({ caption: use.language.addressComment })
  addressComment: string;
  @Column({ caption: use.language.postalCode })
  postalCode: number;
  @Column({ caption: use.language.defaultDeliveryComment })
  deliveryComments: string;
  @Column({
    caption: use.language.phone1, dbName: 'phone',
    //valueChange: () => this.delayCheckDuplicateFamilies()
  })
  phone1: Phone;
  @Column({ caption: use.language.phone1Description })
  phone1Description: string;
  @Column({
    caption: use.language.phone2,
    //valueChange: () => this.delayCheckDuplicateFamilies()
  })
  phone2: Phone;
  @Column({ caption: use.language.phone2Description })
  phone2Description: string;
  @Column({
    caption: use.language.phone3,
    //valueChange: () => this.delayCheckDuplicateFamilies()
  })
  phone3: Phone;
  @Column({ caption: use.language.phone3Description })
  phone3Description: string;
  @Column({
    caption: use.language.phone4,
    //valueChange: () => this.delayCheckDuplicateFamilies()
  })
  phone4: Phone;
  @Column({ caption: use.language.phone4Description })
  phone4Description: string;
  @Column()
  email: Email;
  @Column()
  status: FamilyStatus;
  @ChangeDateColumn({ caption: use.language.statusChangeDate })
  statusDate: Date;
  @Column({ caption: use.language.statusChangeUser, allowApiUpdate: false })
  statusUser: Helpers;
  @Column({ caption: use.language.defaultVolunteer })
  @DataControl<Families, HelpersBase>({
    click: async (e, col) => {
      openDialog((await import("../select-helper/select-helper.component")).SelectHelperComponent, x => x.args = {
        searchClosestDefaultFamily: true,
        location: e.addressHelper.location(),
        onSelect: async selected => col.value = selected
      });
    }
  })
  fixedCourier: HelpersBase;
  @CustomColumn(() => customColumnInfo[1])
  custom1: string;
  @CustomColumn(() => customColumnInfo[2])
  custom2: string;
  @CustomColumn(() => customColumnInfo[3])
  custom3: string;
  @CustomColumn(() => customColumnInfo[4])
  custom4: string;


  async reloadGeoCoding() {

    let geo: GeocodeInformation;

    if (this.autoCompleteResult) {
      let result: autocompleteResult = JSON.parse(this.autoCompleteResult);
      if (result.address == this.address)
        geo = new GeocodeInformation(result.result);
    }
    if (geo == undefined && !this.__disableGeocoding)
      geo = await GetGeoInformation(this.address, this.context);
    if (geo == undefined) {
      geo = new GeocodeInformation();
    }
    this.addressApiResult = geo.saveToString();
    this.city = '';
    if (geo.ok()) {
      this.city = geo.getCity();
      await this.setPostalCodeServerOnly();
    }
    this.addressOk = !geo.partialMatch();
    this.addressByGoogle = geo.getAddress();
    this.addressLongitude = geo.location().lng;
    this.addressLatitude = geo.location().lat;
    this.drivingLatitude = this.addressLatitude;
    this.drivingLongitude = this.addressLongitude;
    if (isGpsAddress(this.address)) {
      var j = this.address.split(',');
      this.addressLatitude = +j[0];
      this.addressLongitude = +j[1];
    }
  }

  async setPostalCodeServerOnly() {
    if (!process.env.AUTO_POSTAL_CODE)
      return;
    var geo = this.addressHelper.getGeocodeInformation();
    var house = '';
    var streen = '';
    var location = '';
    for (const c of geo.info.results[0].address_components) {
      switch (c.types[0]) {
        case "street_number":
          house = c.long_name;
          break;
        case "route":
          streen = c.long_name;
          break;
        case "locality":
          location = c.long_name;
          break;
      }
    }
    try {
      let r = await (await fetch.default('https://www.zipy.co.il/findzip', {
        method: 'post',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: 'location=' + encodeURI(location) + '&street=' + encodeURI(streen) + '&house=' + encodeURI(house) + '&entrance=&pob='
      })).json();
      if (r.errors == 0 && r.zip) {
        this.postalCode = +r.zip;
      }
    }
    catch (err) {
      console.log(err);
    }
  }


  @Column({
    caption: use.language.previousDeliveryStatus,
    sqlExpression: (self, context) => {
      return dbNameFromLastDelivery(self, context, fde => fde.deliverStatus, "prevStatus");
    }
  })
  previousDeliveryStatus: DeliveryStatus;
  @ChangeDateColumn({
    caption: use.language.previousDeliveryDate,

    sqlExpression: (self, context) => {
      return dbNameFromLastDelivery(self, context, fde => fde.deliveryStatusDate, "prevDate");
    }
  })
  previousDeliveryDate: Date;
  @Column<Families>({
    caption: use.language.previousDeliveryNotes,
    sqlExpression: (self, context) => {
      return dbNameFromLastDelivery(self, context, fde => fde.courierComments, "prevComment");
    }
  })
  previousDeliveryComment: string;
  @Column({
    caption: use.language.numOfActiveReadyDeliveries,
    sqlExpression: (selfDefs, context) => {
      let self = SqlFor(selfDefs);
      let fd = SqlFor(context.for(FamilyDeliveries));
      let sql = new SqlBuilder();
      return sql.columnCount(self, {
        from: fd,
        where: () => [sql.eq(fd.family, self.id),
        fd.archive.isEqualTo(false).and(DeliveryStatus.isNotAResultStatus(fd.deliverStatus))]
      });

    }
  })
  numOfActiveReadyDeliveries: number;
  @Column({ valueConverter: () => DecimalValueConverter })
  //שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
  addressLongitude: number;
  @Column({ valueConverter: () => DecimalValueConverter })
  addressLatitude: number;
  @Column({ valueConverter: () => DecimalValueConverter })
  //זו התוצאה שחזרה מהGEOCODING כך שהיא מכוונת לכביש הקרוב
  drivingLongitude: number;
  @Column({ valueConverter: () => DecimalValueConverter })
  drivingLatitude: number;
  @Column({ caption: use.language.addressByGoogle, allowApiUpdate: false })
  addressByGoogle: string;
  @Column({ serverExpression: () => '' })
  autoCompleteResult: string;
  @Column({ caption: use.language.addressOk })
  addressOk: boolean;





  static getPreviousDeliveryColumn(self: ColumnDefinitionsOf<Families>) {
    return {
      caption: use.language.previousDeliverySummary,
      readonly: true,
      column: self.previousDeliveryStatus,
      dropDown: {
        items: DeliveryStatus.converter.getOptions()
      },
      getValue: f => {
        if (!f.previousDeliveryStatus)
          return '';
        let r = f.previousDeliveryStatus.caption;
        if (f.previousDeliveryComment) {
          r += ': ' + f.previousDeliveryComment
        }
        return r;
      },
      cssClass: f => f.previousDeliveryStatus.getCss()


    } as DataControlSettings<Families>;
  }





  @ChangeDateColumn({ caption: use.language.createDate })
  createDate: Date;
  @Column({ allowApiUpdate: false, caption: use.language.createUser })
  createUser: HelpersBase;
  @ChangeDateColumn({ caption: use.language.lastUpdateDate })
  lastUpdateDate: Date;
  @Column({ allowApiUpdate: false, caption: use.language.lastUpdateUser })
  lastUpdateUser: HelpersBase;





  openWaze() {

    //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + 'export &navigate=yes', '_blank');
    window.open('waze://?ll=' + this.addressHelper.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address) + '&navigate=yes');
  }
  openGoogleMaps() {
    window.open('https://www.google.com/maps/search/?api=1&hl=' + getLang(this.context).languageCode + '&query=' + this.address, '_blank');
  }
  showOnGoogleMaps() {
    window.open('https://maps.google.com/maps?q=' + this.addressHelper.getGeocodeInformation().getlonglat() + '&hl=' + getLang(this.context).languageCode, '_blank');
  }
  showOnGovMap() {
    window.open('https://www.govmap.gov.il/?q=' + this.address + '&z=10', '_blank');
  }





  static SendMessageToBrowsers = (s: string, context: Context, distCenter: string) => { };
  static GetUpdateMessage(n: FamilyUpdateInfo, updateType: number, courierName: string, context: Context) {
    switch (updateType) {
      case 1:
        switch (n.deliverStatus) {
          case DeliveryStatus.ReadyForDelivery:
            break;
          case DeliveryStatus.Success:
          case DeliveryStatus.SuccessLeftThere:
          case DeliveryStatus.FailedBadAddress:
          case DeliveryStatus.FailedNotHome:
          case DeliveryStatus.FailedDoNotWant:
          case DeliveryStatus.FailedNotReady:
          case DeliveryStatus.FailedTooFar:
          case DeliveryStatus.FailedOther:
            let duration = '';
            if (n.courierAssingTime && n.deliveryStatusDate)
              duration = ' ' + getLang(context).within + ' ' + Math.round((n.deliveryStatusDate.valueOf() - n.courierAssingTime.valueOf()) / 60000) + " " + getLang(context).minutes;
            return n.deliverStatus.caption + (n.courierComments ? ", \"" + n.courierComments + "\" - " : '') + ' ' + getLang(context).forFamily + ' ' + n.name + ' ' + (courierName ? (getLang(context).by + ' ' + courierName) : '') + duration + "!";
        }
        return getLang(context).theFamily + ' ' + n.name + ' ' + getLang(context).wasUpdatedTo + ' ' + n.deliverStatus.caption;
      case 2:
        if (n.courier)
          return getLang(context).theFamily + ' ' + n.name + ' ' + getLang(context).wasAssignedTo + ' ' + courierName;
        else
          return getLang(context).assignmentCanceledFor + " " + n.name;
    }
    return n.deliverStatus.caption;
  }
  tzDelay: delayWhileTyping;
  private delayCheckDuplicateFamilies() {
    if (this._disableAutoDuplicateCheck)
      return;
    if (this.context.onServer)
      return;
    if (!this.tzDelay)
      this.tzDelay = new delayWhileTyping(1000);
    this.tzDelay.do(async () => {
      this.checkDuplicateFamilies();

    });

  }
  @ServerFunction({ allowed: Roles.admin })
  static async getAreas(context?: Context, db?: SqlDatabase): Promise<{ area: string, count: number }[]> {
    var sql = new SqlBuilder();
    let f = SqlFor(context.for(Families));
    let r = await db.execute(sql.query({
      from: f,
      select: () => [f.area, 'count (*) as count'],
      where: () => [f.status.isEqualTo(FamilyStatus.Active)],
      groupBy: () => [f.area],
      orderBy: [{ column: f.area, isDescending: false }]

    }));
    return r.rows.map(x => ({
      area: x.area,
      count: x.count
    }));
  }
  _disableAutoDuplicateCheck = false;
  duplicateFamilies: duplicateFamilyInfo[] = [];

  async checkDuplicateFamilies() {
    this.duplicateFamilies = await Families.checkDuplicateFamilies(this.name, this.tz, this.tz2, Phone.toJson(this.phone1), Phone.toJson(this.phone2), Phone.toJson(this.phone3), Phone.toJson(this.phone4), this.id, false, this.address);
    this.$.tz.error = undefined;
    this.$.tz2.error = undefined;
    this.$.phone1.error = undefined;
    this.$.phone2.error = undefined;
    this.$.phone3.error = undefined;
    this.$.phone4.error = undefined;
    this.$.name.error = undefined;
    let foundExactName = false;
    for (const d of this.duplicateFamilies) {
      let errorText = getLang(this.context).valueAlreadyExistsFor + ' "' + d.name + '" ' + getLang(this.context).atAddress + ' ' + d.address;
      if (d.tz)
        this.$.tz.error = errorText;
      if (d.tz2)
        this.$.tz2.error = errorText;
      if (d.phone1)
        this.$.phone1.error = errorText;
      if (d.phone2)
        this.$.phone2.error = errorText;
      if (d.phone3)
        this.$.phone3.error = errorText;
      if (d.phone4)
        this.$.phone4.error = errorText;
      if (d.nameDup && this.$.name.wasChanged()) {
        if (!foundExactName)
          this.$.name.error = errorText;
        if (this.name && d.name && this.name.trim() == d.name.trim())
          foundExactName = true;
      }
    }
    Phone.validatePhone(this.$.phone1, this.context);
    Phone.validatePhone(this.$.phone2, this.context);
    Phone.validatePhone(this.$.phone3, this.context);
    Phone.validatePhone(this.$.phone4, this.context);


  }
  @ServerFunction({ allowed: Roles.admin, blockUser: false })
  static async checkDuplicateFamilies(name: string, tz: string, tz2: string, phone1: string, phone2: string, phone3: string, phone4: string, id: string, exactName: boolean = false, address: string, context?: Context, db?: SqlDatabase) {
    let result: duplicateFamilyInfo[] = [];

    var sql = new SqlBuilder();
    var f = SqlFor(context.for(Families));

    let compareAsNumber = (col: ColumnDefinitions<any>, value: string) => {
      return sql.and(sql.eq(sql.extractNumber(col), sql.extractNumber(sql.str(value))), sql.build(sql.extractNumber(sql.str(value)), ' <> ', 0));
    };
    let tzCol = sql.or(compareAsNumber(f.tz, tz), compareAsNumber(f.tz2, tz));
    let tz2Col = sql.or(compareAsNumber(f.tz, tz2), compareAsNumber(f.tz2, tz2));
    let phone1Col = sql.or(compareAsNumber(f.phone1, phone1), compareAsNumber(f.phone2, phone1), compareAsNumber(f.phone3, phone1), compareAsNumber(f.phone4, phone1));
    let phone2Col = sql.or(compareAsNumber(f.phone1, phone2), compareAsNumber(f.phone2, phone2), compareAsNumber(f.phone3, phone2), compareAsNumber(f.phone4, phone2));
    let phone3Col = sql.or(compareAsNumber(f.phone1, phone3), compareAsNumber(f.phone2, phone3), compareAsNumber(f.phone3, phone3), compareAsNumber(f.phone4, phone3));
    let phone4Col = sql.or(compareAsNumber(f.phone1, phone4), compareAsNumber(f.phone2, phone4), compareAsNumber(f.phone3, phone4), compareAsNumber(f.phone4, phone4));
    let nameCol = 'false';
    if (name && name.trim().length > 0)
      if (exactName)
        nameCol = sql.build('trim(', f.name, ') =  ', sql.str(name.trim()));
      else
        nameCol = sql.build('trim(', f.name, ') like  ', sql.str('%' + name.trim() + '%'));


    let sqlResult = await db.execute(sql.query({
      select: () => [f.id,
      f.name,
      f.address,
      sql.columnWithAlias(tzCol, 'tz'),
      sql.columnWithAlias(tz2Col, 'tz2'),
      sql.columnWithAlias(phone1Col, 'phone1'),
      sql.columnWithAlias(phone2Col, 'phone2'),
      sql.columnWithAlias(phone3Col, 'phone3'),
      sql.columnWithAlias(phone4Col, 'phone4'),
      sql.columnWithAlias(nameCol, 'nameDup'),
      sql.columnWithAlias(f.status, 'status')

      ],

      from: f,
      where: () => [sql.or(tzCol, tz2Col, phone1Col, phone2Col, phone3Col, phone4Col, nameCol), sql.ne(f.id, sql.str(id)), f.status.isDifferentFrom(FamilyStatus.ToDelete)]
    }));
    if (!sqlResult.rows || sqlResult.rows.length < 1)
      return [];

    for (const row of sqlResult.rows) {
      result.push({
        id: row[sqlResult.getColumnKeyInResultForIndexInSelect(0)],
        name: row[sqlResult.getColumnKeyInResultForIndexInSelect(1)],
        address: row[sqlResult.getColumnKeyInResultForIndexInSelect(2)],
        tz: row[sqlResult.getColumnKeyInResultForIndexInSelect(3)],
        tz2: row[sqlResult.getColumnKeyInResultForIndexInSelect(4)],
        phone1: row[sqlResult.getColumnKeyInResultForIndexInSelect(5)],
        phone2: row[sqlResult.getColumnKeyInResultForIndexInSelect(6)],
        phone3: row[sqlResult.getColumnKeyInResultForIndexInSelect(7)],
        phone4: row[sqlResult.getColumnKeyInResultForIndexInSelect(8)],
        nameDup: row[sqlResult.getColumnKeyInResultForIndexInSelect(9)],
        removedFromList: row['status'] == FamilyStatus.RemovedFromList.id,
        sameAddress: address == row[sqlResult.getColumnKeyInResultForIndexInSelect(2)],
        rank: 0

      });
    }
    for (const r of result) {
      for (const key in r) {
        if (r.hasOwnProperty(key)) {
          const element = r[key];
          if (element === true) {
            r.rank++;
          }
        }
      }
    }
    result.sort((a, b) => b.rank - a.rank);
    return result;

  }
}



export interface duplicateFamilyInfo {
  id: string;
  name: string;
  address: string;
  sameAddress: boolean;
  tz: boolean;
  tz2: boolean;
  phone1: boolean;
  phone2: boolean;
  phone3: boolean;
  phone4: boolean;
  nameDup: boolean;
  removedFromList: boolean;
  rank: number;
}

export interface FamilyUpdateInfo {
  name: string,
  courier: HelpersBase,
  deliverStatus: DeliveryStatus,
  courierAssingTime: Date,
  deliveryStatusDate: Date,
  courierComments: string
}

export function parseAddress(s: string) {
  let r = {

  } as parseAddressResult;


  let extractSomething = (what: string) => {
    let i = s.indexOf(what);
    if (i >= 0) {
      let value = '';
      let index = 0;
      for (index = i + what.length; index < s.length; index++) {
        const element = s[index];
        if (element != ' ' && element != ',') {
          value += element;
        }
        else if (value) {

          break;
        }
      }
      let after = s.substring(index + 1, 1000);
      if (s[index] == ' ')
        after = ' ' + after;
      if (s[index] == ',')
        after = ',' + after;
      s = s.substring(0, i) + after;
      return value.trim();
    }
  }
  r.dira = extractSomething('דירה');
  if (!r.dira) {
    r.dira = extractSomething('/');
  }
  r.floor = extractSomething('קומה');
  r.knisa = extractSomething('כניסה');


  r.address = s.trim();
  return r;
}
export interface parseAddressResult {
  address: string;
  dira?: string;
  floor?: string;
  knisa?: string;
}

export function AreaColumn() {
  return (target, key) => {
    DataControl<any, string>({
      click: async (row, col) => {
        let areas = await Families.getAreas();
        await openDialog(SelectValueDialogComponent, x => x.args({
          values: areas.map(x => ({ caption: x.area })),
          onSelect: area => {
            col.value = area.caption;
          }
        }))
      }
    })(target, key);
    return Column({
      caption: use.language.region
    })(target, key);
  }
}




export function parseUrlInAddress(address: string) {
  let x = address.toLowerCase();
  let search = 'https://maps.google.com/maps?q=';
  if (x.startsWith(search)) {
    x = x.substring(search.length, 1000);
    let i = x.indexOf('&')
    if (i >= 0) {
      x = x.substring(0, i);
    }
    x = x.replace('%2c', ',');
    return x;
  } else if (x.startsWith('https://www.google.com/maps/place/')) {
    let r = x.split('!3d');
    if (r.length > 0) {
      x = r[r.length - 1];
      let j = x.split('!4d')
      x = j[0] + ',' + j[1];
      let i = x.indexOf('!');
      if (i > 0) {
        x = x.substring(0, i);
      }
      return leaveOnlyNumericChars(x);

    }
  } else if (x.indexOf('מיקום:') >= 0) {
    let j = x.substring(x.indexOf('מיקום:') + 6);
    let k = j.indexOf('דיוק');
    if (k > 0) {
      j = j.substring(0, k);
      j = leaveOnlyNumericChars(j);
      if (j.indexOf(',') > 0)
        return j;
    }


  }
  if (isGpsAddress(address)) {
    let x = address.split(',');
    return (+x[0]).toFixed(6) + ',' + (+x[1]).toFixed(6);
  }

  return address;
}





export function displayDupInfo(info: duplicateFamilyInfo, context: Context) {
  let r = [];


  if (info.tz) {
    r.push(getLang(context).identicalSocialSecurityNumber + ' ');
  }
  if (info.sameAddress) {
    r.push(getLang(context).sameAddress + " ");
  }
  if (info.phone1 || info.phone2 || info.phone3 || info.phone4) {
    r.push(getLang(context).identicalPhone);
  }
  if (info.nameDup) {
    r.push(getLang(context).similarName);
  }
  return info.address + ": " + r.join(', ');
}

export interface autocompleteResult {
  address: string,
  result: GeocodeResult
}

export function sendWhatsappToFamily(f: familyLikeEntity, context: Context, phone?: string) {
  if (!phone) {
    for (const p of [f.phone1, f.phone2, f.phone3, f.phone4]) {
      if (p && p.canSendWhatsapp()) {
        phone = p.thePhone;
        break;
      }
    }
  }
  Phone.sendWhatsappToPhone(phone,
    use.language.hello + ' ' + f.name + ',', context);
}
export function canSendWhatsapp(f: familyLikeEntity) {
  for (const p of [f.phone1, f.phone2, f.phone3, f.phone4]) {
    if (p && p.canSendWhatsapp()) {
      return true;
    }
  }
}

export interface familyLikeEntity {
  name: string;
  phone1: Phone;
  phone2: Phone;
  phone3: Phone;
  phone4: Phone;
}

function dbNameFromLastDelivery(selfDefs: EntityDefinitions<Families>, context: Context, col: (fd: ColumnDefinitionsOf<import("./FamilyDeliveries").FamilyDeliveries>) => ColumnDefinitions, alias: string) {
  let self = SqlFor(selfDefs);
  let fd = SqlFor(context.for(FamilyDeliveries));
  let sql = new SqlBuilder();
  return sql.columnInnerSelect(self, {
    select: () => [sql.columnWithAlias(col(fd), alias)],
    from: fd,

    where: () => [sql.eq(fd.family, self.id),
    ],
    orderBy: [{ column: fd.deliveryStatusDate, isDescending: true }]
  });
}