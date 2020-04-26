import { DeliveryStatus, DeliveryStatusColumn } from "./DeliveryStatus";
import { CallStatusColumn } from "./CallStatus";
import { YesNoColumn } from "./YesNo";

import { FamilySourceId } from "./FamilySources";
import { BasketId, BasketType, QuantityColumn } from "./BasketType";
import { changeDate, DateTimeColumn, SqlBuilder, PhoneColumn, delayWhileTyping } from "../model-shared/types";
import { DataControlSettings, Column, Context, EntityClass, ServerFunction, IdEntity, IdColumn, StringColumn, NumberColumn, BoolColumn, SqlDatabase, DateColumn, FilterBase, ColumnOptions, SpecificEntityHelper, Entity, DataArealColumnSetting } from '@remult/core';
import { HelperIdReadonly, HelperId, Helpers, HelperUserInfo } from "../helpers/helpers";

import { GeocodeInformation, GetGeoInformation, leaveOnlyNumericChars, isGpsAddress } from "../shared/googleApiHelpers";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { FamilyDeliveries } from "./FamilyDeliveries";
import * as fetch from 'node-fetch';
import { Roles } from "../auth/roles";

import { translate } from "../translate";
import { UpdateGroupDialogComponent } from "../update-group-dialog/update-group-dialog.component";
import { DistributionCenterId, DistributionCenters } from "../manage/distribution-centers";
import { FamilyStatusColumn } from "./FamilyStatus";
import { PromiseThrottle } from "../import-from-excel/import-from-excel.component";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { DialogService } from "../select-popup/dialog";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";


