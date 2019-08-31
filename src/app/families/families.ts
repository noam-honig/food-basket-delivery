import { DeliveryStatus, DeliveryStatusColumn } from "./DeliveryStatus";
import { CallStatusColumn } from "./CallStatus";
import { YesNoColumn } from "./YesNo";

import { FamilySourceId } from "./FamilySources";
import { BasketId, BasketType } from "./BasketType";
import { NumberColumn, StringColumn, IdEntity, Id, changeDate, DateTimeColumn, SqlBuilder, BoolColumn, PhoneColumn, delayWhileTyping } from "../model-shared/types";
import { ColumnSetting, Column, FilterConsumerBridgeToSqlRequest } from "radweb";
import { HelperIdReadonly, HelperId, Helpers } from "../helpers/helpers";
import { myAuthInfo } from "../auth/my-auth-info";
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { Context, EntityClass, DirectSQL } from "../shared/context";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { FamilyDeliveries } from "./FamilyDeliveries";
import { RunOnServer } from "../auth/server-action";
import * as fetch from 'node-fetch';
import { SelectServiceInterface } from "../select-popup/select-service-interface";


@EntityClass
export class Families extends IdEntity<FamilyId>  {
  setNewBasket() {
    if (this.defaultSelfPickup.value) {
      this.deliverStatus.value = DeliveryStatus.SelfPickup;
      this.courier.value = '';
    }
    else {
      this.deliverStatus.value = DeliveryStatus.ReadyForDelivery;
      if (this.courier.value == this.courier.originalValue) {
        this.courier.value = this.fixedCourier.value;
        this.courierAssignUser.value = this.context.info.helperId;
        this.courierAssingTime.value = new Date();
      }
    }
  }
  getDeliveries() {
    return this.context.for(FamilyDeliveries).find({ where: d => d.family.isEqualTo(this.id), orderBy: d => [{ column: d.deliveryStatusDate, descending: true }] });
  }

