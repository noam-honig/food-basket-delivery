import { DeliveryStatus } from "./DeliveryStatus";
import { YesNo } from "./YesNo";

import { FamilySources } from "./FamilySources";
import { BasketType } from "./BasketType";
import { delayWhileTyping, Email, ChangeDateColumn } from "../model-shared/types";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { Remult, BackendMethod, IdEntity, SqlDatabase, Validators, FieldMetadata, FieldsMetadata, EntityMetadata, isBackend, getFields } from 'remult';

import { DataAreaFieldsSetting, DataControl, DataControlSettings, GridSettings, InputField } from '@remult/angular/interfaces';

import { Helpers, HelpersBase } from "../helpers/helpers";

import { GeocodeInformation, GetGeoInformation, leaveOnlyNumericChars, isGpsAddress, GeocodeResult, AddressHelper } from "../shared/googleApiHelpers";
import { ApplicationSettings, CustomColumn, customColumnInfo } from "../manage/ApplicationSettings";

import * as fetch from 'node-fetch';
import { Roles } from "../auth/roles";

import { DateOnlyField, Field, use, Entity, IntegerField } from "../translate";
import { FamilyStatus } from "./FamilyStatus";

import { DistributionCenters } from "../manage/distribution-centers";
import { getLang } from "../sites/sites";

import { GroupsValue } from "../manage/groups";
import { DateOnlyValueConverter } from "remult/valueConverters";
import { evil, UITools } from "../helpers/init-context";




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


@Entity<Families>("Families", {
  translation: l => l.families,
  allowApiRead: Roles.admin,
  allowApiUpdate: Roles.admin,
  allowApiDelete: false,
  allowApiInsert: Roles.admin,

  saving: async (self) => {
    if (self.disableOnSavingRow)
      return;
    if (isBackend()) {
      if (!self.quantity || self.quantity < 1)
        self.quantity = 1;
      if (self.$.area.valueChanged() && self.area)
        self.area = self.area.trim();



      if (self.$.address.valueChanged() || !self.addressHelper.ok || self.autoCompleteResult) {
        await self.reloadGeoCoding();
      }
      if (!self.defaultDistributionCenter)
        self.defaultDistributionCenter = await self.remult.findClosestDistCenter(self.addressHelper.location);
      let currentUser = (await self.remult.getCurrentUser());
      if (self.$.fixedCourier.valueChanged() && !self.fixedCourier)
        self.routeOrder = 0;
      if (self.isNew()) {
        self.createDate = new Date();
        self.createUser = currentUser;
      }
      if (self.$.status.valueChanged()) {
        self.statusDate = new Date();
        self.statusUser = currentUser;
      }

      if (!self._suppressLastUpdateDuringSchemaInit) {
        self.lastUpdateDate = new Date();
        self.lastUpdateUser = currentUser;
      }



      if (self.sharedColumns().find(x => x.value != x.originalValue) || [self.$.basketType, self.$.quantity, self.$.deliveryComments, self.$.defaultSelfPickup].find(x => x.valueChanged())) {
        for await (const fd of await self.remult.repo(FamilyDeliveries).find({
          where: {
            family: self.id,
            archive: false,
            deliverStatus: DeliveryStatus.isNotAResultStatus()
          }
        })) {
          self.updateDelivery(fd);
          if (self.$.basketType.valueChanged() && fd.basketType == self.$.basketType.originalValue)
            fd.basketType = self.basketType;
          if (self.$.quantity.valueChanged() && fd.quantity == self.$.quantity.originalValue)
            fd.quantity = self.quantity;
          if (self.$.deliveryComments.valueChanged() && fd.deliveryComments == self.$.deliveryComments.originalValue)
            fd.deliveryComments = self.deliveryComments;
          if (self.$.fixedCourier.valueChanged() && fd.courier == self.$.fixedCourier.originalValue)
            fd.courier = self.fixedCourier;
          if (self.$.defaultSelfPickup.valueChanged())
            if (self.defaultSelfPickup)
              if (fd.deliverStatus == DeliveryStatus.ReadyForDelivery)
                fd.deliverStatus = DeliveryStatus.SelfPickup;
              else if (fd.deliverStatus == DeliveryStatus.SelfPickup)
                fd.deliverStatus = DeliveryStatus.ReadyForDelivery;
          await fd.save();
        }
      }

    }
    else if (!isBackend()) {
      let statusChangedOutOfActive = self.$.status.valueChanged() && self.status != FamilyStatus.Active;
      if (statusChangedOutOfActive) {
        let activeDeliveries = self.remult.repo(ActiveFamilyDeliveries).query({ where: { family: self.id, deliverStatus: DeliveryStatus.isNotAResultStatus() } });
        if (await activeDeliveries.count() > 0) {
          if (await evil.YesNoPromise(
            getLang(self.remult).thisFamilyHas + " " + (await activeDeliveries.count()) + " " + getLang(self.remult).deliveries_ShouldWeDeleteThem
          )) {
            for await (const d of activeDeliveries) {
              await d.delete();

            }
          }
        }
      }
    }
  }
},
  (options, remult) =>
    options.apiPrefilter = (self) => {
      if (!remult.isAllowed(Roles.admin)) {
        if (remult.isAllowed(Roles.admin))
          return undefined;
        return self.id.isEqualTo('no rows');
      }
    },
)
export class Families extends IdEntity {
  @BackendMethod({ allowed: Roles.admin })
  static async getDefaultVolunteers(remult?: Remult, db?: SqlDatabase) {
    var sql = new SqlBuilder(remult);
    let f = SqlFor(remult.repo(Families));
    let r = await db.execute(await sql.query({
      from: f,
      select: () => [f.fixedCourier, 'count (*) as count'],
      where: () => [f.where({ status: FamilyStatus.Active })],
      groupBy: () => [f.fixedCourier],
      orderBy: [{ field: f.fixedCourier, isDescending: false }]

    }));
    let result = r.rows.map(x => ({
      id: x.fixedcourier,
      name: '',
      count: x.count
    }));
    for (const r of result) {
      let h = await remult.repo(Helpers).findId(r.id);
      if (h)
        r.name = h.name;
    }
    return result;
  }

