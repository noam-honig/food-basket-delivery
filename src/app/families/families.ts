import { DeliveryStatus } from "./DeliveryStatus";
import { YesNo } from "./YesNo";

import { FamilySources } from "./FamilySources";
import { BasketType } from "./BasketType";
import { delayWhileTyping, Email, ChangeDateColumn } from "../model-shared/types";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { Context, BackendMethod, IdEntity, SqlDatabase, Filter, Validators, FieldMetadata, FieldsMetadata, EntityMetadata } from 'remult';
import { BusyService, DataAreaFieldsSetting, DataControl, DataControlSettings, GridSettings, InputField, openDialog, SelectValueDialogComponent } from '@remult/angular';

import { Helpers, HelpersBase } from "../helpers/helpers";

import { GeocodeInformation, GetGeoInformation, leaveOnlyNumericChars, isGpsAddress, GeocodeResult, AddressHelper } from "../shared/googleApiHelpers";
import { ApplicationSettings, CustomColumn, customColumnInfo } from "../manage/ApplicationSettings";

import * as fetch from 'node-fetch';
import { Roles } from "../auth/roles";

import { DateOnlyField, Field, FieldType, use, Entity, QuantityColumn, IntegerField } from "../translate";
import { FamilyStatus } from "./FamilyStatus";

import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { DialogService } from "../select-popup/dialog";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";


import { YesNoQuestionComponent } from "../select-popup/yes-no-question/yes-no-question.component";
import { DistributionCenters } from "../manage/distribution-centers";
import { getLang } from "../sites/sites";


import { Groups, GroupsValue } from "../manage/groups";




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