@EntityClass
export class Families extends IdEntity {
  showDeliveryHistoryDialog() {
    this.context.openDialog(GridDialogComponent, x => x.args = {
      title: 'משלוחים עבור ' + this.name.value,
      settings: this.context.for(FamilyDeliveries).gridSettings({
        numOfColumnsInGrid: 6,
        hideDataArea: true,
        rowCssClass: fd => fd.deliverStatus.getCss(),
        columnSettings: fd => {
          let r: Column<any>[] = [
            fd.deliverStatus,
            fd.deliveryStatusDate,
            fd.basketType,
            fd.quantity,
            fd.courier,
            fd.distributionCenter,
            fd.courierComments
          ]
          r.push(...fd.columns.toArray().filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.defs.caption.localeCompare(b.defs.caption)));
          return r;
        },
        get: {
          where: fd => fd.family.isEqualTo(this.id),
          orderBy: fd => [{ column: fd.deliveryStatusDate, descending: true }],
          limit: 25
        }
      })
    });
  }
  async showNewDeliveryDialog(dialog: DialogService, copyFrom?: FamilyDeliveries) {
    let newDelivery = this.createDelivery(dialog.distCenter.value);
    if (copyFrom != undefined) {
      newDelivery.copyFrom(copyFrom);
      
    }

    await this.context.openDialog(InputAreaComponent, x => {
      x.args = {
        settings: {
          columnSettings: () => {
            let r: DataArealColumnSetting<any>[] = [
              [newDelivery.basketType,
              newDelivery.quantity],
              newDelivery.deliveryComments];
            if (dialog.hasManyCenters)
              r.push(newDelivery.distributionCenter);
            r.push(newDelivery.courier);
            return r;
          }
        },
        title: 'משלוח חדש ל' + this.name.value,
        validate: async () => {
          let count = await newDelivery.duplicateCount();
          if (count > 0) {
            if (await dialog.YesNoPromise("למשפחה זו כבר קיים משלוח מאותו סוג האם להוסיף עוד אחד?")) {
              return;
            }
            else {
              throw 'לא תקין';
            }
          }
        },
        ok: async () => {
          await Families.addDelivery(newDelivery.family.value, {
            basketType: newDelivery.basketType.value,
            quantity: newDelivery.quantity.value,
            comment: newDelivery.courierComments.value,
            courier: newDelivery.courier.value,
            distCenter: newDelivery.distributionCenter.value

          });
          dialog.Info("משלוח נוצר בהצלחה");
        }
        , cancel: () => { }

      }
    });
  }
  @ServerFunction({ allowed: Roles.distCenterAdmin })
  static async addDelivery(familyId: string, settings: {
    basketType: string,
    quantity: number,
    comment: string,
    distCenter: string,
    courier: string
  }, context?: Context) {
    let f = await context.for(Families).findId(familyId);
    if (f) {
      let fd = f.createDelivery(settings.distCenter);
      fd.basketType.value = settings.basketType;
      fd.quantity.value = settings.quantity;
      fd.courierComments.value = settings.comment;
      fd.distributionCenter.value = settings.distCenter;
      fd.courier.value = settings.courier;
      await fd.save();
      return 1;
    }
    return 0;

  }
  createDelivery(distCenter: string) {
    let fd = this.context.for(FamilyDeliveries).create();
    fd.family.value = this.id.value;
    fd.distributionCenter.value = distCenter;
    fd.special.value = this.special.value;
    fd.basketType.value = this.basketType.value;
    fd.quantity.value = this.quantity.value;
    fd.deliveryComments.value = this.deliveryComments.value;
    fd.courier.value = this.fixedCourier.value;
    this.updateDelivery(fd);
    return fd;
  }
  sharedColumns() {
    return [
      this.name,
      this.familySource,
      this.groups,
      this.address,
      this.floor,
      this.appartment,
      this.entrance,
      this.city,
      this.addressComment,
      this.addressLongitude,
      this.addressLatitude,
      this.drivingLongitude,
      this.drivingLatitude,
      this.addressByGoogle,
      this.addressOk,
      this.phone1,
      this.phone1Description,
      this.phone2,
      this.phone2Description,
      this.phone3,
      this.phone3Description,
      this.phone4,
      this.phone4Description
    ];
  }
  isGpsAddress() {
    return isGpsAddress(this.address.value);
  }
  getAddressDescription() {
    if (this.isGpsAddress()) {
      let r = 'נקודת GPS ';
      r += 'ליד ' + this.addressByGoogle.value;

      return r;
    }
    return this.address.value;
  }
  updateDelivery(fd: FamilyDeliveries) {
    for (const col of this.sharedColumns()) {
      fd.columns.find(col).value = col.value;
    }
  }



  getDeliveries() {
    return this.context.for(FamilyDeliveries).find({ where: d => d.family.isEqualTo(this.id), orderBy: d => [{ column: d.deliveryStatusDate, descending: true }] });
  }

  __disableGeocoding = false;

  constructor(private context: Context) {
    super(
      {
        name: "Families",
        allowApiRead: Roles.distCenterAdmin,
        allowApiUpdate: Roles.distCenterAdmin,
        allowApiDelete: false,
        allowApiInsert: Roles.admin,
        apiDataFilter: () => {
          if (!context.isAllowed(Roles.admin)) {
            if (context.isAllowed(Roles.admin))
              return undefined;
            return this.id.isEqualTo('no rows');
          }
        },
        savingRow: async () => {
          if (this.disableOnSavingRow)
            return;
          if (this.context.onServer) {
            if (!this.quantity.value || this.quantity.value < 1)
              this.quantity.value = 1;
            if (this.sharedColumns().find(x => x.value != x.originalValue)) {
              for (const fd of await context.for(FamilyDeliveries).find({
                where: fd =>
                  fd.familySource.isEqualTo(this.id).and(
                    fd.archive.isEqualTo(false).and(
                      fd.deliverStatus.isGreaterOrEqualTo(DeliveryStatus.ReadyForDelivery).and(
                        fd.deliverStatus.isLessOrEqualTo(DeliveryStatus.Frozen)
                      )))
              })) {
                this.updateDelivery(fd);
                await fd.save();
              }
            }






            if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
              await this.reloadGeoCoding();
            }
            if (this.isNew()) {
              this.createDate.value = new Date();
              this.createUser.value = context.user.id;
            }
            if (this.status.value != this.status.originalValue) {
              this.statusDate.value = new Date();
              this.statusUser.value = context.user.id;
            }

            if (!this._suppressLastUpdateDuringSchemaInit) {
              this.lastUpdateDate.value = new Date();
              this.lastUpdateUser.value = context.user.id;
            }
          }
        }

      });

  }
  disableChangeLogging = false;
  disableOnSavingRow = false;
  _suppressLastUpdateDuringSchemaInit = false;


  name = new StringColumn({
    caption: "שם",
    valueChange: () => this.delayCheckDuplicateFamilies(),
    validate: () => {
      if (!this.name.value || this.name.value.length < 2)
        this.name.validationError = 'השם קצר מידי';
    }
  });

  tz = new StringColumn({
    caption: 'מספר זהות', valueChange: () => this.delayCheckDuplicateFamilies()
  });
  tz2 = new StringColumn({
    caption: 'מספר זהות בן/בת הזוג', valueChange: () => this.delayCheckDuplicateFamilies()
  });
  familyMembers = new NumberColumn({ caption: 'מספר נפשות' });
  birthDate = new DateColumn({ caption: 'תאריך לידה' });
  nextBirthday = new DateColumn({

    caption: 'יומולדת הבא',
    sqlExpression: () => "cast(birthDate + ((extract(year from age(birthDate)) + 1) * interval '1' year) as date) as nextBirthday",
    allowApiUpdate: false,
    dataControlSettings: () => ({
      readOnly: true,
      inputType: 'date',
      getValue: () => {
        if (!this.nextBirthday.value)
          return;
        return this.nextBirthday.displayValue + " - גיל " + (this.nextBirthday.value.getFullYear() - this.birthDate.value.getFullYear())
      }
    })

  })
  basketType = new BasketId(this.context, 'סוג סל ברירת מחדל');
  quantity = new QuantityColumn({ caption: 'מספר סלים ברירת מחדל', allowApiUpdate: Roles.distCenterAdmin });

  familySource = new FamilySourceId(this.context, { includeInApi: true, caption: 'גורם מפנה' });
  socialWorker = new StringColumn('איש קשר לבירור פרטים (עו"ס)');
  socialWorkerPhone1 = new PhoneColumn('עו"ס טלפון 1');
  socialWorkerPhone2 = new PhoneColumn('עו"ס טלפון 2');
  groups = new GroupsColumn(this.context);
  special = new YesNoColumn({ caption: 'שיוך מיוחד' });
  defaultSelfPickup = new BoolColumn('באים לקחת ברירת מחדל');
  iDinExcel = new StringColumn({ caption: 'מזהה באקסל' });
  internalComment = new StringColumn({ caption: 'הערה פנימית - לא תופיע למשנע' });


  address = new StringColumn("כתובת", {
    valueChange: () => {
      if (!this.address.value)
        return;
      let y = parseUrlInAddress(this.address.value);
      if (y != this.address.value)
        this.address.value = y;
    }
  });

  floor = new StringColumn('קומה');
  appartment = new StringColumn('דירה');
  entrance = new StringColumn('כניסה');
  city = new StringColumn({ caption: "עיר (מתעדכן אוטומטית)" });
  addressComment = new StringColumn('הנחיות נוספות לכתובת');
  postalCode = new NumberColumn('מיקוד');
  deliveryComments = new StringColumn('הערה שתופיע למשנע');
  addressApiResult = new StringColumn();

  phone1 = new PhoneColumn({ caption: "טלפון 1", dbName: 'phone', valueChange: () => this.delayCheckDuplicateFamilies() });
  phone1Description = new StringColumn('הערות לטלפון 1');
  phone2 = new PhoneColumn({ caption: "טלפון 2", valueChange: () => this.delayCheckDuplicateFamilies() });
  phone2Description = new StringColumn('הערות לטלפון 2');
  phone3 = new PhoneColumn({ caption: "טלפון 3", valueChange: () => this.delayCheckDuplicateFamilies() });
  phone3Description = new StringColumn('הערות לטלפון 3');
  phone4 = new PhoneColumn({ caption: "טלפון 4", valueChange: () => this.delayCheckDuplicateFamilies() });
  phone4Description = new StringColumn('הערות לטלפון 4');

  status = new FamilyStatusColumn();
  statusDate = new changeDate('סטטוס: תאריך שינוי');
  statusUser = new HelperIdReadonly(this.context, 'סטטוס: מי עדכן');
  fixedCourier = new HelperId(this.context, "משנע ברירת מחדל");
  async reloadGeoCoding() {

    let geo = new GeocodeInformation();
    if (!this.__disableGeocoding)
      geo = await GetGeoInformation(this.address.value, this.context);
    this.addressApiResult.value = geo.saveToString();
    this.city.value = '';
    if (geo.ok()) {
      this.city.value = geo.getCity();
      await this.setPostalCodeServerOnly();
    }
    this.addressOk.value = !geo.partialMatch();
    this.addressByGoogle.value = geo.getAddress();
    this.addressLongitude.value = geo.location().lng;
    this.addressLatitude.value = geo.location().lat;
    if (isGpsAddress(this.address.value)) {
      var j = this.address.value.split(',');
      this.addressLatitude.value = +j[0];
      this.addressLongitude.value = +j[1];
    }
  }

  async setPostalCodeServerOnly() {
    if (!process.env.AUTO_POSTAL_CODE)
      return;
    var geo = this.getGeocodeInformation();
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
        this.postalCode.value = +r.zip;
      }
    }
    catch (err) {
      console.log(err);
    }
  }


  previousDeliveryStatus = new DeliveryStatusColumn({
    caption: 'סטטוס משלוח קודם',
    sqlExpression: () => {
      return this.dbNameFromLastDelivery(fde => fde.deliverStatus, "prevStatus");
    }
  });
  previousDeliveryDate = new changeDate({
    caption: 'תאריך משלוח קודם',

    sqlExpression: () => {
      return this.dbNameFromLastDelivery(fde => fde.deliveryStatusDate, "prevDate");
    }
  });
  previousDeliveryComment = new StringColumn({
    caption: 'הערת משלוח קודם',
    sqlExpression: () => {
      return this.dbNameFromLastDelivery(fde => fde.courierComments, "prevComment");
    }
  });




  //שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
  addressLongitude = new NumberColumn({ decimalDigits: 8 });
  addressLatitude = new NumberColumn({ decimalDigits: 8 });
  //זו התוצאה שחזרה מהGEOCODING כך שהיא מכוונת לכביש הקרוב
  drivingLongitude = new NumberColumn({ decimalDigits: 8 });
  drivingLatitude = new NumberColumn({ decimalDigits: 8 });
  addressByGoogle = new StringColumn({ caption: "כתובת כפי שגוגל הבין", allowApiUpdate: false });
  addressOk = new BoolColumn({ caption: 'כתובת תקינה' });

  private dbNameFromLastDelivery(col: (fd: FamilyDeliveries) => Column<any>, alias: string) {

    let fd = this.context.for(FamilyDeliveries).create();
    let sql = new SqlBuilder();
    return sql.columnInnerSelect(this, {
      select: () => [sql.columnWithAlias(col(fd), alias)],
      from: fd,

      where: () => [sql.eq(fd.family, this.id),
      ],
      orderBy: [{ column: fd.deliveryStatusDate, descending: true }]
    });
  }



  getPreviousDeliveryColumn() {
    return {
      caption: 'סיכום משלוח קודם',
      readonly: true,
      column: this.previousDeliveryStatus,
      dropDown: {
        items: this.previousDeliveryStatus.getOptions()
      },
      getValue: f => {
        if (!f.previousDeliveryStatus.value)
          return '';
        let r = f.previousDeliveryStatus.displayValue;
        if (f.previousDeliveryComment.value) {
          r += ': ' + f.previousDeliveryComment.value
        }
        return r;
      },
      cssClass: f => f.previousDeliveryStatus.getCss()


    } as DataControlSettings<Families>;
  }





  createDate = new changeDate({ caption: 'מועד הוספה' });
  createUser = new HelperIdReadonly(this.context, { caption: 'משתמש מוסיף' });
  lastUpdateDate = new changeDate({ caption: 'מועד עדכון אחרון' });
  lastUpdateUser = new HelperIdReadonly(this.context, { caption: 'משתמש מעדכן' });




  openWaze() {
    //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + 'export &navigate=yes', '_blank');
    window.open('waze://?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + '&navigate=yes');
  }
  openGoogleMaps() {
    window.open('https://www.google.com/maps/search/?api=1&hl=iw&query=' + this.address.value, '_blank');
  }
  showOnGoogleMaps() {
    window.open('https://maps.google.com/maps?q=' + this.getGeocodeInformation().getlonglat() + '&hl=iw', '_blank');
  }
  showOnGovMap() {
    let x = this.getGeocodeInformation().location();
    window.open('https://www.govmap.gov.il/?q=' + this.address.value + '&z=10', '_blank');
  }



  private _lastString: string;
  private _lastGeo: GeocodeInformation;
  getGeocodeInformation() {
    if (this._lastString == this.addressApiResult.value)
      return this._lastGeo ? this._lastGeo : new GeocodeInformation();
    this._lastString = this.addressApiResult.value;
    return this._lastGeo = GeocodeInformation.fromString(this.addressApiResult.value);
  }

  static SendMessageToBrowsers = (s: string, context: Context, distCenter: string) => { };
  static GetUpdateMessage(n: FamilyUpdateInfo, updateType: number, courierName: string) {
    switch (updateType) {
      case 1:
        switch (n.deliverStatus.value) {
          case DeliveryStatus.ReadyForDelivery:
            break;
          case DeliveryStatus.Success:
          case DeliveryStatus.SuccessLeftThere:
          case DeliveryStatus.FailedBadAddress:
          case DeliveryStatus.FailedNotHome:
          case DeliveryStatus.FailedOther:
            let duration = '';
            if (n.courierAssingTime.value && n.deliveryStatusDate.value)
              duration = ' תוך ' + Math.round((n.deliveryStatusDate.value.valueOf() - n.courierAssingTime.value.valueOf()) / 60000) + " דק'";
            return n.deliverStatus.displayValue + (n.courierComments.value ? ", " + n.courierComments.value + " - " : '') + translate(' למשפחת ') + n.name.value + ' על ידי ' + courierName + duration + "!!";
        }
        return translate('משפחת ') + n.name.value + ' עודכנה ל' + n.deliverStatus.displayValue;
      case 2:
        if (n.courier.value)
          return translate('משפחת ') + n.name.value + ' שוייכה ל' + courierName;
        else
          return translate("בוטל השיוך למשפחת ") + n.name.value;
    }
    return n.deliverStatus.displayValue;
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
  _disableAutoDuplicateCheck = false;
  duplicateFamilies: duplicateFamilyInfo[] = [];
  validatePhone(col: PhoneColumn) {
    if (!col.value || col.value == '')
      return;
    if (col.displayValue.startsWith("05") || col.displayValue.startsWith("07")) {
      if (col.displayValue.length != 12) {
        col.validationError = 'מספר טלפון אינו תקין';
      }

    } else if (col.displayValue.startsWith('0')) {
      if (col.displayValue.length != 11) {
        col.validationError = 'מספר טלפון אינו תקין';
      }
    }
    else {
      col.validationError = 'מספר טלפון אינו תקין';
    }
  }
  async checkDuplicateFamilies() {
    this.duplicateFamilies = await Families.checkDuplicateFamilies(this.name.value, this.tz.value, this.tz2.value, this.phone1.value, this.phone2.value, this.phone3.value, this.phone4.value, this.id.value);
    this.tz.validationError = undefined;
    this.tz2.validationError = undefined;
    this.phone1.validationError = undefined;
    this.phone2.validationError = undefined;
    this.phone3.validationError = undefined;
    this.phone4.validationError = undefined;
    this.name.validationError = undefined;
    let foundExactName = false;
    for (const d of this.duplicateFamilies) {
      let errorText = translate('ערך כבר קיים למשפחת "') + d.name + '" בכתובת ' + d.address;
      if (d.tz)
        this.tz.validationError = errorText;
      if (d.tz2)
        this.tz2.validationError = errorText;
      if (d.phone1)
        this.phone1.validationError = errorText;
      if (d.phone2)
        this.phone2.validationError = errorText;
      if (d.phone3)
        this.phone3.validationError = errorText;
      if (d.phone4)
        this.phone4.validationError = errorText;
      if (d.nameDup && this.name.value != this.name.originalValue) {
        if (!foundExactName)
          this.name.validationError = errorText;
        if (this.name.value && d.name && this.name.value.trim() == d.name.trim())
          foundExactName = true;
      }
    }
    this.validatePhone(this.phone1);
    this.validatePhone(this.phone2);
    this.validatePhone(this.phone3);
    this.validatePhone(this.phone4);


  }
  @ServerFunction({ allowed: Roles.admin, blockUser: false })
  static async checkDuplicateFamilies(name: string, tz: string, tz2: string, phone1: string, phone2: string, phone3: string, phone4: string, id: string, exactName: boolean = false, context?: Context, db?: SqlDatabase) {
    let result: duplicateFamilyInfo[] = [];

    var sql = new SqlBuilder();
    var f = context.for(Families).create();

    let compareAsNumber = (col: Column<string>, value: string) => {
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
      sql.columnWithAlias(nameCol, 'nameDup')

      ],

      from: f,
      where: () => [sql.or(tzCol, tz2Col, phone1Col, phone2Col, phone3Col, phone4Col, nameCol), sql.ne(f.id, sql.str(id))]
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
        nameDup: row[sqlResult.getColumnKeyInResultForIndexInSelect(9)]

      });
    }
    return result;

  }
}