  async showDeliveryHistoryDialog(args: { ui: UITools, settings: ApplicationSettings }) {
    let gridDialogSettings = await this.deliveriesGridSettings(args);

    args.ui.gridDialog({
      title: getLang(this.remult).deliveriesFor + ' ' + this.name,
      stateName: 'deliveries-for-family',
      settings: gridDialogSettings,

      buttons: [{
        text: use.language.newDelivery,

        click: () => this.showNewDeliveryDialog(args.ui, args.settings, { doNotCheckIfHasExistingDeliveries: true })
      }]
    });
  }
  public async deliveriesGridSettings(args: { ui: UITools, settings: ApplicationSettings }) {
    let result: GridSettings<import("./FamilyDeliveries").FamilyDeliveries> = new GridSettings(this.remult.repo(FamilyDeliveries), {
      numOfColumnsInGrid: 7,

      rowCssClass: fd => fd.getCss(),
      gridButtons: [{
        name: use.language.newDelivery,
        icon: 'add_shopping_cart',
        click: () => this.showNewDeliveryDialog(args.ui, args.settings, {
          doNotCheckIfHasExistingDeliveries: true,
          aDeliveryWasAdded: async () => { result.reloadData(); }
        })
      }, {

        name: use.language.addHistoricalDelivery,
        visible: () => this.remult.isAllowed(Roles.admin),
        click: async () => {
          var fd = this.createDelivery(null);
          var d = new dateInput();
          args.ui.inputAreaDialog({
            title: use.language.addHistoricalDelivery,
            settings: {
              fields: () => [
                getFields(d).date,
                fd.$.basketType,
                fd.$.courier
              ]
            },
            ok: async () => {
              await this.saveAsHistoryEntry(DateOnlyValueConverter.toJson(d.date), fd.basketType, fd.courier);
              result.reloadData();
            }
          });
        }

      }],
      rowButtons: [
        {
          name: use.language.deliveryDetails,
          click: async fd => fd.showDeliveryOnlyDetail({
            ui: args.ui,
            refreshDeliveryStats: () => result.reloadData()
          })
        },
        ...(await import("../family-deliveries/getDeliveryGridButtons")).getDeliveryGridButtons({
          remult: this.remult,
          refresh: () => result.reloadData(),
          deliveries: () => result,
          ui: args.ui,
          settings: args.settings
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

      where: { family: this.id },
      orderBy: { deliveryStatusDate: "desc" },
      rowsInPage: 25

    });
    return result;
  }
  @BackendMethod<Families>({ allowed: Roles.admin })
  async saveAsHistoryEntry(date: string, basket: BasketType, helper: HelpersBase) {
    const fd = this.createDelivery(null);
    fd.deliverStatus = DeliveryStatus.Success;
    fd.basketType = basket;
    fd.courier = helper;
    fd.archive = true;
    await fd.save();

    fd.deliveryStatusDate = DateOnlyValueConverter.fromJson(date);
    await fd.save();
  }

  async showNewDeliveryDialog(ui: UITools, settings: ApplicationSettings, args?: {
    copyFrom?: import("./FamilyDeliveries").FamilyDeliveries,
    aDeliveryWasAdded?: (newDeliveryId: string) => Promise<void>,
    doNotCheckIfHasExistingDeliveries?: boolean
  }) {
    if (!args)
      args = {};
    if (!args.doNotCheckIfHasExistingDeliveries) {
      let hasExisting = await this.remult.repo(ActiveFamilyDeliveries).count({ family: this.id, deliverStatus: DeliveryStatus.isNotAResultStatus() });
      if (hasExisting > 0) {
        if (await ui.YesNoPromise(settings.lang.familyHasExistingDeliveriesDoYouWantToViewThem)) {
          this.showDeliveryHistoryDialog({ ui, settings });
          return;
        }
      }
    }

    let newDelivery = this.createDelivery(this.defaultDistributionCenter ? this.defaultDistributionCenter : await ui.getDistCenter(this.addressHelper.location));
    let arciveCurrentDelivery = new InputField<boolean>({
      valueType: Boolean,
      caption: getLang(this.remult).archiveCurrentDelivery,
      defaultValue: () => true
    });
    if (args.copyFrom != undefined) {
      newDelivery.copyFrom(args.copyFrom);

    }
    let selfPickup = new InputField<boolean>({
      valueType: Boolean,
      caption: getLang(this.remult).familySelfPickup,
      defaultValue: () => this.defaultSelfPickup
    });
    if (args.copyFrom) {
      selfPickup.value = args.copyFrom.deliverStatus == DeliveryStatus.SuccessPickedUp;
      if (args.copyFrom.deliverStatus.isProblem)
        newDelivery.courier = null;
    }


    await ui.inputAreaDialog({
      settings: {
        fields: () => {
          let r: DataAreaFieldsSetting<any>[] = [
            [newDelivery.$.basketType,
            newDelivery.$.quantity],
            newDelivery.$.deliveryComments];
          if (ui.hasManyCenters)
            r.push(newDelivery.$.distributionCenter);
          r.push(newDelivery.$.courier);
          if (args.copyFrom != null && args.copyFrom.deliverStatus.IsAResultStatus()) {
            r.push(arciveCurrentDelivery);
          }
          r.push({ field: selfPickup, visible: () => settings.usingSelfPickupModule })

          return r;
        }
      },
      title: getLang(this.remult).newDeliveryFor + this.name,
      validate: async () => {
        let count = await newDelivery.duplicateCount();
        if (count > 0) {
          if (await ui.YesNoPromise(getLang(this.remult).familyAlreadyHasAnActiveDelivery)) {
            return;
          }
          else {
            throw getLang(this.remult).notOk;
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
        ui.Info(getLang(this.remult).deliveryCreatedSuccesfully);
      }
      , cancel: () => { }


    });
  }
  @BackendMethod({ allowed: Roles.admin })
  static async addDelivery(familyId: string, basketType: BasketType, distCenter: DistributionCenters, courier: HelpersBase, settings: {
    quantity: number,
    comment: string,
    selfPickup: boolean,
    deliverStatus?: DeliveryStatus,
    archive?: boolean
  }, remult?: Remult) {
    let f = await remult.repo(Families).findId(familyId);
    if (f) {

      if (!distCenter)
        distCenter = await remult.findClosestDistCenter(f.addressHelper.location);
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
    throw getLang(remult).familyWasNotFound;

  }
  createDelivery(distCenter: DistributionCenters) {
    let fd = this.remult.repo(FamilyDeliveries).create();
    fd.family = this.id;
    fd.distributionCenter = distCenter ? distCenter : this.defaultDistributionCenter;
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
      this.$.routeOrder,
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
      return getLang(this.remult).gpsLocationNear + ' ' + this.addressByGoogle;

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

  constructor(private remult: Remult) {
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
  addressHelper = new AddressHelper(this.remult, () => this.$.address, () => this.$.addressApiResult);


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
  statusUser: HelpersBase;
  @Field({
    translation: l => l.defaultVolunteer,
    clickWithTools: async (e, col, ui) => {
      ui.selectHelper({
        searchClosestDefaultFamily: true,
        location: e.addressHelper.location,
        onSelect: async selected => col.value = selected
      });
    }
  })
  fixedCourier: HelpersBase;
  @IntegerField({
    allowApiUpdate: true
  })
  routeOrder: number;
  @Field({
    allowApiUpdate: Roles.admin,
    translation: l => l.defaultDistributionCenter
  })
  defaultDistributionCenter: DistributionCenters;
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
      geo = await GetGeoInformation(this.address, this.remult);
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
    var geo = this.addressHelper.getGeocodeInformation;
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


  @Field({},
    (options, remult) =>
      options.sqlExpression = (self) => {
        return dbNameFromLastDelivery(self, remult, fde => fde.deliverStatus, "prevStatus");
      }
  )
  previousDeliveryStatus: DeliveryStatus;
  @ChangeDateColumn({},
    (options, remult) =>
      options.sqlExpression = (self) => {
        return dbNameFromLastDelivery(self, remult, fde => fde.deliveryStatusDate, "prevDate");
      }
  )
  previousDeliveryDate: Date;
  @Field<Families>({
    translation: l => l.previousDeliveryNotes
  },
    (options, remult) =>
      options.sqlExpression = (self) => {
        return dbNameFromLastDelivery(self, remult, fde => fde.courierComments, "prevComment");
      }
  )
  previousDeliveryComment: string;
  @IntegerField({},
    (options, remult) =>
      options.sqlExpression = async (selfDefs) => {
        let self = SqlFor(selfDefs);
        let fd = SqlFor(remult.repo(FamilyDeliveries));
        let sql = new SqlBuilder(remult);
        return sql.columnCount(self, {
          from: fd,
          where: () => [sql.eq(fd.family, self.id),
          fd.where({ archive: false, deliverStatus: DeliveryStatus.isNotAResultStatus() })]
        });

      }
  )
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
      cssClass: f => f.previousDeliveryStatus.getCss(null)


    } as DataControlSettings<Families>;
  }





  @ChangeDateColumn()
  createDate: Date;
  @Field({ allowApiUpdate: false, translation: l => l.createUser })
  createUser: HelpersBase;
  @ChangeDateColumn()
  lastUpdateDate: Date;
  @Field({ allowApiUpdate: false })
  lastUpdateUser: HelpersBase;
  @Field({ includeInApi: Roles.distCenterAdmin })
  shortUrlKey: string;




  openWaze() {

    //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + 'export &navigate=yes', '_blank');
    window.open('waze://?ll=' + this.addressHelper.getGeocodeInformation.getlonglat() + "&q=" + encodeURI(this.address) + '&navigate=yes');
  }
  openGoogleMaps() {
    window.open('https://www.google.com/maps/search/?api=1&hl=' + getLang(this.remult).languageCode + '&query=' + this.address, '_blank');
  }
  showOnGoogleMaps() {
    window.open('https://maps.google.com/maps?q=' + this.addressHelper.getGeocodeInformation.getlonglat() + '&hl=' + getLang(this.remult).languageCode, '_blank');
  }
  showOnGovMap() {
    window.open('https://www.govmap.gov.il/?q=' + this.address + '&z=10', '_blank');
  }





  static SendMessageToBrowsers = (s: string, remult: Remult, distCenter: string) => { };
  static GetUpdateMessage(n: FamilyUpdateInfo, updateType: number, courierName: string, remult: Remult) {
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
              duration = ' ' + getLang(remult).within + ' ' + Math.round((n.deliveryStatusDate.valueOf() - n.courierAssingTime.valueOf()) / 60000) + " " + getLang(remult).minutes;
            return n.deliverStatus.caption + (n.courierComments ? ", \"" + n.courierComments + "\" - " : '') + ' ' + getLang(remult).forFamily + ' ' + n.name + ' ' + (courierName ? (getLang(remult).by + ' ' + courierName) : '') + duration + "!";
        }
        return getLang(remult).theFamily + ' ' + n.name + ' ' + getLang(remult).wasUpdatedTo + ' ' + n.deliverStatus.caption;
      case 2:
        if (n.courier)
          return getLang(remult).theFamily + ' ' + n.name + ' ' + getLang(remult).wasAssignedTo + ' ' + courierName;
        else
          return getLang(remult).assignmentCanceledFor + " " + n.name;
    }
    return n.deliverStatus.caption;
  }
  tzDelay: delayWhileTyping;
  private delayCheckDuplicateFamilies() {
    if (this._disableAutoDuplicateCheck)
      return;
    if (isBackend())
      return;
    if (!this.tzDelay)
      this.tzDelay = new delayWhileTyping(1000);
    this.tzDelay.do(async () => {
      this.checkDuplicateFamilies();

    });

  }
  @BackendMethod({ allowed: Roles.admin })
  static async getAreas(remult?: Remult, db?: SqlDatabase): Promise<{ area: string, count: number }[]> {
    var sql = new SqlBuilder(remult);
    let f = SqlFor(remult.repo(Families));
    let r = await db.execute(await sql.query({
      from: f,
      select: () => [f.area, 'count (*) as count'],
      where: () => [f.where({ status: FamilyStatus.Active })],
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
      let errorText = getLang(this.remult).valueAlreadyExistsFor + ' "' + d.name + '" ' + getLang(this.remult).atAddress + ' ' + d.address;
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
      if (d.nameDup && this.$.name.valueChanged()) {
        if (!foundExactName)
          this.$.name.error = errorText;
        if (this.name && d.name && this.name.trim() == d.name.trim())
          foundExactName = true;
      }
    }
    Phone.validatePhone(this.$.phone1, this.remult);
    Phone.validatePhone(this.$.phone2, this.remult);
    Phone.validatePhone(this.$.phone3, this.remult);
    Phone.validatePhone(this.$.phone4, this.remult);


  }
  @BackendMethod({ allowed: Roles.admin, blockUser: false })
  static async checkDuplicateFamilies(name: string, tz: string, tz2: string, phone1: string, phone2: string, phone3: string, phone4: string, id: string, exactName: boolean = false, address: string, remult?: Remult, db?: SqlDatabase) {
    let result: duplicateFamilyInfo[] = [];

    var sql = new SqlBuilder(remult);
    var f = SqlFor(remult.repo(Families));

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
      where: () => [sql.or(tzCol, tz2Col, phone1Col, phone2Col, phone3Col, phone4Col, nameCol), sql.ne(f.id, sql.str(id)), f.where({ status: { "!=": FamilyStatus.ToDelete } })]
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
    })(target, key);
    return Field({
      translation: l => l.region,
      clickWithTools: async (row, col, ui) => {
        let areas = await Families.getAreas();
        await ui.selectValuesDialog({
          values: areas.map(x => ({ caption: x.area })),
          onSelect: area => {
            col.value = area.caption;
          }
        })
      }
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





export function displayDupInfo(info: duplicateFamilyInfo, remult: Remult) {
  let r = [];


  if (info.tz) {
    r.push(getLang(remult).identicalSocialSecurityNumber + ' ');
  }
  if (info.sameAddress) {
    r.push(getLang(remult).sameAddress + " ");
  }
  if (info.phone1 || info.phone2 || info.phone3 || info.phone4) {
    r.push(getLang(remult).identicalPhone);
  }
  if (info.nameDup) {
    r.push(getLang(remult).similarName);
  }
  return info.address + ": " + r.join(', ');
}

export interface autocompleteResult {
  address: string,
  result: GeocodeResult
}

export function sendWhatsappToFamily(f: familyLikeEntity, remult: Remult, phone?: string, message?: string) {
  if (!phone) {
    for (const p of [f.phone1, f.phone2, f.phone3, f.phone4]) {
      if (p && p.canSendWhatsapp()) {
        phone = p.thePhone;
        break;
      }
    }
  }
  if (!message) {
    message = use.language.hello + ' ' + f.name + ',';
  }
  Phone.sendWhatsappToPhone(phone,
    message, remult);
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

async function dbNameFromLastDelivery(selfDefs: EntityMetadata<Families>, remult: Remult, col: (fd: FieldsMetadata<import("./FamilyDeliveries").FamilyDeliveries>) => FieldMetadata, alias: string) {
  let self = SqlFor(selfDefs);
  let fd = SqlFor(remult.repo(FamilyDeliveries));
  let sql = new SqlBuilder(remult);
  return sql.columnInnerSelect(self, {
    select: () => [sql.columnWithAlias(col(fd), alias)],
    from: fd,
    where: () => [sql.eq(fd.family, self.id),
    ],
    orderBy: [{ field: fd.deliveryStatusDate, isDescending: true }]
  });
}

class dateInput {
  @DateOnlyField()
  date: Date = new Date();
}