@Entity<Families>(
  {
    key: "Families",
    translation: l => l.families,
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
      if (self.context.backend) {
        if (!self.quantity || self.quantity < 1)
          self.quantity = 1;
        if (self.$.area.wasChanged() && self.area)
          self.area = self.area.trim();



        if (self.$.address.wasChanged() || !self.addressHelper.ok() || self.autoCompleteResult) {
          await self.reloadGeoCoding();
        }
        let currentUser = self.context.currentUser;
        if (self.isNew()) {
          self.createDate = new Date();
          self.createUser = currentUser;
        }
        if (self.$.status.wasChanged()) {
          self.statusDate = new Date();
          self.statusUser = currentUser;
        }

        if (!self._suppressLastUpdateDuringSchemaInit) {
          self.lastUpdateDate = new Date();
          self.lastUpdateUser = currentUser;
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
      else if (!self.context.backend) {
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
  @BackendMethod({ allowed: Roles.admin })
  static async getDefaultVolunteers(context?: Context, db?: SqlDatabase) {
    var sql = new SqlBuilder(context);
    let f = SqlFor(context.for(Families));
    let r = await db.execute(await sql.query({
      from: f,
      select: () => [f.fixedCourier, 'count (*) as count'],
      where: () => [f.status.isEqualTo(FamilyStatus.Active)],
      groupBy: () => [f.fixedCourier],
      orderBy: [{ field: f.fixedCourier, isDescending: false }]

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
        let r: FieldMetadata[] = [
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

    let newDelivery = this.createDelivery(await dialog.getDistCenter(this.addressHelper.location()));
    let arciveCurrentDelivery = new InputField<boolean>({
      valueType:Boolean,
      caption: getLang(this.context).archiveCurrentDelivery,
      defaultValue: () => true
    });
    if (args.copyFrom != undefined) {
      newDelivery.copyFrom(args.copyFrom);

    }
    let selfPickup = new InputField<boolean>({
      valueType: Boolean,
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
          fields: () => {
            let r: DataAreaFieldsSetting<any>[] = [
              [newDelivery.$.basketType,
              newDelivery.$.quantity],
              newDelivery.$.deliveryComments];
            if (dialog.hasManyCenters)
              r.push(newDelivery.$.distributionCenter);
            r.push(newDelivery.$.courier);
            if (args.copyFrom != null && args.copyFrom.deliverStatus.IsAResultStatus()) {
              r.push(arciveCurrentDelivery);
            }
            r.push({ field: selfPickup, visible: () => settings.usingSelfPickupModule })

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
          let newId = await Families.addDelivery(newDelivery.family, newDelivery.basketType, newDelivery.distributionCenter, newDelivery.courier, {
            quantity: newDelivery.quantity,
            comment: newDelivery.deliveryComments,
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
  @BackendMethod({ allowed: Roles.admin })
  static async addDelivery(familyId: string, basketType: BasketType, distCenter: DistributionCenters, courier: HelpersBase, settings: {
    quantity: number,
    comment: string,
    selfPickup: boolean,
    deliverStatus?: DeliveryStatus,
    archive?: boolean
  }, context?: Context) {
    let f = await context.for(Families).findId(familyId);
    if (f) {

      if (!distCenter)
        distCenter = await context.findClosestDistCenter(f.addressHelper.location());
      let fd = f.createDelivery(distCenter);
      fd.basketType = basketType;
      fd.quantity = settings.quantity;
      fd.deliveryComments = settings.comment;
      fd.distributionCenter = distCenter;
      fd.courier = courier;
      if (settings.deliverStatus) fd.deliverStatus = settings.deliverStatus;
      if (settings.archive) fd.archive = settings.archive;
      if (settings.selfPickup)
        fd.deliverStatus = DeliveryStatus.SelfPickup;

      await fd.save();
      return fd.id;
    }
    throw getLang(context).familyWasNotFound;

  }
  createDelivery(distCenter: DistributionCenters) {
    let fd = this.context.for(FamilyDeliveries).create();
    fd.family = this.id;
    fd.distributionCenter = distCenter;
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
      fd.$[col.metadata.key].value = col.value;
    }
  }

  __disableGeocoding = false;

  constructor(private context: Context) {
    super();
  }
  disableChangeLogging = false;
  disableOnSavingRow = false;
  _suppressLastUpdateDuringSchemaInit = false;

  @Field({
    translation: l => l.familyName,
    validate: Validators.required.withMessage(use.language.nameIsTooShort)
  })
  @DataControl<Families>({
    valueChange: self => self.delayCheckDuplicateFamilies(),
  })
  name: string;


  @Field({
    translation: l => l.socialSecurityNumber,

  })
  @DataControl<Families>({
    valueChange: self => self.delayCheckDuplicateFamilies(),
  })

  tz: string;
  @Field({
    translation: l => l.spouceSocialSecurityNumber,

  })
  @DataControl<Families>({
    valueChange: self => self.delayCheckDuplicateFamilies(),
  })

  tz2: string;
  @IntegerField()
  familyMembers: number;
  @DateOnlyField()
  birthDate: Date;
  @DateOnlyField<Families>({

    sqlExpression: () => "(select cast(birthDate + ((extract(year from age(birthDate)) + 1) * interval '1' year) as date) as nextBirthday)",
    allowApiUpdate: false,
    displayValue: self => {
      if (!self.nextBirthday)
        return '';
      return self.nextBirthday.toLocaleDateString("he-il") + " - " + use.language.age + " " + (self.nextBirthday.getFullYear() - self.birthDate.getFullYear())
    }
  })

  nextBirthday: Date
  @Field({ translation: l => l.defaultBasketType })
  basketType: BasketType;
  @IntegerField({ translation: l => l.defaultQuantity, allowApiUpdate: Roles.admin })
  quantity: number;
  @Field({ includeInApi: true, translation: l => l.familySource })
  familySource: FamilySources;
  @Field({ translation: l => l.familyHelpContact })
  socialWorker: string;
  @Field({ translation: l => l.familyHelpPhone1 })
  socialWorkerPhone1: Phone;
  @Field({ translation: l => l.familyHelpPhone2 })
  socialWorkerPhone2: Phone;
  @Field()
  groups: GroupsValue = new GroupsValue('');
  @Field({ translation: l => l.specialAsignment })
  special: YesNo;
  @Field()
  defaultSelfPickup: boolean;
  @Field({ translation: l => l.familyUniqueId })
  iDinExcel: string;
  @Field()
  internalComment: string;
  @Field()
  addressApiResult: string;

  @Field()
  @DataControl<Families>({
    valueChange: self => {
      self.delayCheckDuplicateFamilies()
      if (!self.address)
        return;
      let y = parseUrlInAddress(self.address);
      if (y != self.address)
        self.address = y;
    }
  })

  address: string;
  addressHelper = new AddressHelper(this.context, () => this.$.address, () => this.$.addressApiResult);


  @Field()
  floor: string;
  @Field()
  appartment: string;
  @Field()
  entrance: string;
  @Field()
  buildingCode: string;
  @Field({ translation: l => l.cityAutomaticallyUpdatedByGoogle })
  city: string;
  @AreaColumn()
  area: string;
  @Field()
  addressComment: string;
  @IntegerField()
  postalCode: number;
  @Field({ translation: l => l.defaultDeliveryComment })
  deliveryComments: string;
  @Field({
    dbName: 'phone',
  })
  @DataControl<Families>({
    valueChange: self => self.delayCheckDuplicateFamilies(),
  })

  phone1: Phone;
  @Field()
  phone1Description: string;
  @Field()
  @DataControl<Families>({
    valueChange: self => self.delayCheckDuplicateFamilies(),
  })

  phone2: Phone;
  @Field()
  phone2Description: string;
  @Field()
  @DataControl<Families>({
    valueChange: self => self.delayCheckDuplicateFamilies(),
  })
  phone3: Phone;
  @Field()
  phone3Description: string;
  @Field()
  @DataControl<Families>({
    valueChange: self => self.delayCheckDuplicateFamilies(),
  })
  phone4: Phone;
  @Field()
  phone4Description: string;
  @Field()
  email: Email;
  @Field()
  status: FamilyStatus = FamilyStatus.Active;
  @ChangeDateColumn({ translation: l => l.statusChangeDate })
  statusDate: Date;
  @Field({ translation: l => l.statusChangeUser, allowApiUpdate: false })
  statusUser: Helpers;
  @Field({ translation: l => l.defaultVolunteer })
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
  @CustomColumn(() => customColumnInfo[1], Roles.admin)
  custom1: string;
  @CustomColumn(() => customColumnInfo[2], Roles.admin)
  custom2: string;
  @CustomColumn(() => customColumnInfo[3], Roles.admin)
  custom3: string;
  @CustomColumn(() => customColumnInfo[4], Roles.admin)
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


  @Field({
    sqlExpression: (self, context) => {
      return dbNameFromLastDelivery(self, context, fde => fde.deliverStatus, "prevStatus");
    }
  })
  previousDeliveryStatus: DeliveryStatus;
  @ChangeDateColumn({
    sqlExpression: (self, context) => {
      return dbNameFromLastDelivery(self, context, fde => fde.deliveryStatusDate, "prevDate");
    }
  })
  previousDeliveryDate: Date;
  @Field<Families>({
    translation: l => l.previousDeliveryNotes,
    sqlExpression: (self, context) => {
      return dbNameFromLastDelivery(self, context, fde => fde.courierComments, "prevComment");
    }
  })
  previousDeliveryComment: string;
  @IntegerField({
    sqlExpression: async (selfDefs, context) => {
      let self = SqlFor(selfDefs);
      let fd = SqlFor(context.for(FamilyDeliveries));
      let sql = new SqlBuilder(context);
      return sql.columnCount(self, {
        from: fd,
        where: () => [sql.eq(fd.family, self.id),
        fd.archive.isEqualTo(false).and(DeliveryStatus.isNotAResultStatus(fd.deliverStatus))]
      });

    }
  })
  numOfActiveReadyDeliveries: number;
  @Field()
  //שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
  addressLongitude: number;
  @Field()
  addressLatitude: number;
  @Field()
  //זו התוצאה שחזרה מהGEOCODING כך שהיא מכוונת לכביש הקרוב
  drivingLongitude: number;
  @Field()
  drivingLatitude: number;
  @Field()
  addressByGoogle: string;
  @Field({ serverExpression: () => '' })
  autoCompleteResult: string;
  @Field()
  addressOk: boolean;





  static getPreviousDeliveryColumn(self: FieldsMetadata<Families>) {
    return {
      translation: l => l.previousDeliverySummary,
      readonly: true,
      field: self.previousDeliveryStatus,
      valueList: c => DeliveryStatus.getOptions(c),
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





  @ChangeDateColumn()
  createDate: Date;
  @Field({ allowApiUpdate: false })
  createUser: HelpersBase;
  @ChangeDateColumn()
  lastUpdateDate: Date;
  @Field({ allowApiUpdate: false })
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
    if (this.context.backend)
      return;
    if (!this.tzDelay)
      this.tzDelay = new delayWhileTyping(1000);
    this.tzDelay.do(async () => {
      this.checkDuplicateFamilies();

    });

  }
  @BackendMethod({ allowed: Roles.admin })
  static async getAreas(context?: Context, db?: SqlDatabase): Promise<{ area: string, count: number }[]> {
    var sql = new SqlBuilder(context);
    let f = SqlFor(context.for(Families));
    let r = await db.execute(await sql.query({
      from: f,
      select: () => [f.area, 'count (*) as count'],
      where: () => [f.status.isEqualTo(FamilyStatus.Active)],
      groupBy: () => [f.area],
      orderBy: [{ field: f.area, isDescending: false }]

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
  @BackendMethod({ allowed: Roles.admin, blockUser: false })
  static async checkDuplicateFamilies(name: string, tz: string, tz2: string, phone1: string, phone2: string, phone3: string, phone4: string, id: string, exactName: boolean = false, address: string, context?: Context, db?: SqlDatabase) {
    let result: duplicateFamilyInfo[] = [];

    var sql = new SqlBuilder(context);
    var f = SqlFor(context.for(Families));

    let compareAsNumber = (col: FieldMetadata<any>, value: string) => {
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
        nameCol = await sql.build('trim(', f.name, ') =  ', sql.str(name.trim()));
      else
        nameCol = await sql.build('trim(', f.name, ') like  ', sql.str('%' + name.trim() + '%'));


    let sqlResult = await db.execute(await sql.query({
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
    return Field({
      translation: l => l.region
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

async function dbNameFromLastDelivery(selfDefs: EntityMetadata<Families>, context: Context, col: (fd: FieldsMetadata<import("./FamilyDeliveries").FamilyDeliveries>) => FieldMetadata, alias: string) {
  let self = SqlFor(selfDefs);
  let fd = SqlFor(context.for(FamilyDeliveries));
  let sql = new SqlBuilder(context);
  return sql.columnInnerSelect(self, {
    select: () => [sql.columnWithAlias(col(fd), alias)],
    from: fd,
    where: () => [sql.eq(fd.family, self.id),
    ],
    orderBy: [{ field: fd.deliveryStatusDate, isDescending: true }]
  });
}