  constructor(private context: Context) {
    super(new FamilyId(),
      {
        name: "Families",
        allowApiRead: context.isLoggedIn(),
        allowApiUpdate: context.isLoggedIn(),
        allowApiDelete: context.isAdmin(),
        allowApiInsert: context.isAdmin(),
        apiDataFilter: () => {
          if (!context.isAdmin())
            return this.courier.isEqualTo(context.info.helperId);
        },
        onSavingRow: async () => {

          if (this.context.onServer) {
            if (!this.correntAnErrorInStatus.value && DeliveryStatus.IsAResultStatus(this.deliverStatus.originalValue) && !DeliveryStatus.IsAResultStatus(this.deliverStatus.value)) {
              var fd = this.context.for(FamilyDeliveries).create();
              fd.family.value = this.id.value;
              fd.basketType.value = this.basketType.originalValue;
              fd.deliverStatus.value = this.deliverStatus.originalValue;
              fd.courier.value = this.courier.originalValue;
              fd.courierComments.value = this.courierComments.originalValue;
              fd.deliveryStatusDate.value = this.deliveryStatusDate.originalValue;
              fd.courierAssignUser.value = this.courierAssignUser.originalValue;
              fd.courierAssingTime.value = this.courierAssingTime.originalValue;
              fd.archiveFamilySource.value = this.familySource.originalValue;
              fd.archiveGroups.value = this.groups.value;
              fd.archive_address.value = this.address.originalValue;

              fd.archive_floor.value = this.floor.originalValue;
              fd.archive_appartment.value = this.appartment.originalValue;
              fd.archive_entrance.value = this.entrance.originalValue;
              fd.archive_postalCode.value = this.postalCode.originalValue;
              fd.archive_city.value = this.city.originalValue;
              fd.archive_addressComment.value = this.addressComment.originalValue;
              fd.archive_deliveryComments.value = this.deliveryComments.originalValue;
              fd.archive_phone1.value = this.phone1.originalValue;
              fd.archive_phone1Description.value = this.phone1Description.originalValue;
              fd.archive_phone2.value = this.phone2.originalValue;
              fd.archive_phone2Description.value = this.phone2Description.originalValue;
              fd.archive_addressLongitude.value = this.addressLongitude.originalValue;
              fd.archive_addressLatitude.value = this.addressLatitude.originalValue;
              await fd.save();
              if (this.courier.value == this.courier.originalValue) {
                this.courier.value = this.fixedCourier.value;
                this.courierAssignUser.value = this.context.info.helperId;
                this.courierAssingTime.value = new Date();
              }
              if (this.courierComments.value == this.courierComments.originalValue)
                this.courierComments.value = '';
            }


            if (this.fixedCourier.value && !this.fixedCourier.originalValue && !this.courier.value && this.deliverStatus.value == DeliveryStatus.ReadyForDelivery) {
              this.courier.value = this.fixedCourier.value;
            }
            if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
              let geo = await GetGeoInformation(this.address.value);
              this.addressApiResult.value = geo.saveToString();
              this.city.value = '';
              if (geo.ok()) {
                this.city.value = geo.getCity();
                await this.setPostalCodeServerOnly();
              }
              this.addressOk.value = !geo.partialMatch();
              this.addressLongitude.value = geo.location().lng;
              this.addressLatitude.value = geo.location().lat;

            }
            if (this.isNew()) {
              this.createDate.value = new Date();
              this.createUser.value = context.info.helperId;
            }
            let logChanged = (col: Column<any>, dateCol: DateTimeColumn, user: HelperId, wasChanged: (() => void)) => {
              if (col.value != col.originalValue) {
                dateCol.value = new Date();
                user.value = context.info.helperId;
                wasChanged();
              }
            }
            if (!this.disableChangeLogging) {
              logChanged(this.courier, this.courierAssingTime, this.courierAssignUser, async () => Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 2, await this.courier.getTheName())));//should be after succesfull save
              //logChanged(this.callStatus, this.callTime, this.callHelper, () => { });
              logChanged(this.deliverStatus, this.deliveryStatusDate, this.deliveryStatusUser, async () => Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 1, await this.courier.getTheName()))); //should be after succesfull save
            }
          }
        }

      });
    this.initColumns();
    if (!context.isAdmin())
      this.__iterateColumns().forEach(c => c.readonly = c != this.courierComments && c != this.deliverStatus && c != this.correntAnErrorInStatus);
  }
  disableChangeLogging = false;


  name = new StringColumn({
    caption: "שם",
    valueChange: () => this.delayCheckDuplicateFamilies(),
    onValidate: v => {
      if (!v.value || v.value.length < 2)
        this.name.error = 'השם קצר מידי';
    }
  });

  tz = new StringColumn({
    caption: 'מספר זהות', excludeFromApi: !this.context.isAdmin(), valueChange: () => this.delayCheckDuplicateFamilies()
  });
  familyMembers = new NumberColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'מספר נפשות' });

  basketType = new BasketId(this.context, 'סוג סל');
  familySource = new FamilySourceId(this.context, { excludeFromApi: !this.context.isAdmin(), caption: 'גורם מפנה' });
  groups = new GroupsColumn(this.context);
  special = new YesNoColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'שיוך מיוחד' });
  defaultSelfPickup = new BoolColumn('ברירת מחדל באים לקחת');
  iDinExcel = new StringColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'מזהה באקסל' });
  internalComment = new StringColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'הערה פנימית - לא תופיע למשנע' });


  address = new StringColumn("כתובת");
  floor = new StringColumn('קומה');
  appartment = new StringColumn('דירה');
  entrance = new StringColumn('כניסה');
  city = new StringColumn({ caption: "עיר (מתעדכן אוטומטית)" });
  addressComment = new StringColumn('הערת כתובת');
  postalCode = new NumberColumn('מיקוד');
  deliveryComments = new StringColumn('הערה שתופיע למשנע');
  addressApiResult = new StringColumn();

  phone1 = new PhoneColumn({ caption: "טלפון 1", inputType: 'tel', dbName: 'phone', valueChange: () => this.delayCheckDuplicateFamilies() });
  phone1Description = new StringColumn('תאור טלפון 1');
  phone2 = new PhoneColumn({ caption: "טלפון 2", inputType: 'tel', valueChange: () => this.delayCheckDuplicateFamilies() });
  phone2Description = new StringColumn('תאור טלפון 2');



  //callStatus = new CallStatusColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'סטטוס שיחה' });
  //callTime = new changeDate({ excludeFromApi: !this.context.isAdmin(), caption: 'מועד שיחה' });
  //callHelper = new HelperIdReadonly(this.context, { excludeFromApi: !this.context.isAdmin(), caption: 'מי ביצעה את השיחה' });
  //callComments = new StringColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'הערות שיחה' });

  deliverStatus = new DeliveryStatusColumn('סטטוס משלוח');
  correntAnErrorInStatus = new BoolColumn({ virtualData: () => false });
  courier = new HelperId(this.context, "משנע באירוע");
  courierComments = new StringColumn('הערות שכתב המשנע כשמסר');
  deliveryStatusDate = new changeDate('מועד סטטוס משלוח');
  fixedCourier = new HelperId(this.context, "משנע קבוע");
  courierAssignUser = new HelperIdReadonly(this.context, 'מי שייכה למשנע');


  courierAssignUserName = new StringColumn({
    caption: 'שם שיוך למשנע',
    virtualData: async () => (await this.context.for(Helpers).lookupAsync(this.courierAssignUser)).name.value
  });
  courierAssignUserPhone = new PhoneColumn({
    caption: 'טלפון שיוך למשנע',
    virtualData: async () => (await this.context.for(Helpers).lookupAsync(this.courierAssignUser)).phone.value
  });

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

  courierHelpName() {
    if (ApplicationSettings.get(this.context).helpText.value)
      return ApplicationSettings.get(this.context).helpText.value;
    return this.courierAssignUser.displayValue;
  }
  courierHelpPhone() {
    if (ApplicationSettings.get(this.context).helpText.value)
      return ApplicationSettings.get(this.context).helpPhone.displayValue;
    return this.courierAssignUserPhone.displayValue;
  }

  courierAssingTime = new changeDate('מועד שיוך למשנע');




  deliveryStatusUser = new HelperIdReadonly(this.context, 'מי עדכן את סטטוס המשלוח');
  blockedBasket = new BoolColumn({
    caption: 'סל חסום',
    dbReadOnly: true,
    dbName: () => {
      let b = new BasketType(this.context);

      let sql = new SqlBuilder();
      return sql.columnInnerSelect(this, {
        select: () => [sql.columnWithAlias(b.blocked, "blockedBasket")],
        from: b,
        where: () => [sql.eq(b.id, this.basketType),
        ]
      });
    }
  });
  routeOrder = new NumberColumn();
  previousDeliveryStatus = new DeliveryStatusColumn({
    caption: 'סטטוס משלוח קודם',
    dbReadOnly: true,
    dbName: () => {
      return this.dbNameFromLastDelivery(fde => fde.deliverStatus, "prevStatus");
    }
  });
  previousDeliveryComment = new StringColumn({
    caption: 'הערת משלוח קודם',
    dbReadOnly: true,
    dbName: () => {
      return this.dbNameFromLastDelivery(fde => fde.courierComments, "prevComment");
    }
  });
  previousCourier = new HelperIdReadonly(this.context, {
    caption: 'משנע  קודם',
    dbReadOnly: true,
    dbName: () => {
      return this.dbNameFromLastDelivery(fde => fde.courier, "prevCourier");
    }
  });
  visibleToCourier = new BoolColumn({
    dbReadOnly: true,
    dbName: () => {
      var sql = new SqlBuilder();
      return sql.case([{ when: [sql.or(sql.gtAny(this.deliveryStatusDate, 'current_date -1'), this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery))], then: true }], false);

    }
  });


  addressLongitude = new NumberColumn({ decimalDigits: 8 });
  addressLatitude = new NumberColumn({ decimalDigits: 8 });
  addressOk = new BoolColumn({ caption: 'כתובת תקינה' });

  readyFilter(city?: string, group?: string) {
    let where = this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
      this.courier.isEqualTo('')).and(this.blockedBasket.isEqualTo(false));
    if (group)
      where = where.and(this.groups.isContains(group));
    if (city) {
      where = where.and(this.city.isEqualTo(city));
    }
    return where;
  }
  private dbNameFromLastDelivery(col: (fd: FamilyDeliveries) => Column<any>, alias: string) {

    let fd = new FamilyDeliveries(this.context);
    let sql = new SqlBuilder();
    return sql.columnInnerSelect(this, {
      select: () => [sql.columnWithAlias(col(fd), alias)],
      from: fd,

      where: () => [sql.eq(fd.family, this.id),
      ],
      orderBy: [{ column: fd.deliveryStatusDate, descending: true }]
    });
  }


  courierBeenHereBefore() {
    return this.previousCourier.value == this.courier.value;
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


    } as ColumnSetting<Families>;
  }

  addressByGoogle() {
    let r: ColumnSetting<Families> = {
      caption: 'כתובת כפי שגוגל הבין',
      getValue: f => f.getGeocodeInformation().getAddress()


    }
    return r;
  }
  getDeliveryDescription() {
    switch (this.deliverStatus.value) {
      case DeliveryStatus.ReadyForDelivery:
        if (this.courier.value) {
          return this.courier.getValue() + ' יצא ' + this.courierAssingTime.relativeDateName();
        }
        break;
      case DeliveryStatus.Success:
      case DeliveryStatus.SuccessLeftThere:
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedOther:
        let duration = '';
        if (this.courierAssingTime.value && this.deliveryStatusDate.value)
          duration = ' תוך ' + Math.round((this.deliveryStatusDate.value.valueOf() - this.courierAssingTime.value.valueOf()) / 60000) + " דק'";
        return this.deliverStatus.displayValue + (this.courierComments.value ? ", " + this.courierComments.value + " - " : '') + (this.courier.value ? ' על ידי ' + this.courier.getValue() : '') + ' ' + this.deliveryStatusDate.relativeDateName() + duration;

    }
    return this.deliverStatus.displayValue;
  }
  getShortDeliveryDescription() {
    switch (this.deliverStatus.value) {
      case DeliveryStatus.ReadyForDelivery:
        if (this.courier.value) {
          return this.courier.getValue() + ' יצא ' + this.courierAssingTime.relativeDateName();
        }
        break;
    }
    return this.deliverStatus.displayValue;
  }


  createDate = new changeDate({ excludeFromApi: !this.context.isAdmin(), caption: 'מועד הוספה' });
  createUser = new HelperIdReadonly(this.context, { excludeFromApi: !this.context.isAdmin(), caption: 'משתמש מוסיף' });




  openWaze() {
    //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + 'export &navigate=yes', '_blank');
    window.open('waze://?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + '&navigate=yes');
  }
  openGoogleMaps() {
    window.open('https://www.google.com/maps/search/?api=1&hl=iw&query=' + this.address.value, '_blank');
  }



  private _lastString: string;
  private _lastGeo: GeocodeInformation;
  getGeocodeInformation() {
    if (this._lastString == this.addressApiResult.value)
      return this._lastGeo ? this._lastGeo : new GeocodeInformation();
    this._lastString = this.addressApiResult.value;
    return this._lastGeo = GeocodeInformation.fromString(this.addressApiResult.value);
  }

  static SendMessageToBrowsers = (s: string) => { };
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
            return n.deliverStatus.displayValue + (n.courierComments.value ? ", " + n.courierComments.value + " - " : '') + ' למשפחת ' + n.name.value + ' על ידי ' + courierName + duration + "!!";
        }
        return 'משפחת ' + n.name.value + ' עודכנה ל' + n.deliverStatus.displayValue;
      case 2:
        if (n.courier.value)
          return 'משפחת ' + n.name.value + ' שוייכה ל' + courierName;
        else
          return "בוטל השיוך למשפחת " + n.name.value;
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
  async checkDuplicateFamilies() {
    this.duplicateFamilies = await Families.checkDuplicateFamilies(this.name.value, this.tz.value, this.phone1.value, this.phone2.value, this.id.value);
    this.tz.error = undefined;
    this.phone1.error = undefined;
    this.phone2.error = undefined;
    this.name.error = undefined;
    let foundExactName = false;
    for (const d of this.duplicateFamilies) {
      let errorText = 'ערך כבר קיים למשפחת "' + d.name + '" בכתובת ' + d.address;
      if (d.tz)
        this.tz.error = errorText;
      if (d.phone1)
        this.phone1.error = errorText;
      if (d.phone2)
        this.phone2.error = errorText;
      if (d.nameDup && this.name.value != this.name.originalValue) {
        if (!foundExactName)
          this.name.error = errorText;
        if (this.name.value && d.name && this.name.value.trim() == d.name.trim())
          foundExactName = true;
      }
    }

  }
  @RunOnServer({ allowed: x => x.isAdmin() })
  static async checkDuplicateFamilies(name: string, tz: string, phone1: string, phone2: string, id: string, context?: Context, directSQL?: DirectSQL) {
    let result: duplicateFamilyInfo[] = [];

    var sql = new SqlBuilder();
    var f = new Families(context);

    let compareAsNumber = (col: Column<string>, value: string) => {
      return sql.and(sql.eq(sql.extractNumber(col), sql.extractNumber(sql.str(value))), sql.build(sql.extractNumber(sql.str(value)), ' <> ', 0));
    };
    let tzCol = compareAsNumber(f.tz, tz);
    let phone1Col = sql.or(compareAsNumber(f.phone1, phone1), compareAsNumber(f.phone2, phone1));
    let phone2Col = sql.or(compareAsNumber(f.phone1, phone2), compareAsNumber(f.phone2, phone2));
    let nameCol = 'false';
    if (name && name.trim().length > 0)
      nameCol = sql.build('trim(', f.name, ') like  ', sql.str('%' + name.trim() + '%'));


    let sqlResult = await directSQL.execute(sql.query({
      select: () => [f.id,
      f.name,
      f.address,
      sql.columnWithAlias(tzCol, 'tz'),
      sql.columnWithAlias(phone1Col, 'phone1'),
      sql.columnWithAlias(phone2Col, 'phone2'),
      sql.columnWithAlias(nameCol, 'nameDup')

      ],

      from: f,
      where: () => [sql.or(tzCol, phone1Col, phone2Col, nameCol), sql.ne(f.id, sql.str(id))]
    }));
    if (!sqlResult.rows || sqlResult.rows.length < 1)
      return [];

    for (const row of sqlResult.rows) {
      result.push({
        id: row[sqlResult.fields[0].name],
        name: row[sqlResult.fields[1].name],
        address: row[sqlResult.fields[2].name],
        tz: row[sqlResult.fields[3].name],
        phone1: row[sqlResult.fields[4].name],
        phone2: row[sqlResult.fields[5].name],
        nameDup: row[sqlResult.fields[6].name]

      });
    }
    return result;

  }
}
export class FamilyId extends Id { }

export interface duplicateFamilyInfo {
  id: string;
  name: string;
  address: string;
  tz: boolean;
  phone1: boolean;
  phone2: boolean;
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
  constructor(private context: Context) {
    super({ caption: 'קבוצות', excludeFromApi: !context.isAdmin() });
  }
  getColumn(dialog: SelectServiceInterface) {
    return {
      column: this,
      click: f => {
        let col = f ? f.__getColumn(this) : this;
        dialog.updateGroup(col.value, x => col.value = x);
      },
      width:'300'
    };
  }
}