export class FamilyId extends IdColumn { }

export interface duplicateFamilyInfo {
  id: string;
  name: string;
  address: string;
  tz: boolean;
  tz2: boolean;
  phone1: boolean;
  phone2: boolean;
  phone3: boolean;
  phone4: boolean;
  nameDup: boolean;
}

export interface FamilyUpdateInfo {
  name: StringColumn,
  courier: HelperId,
  deliverStatus: DeliveryStatusColumn,
  courierAssingTime: changeDate,
  deliveryStatusDate: changeDate,
  courierComments: StringColumn
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
export class GroupsColumn extends StringColumn {
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
  constructor(private context: Context, settingsOrCaption?: ColumnOptions<string>) {
    super({
      caption: 'שיוך לקבוצת חלוקה',

      dataControlSettings: () => ({
        width: '300',
        click: () => {
          this.context.openDialog(UpdateGroupDialogComponent, s => {
            s.init({
              groups: this.value,
              ok: x => this.value = x
            })
          });
        }
      })
    }, settingsOrCaption);
  }
  selected(group: string) {
    if (!this.value)
      return false;
    return this.value.indexOf(group) >= 0;
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





export function displayDupInfo(info: duplicateFamilyInfo) {
  let r = [];


  if (info.tz) {
    r.push(' מספר זהות זהה');
  }
  if (info.phone1 || info.phone2 || info.phone3 || info.phone4) {
    r.push(' מספר טלפון זהה');
  }
  if (info.nameDup) {
    r.push(" שם דומה");
  }
  return info.address + ": " + r.join(', ');
}