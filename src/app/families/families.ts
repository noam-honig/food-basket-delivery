import { DeliveryStatus, DeliveryStatusColumn } from "./DeliveryStatus";
import { CallStatusColumn } from "./CallStatus";
import { YesNoColumn } from "./YesNo";
import { LanguageColumn } from "./Language";
import { FamilySourceId } from "./FamilySources";
import { BasketId } from "./BasketType";
import { NumberColumn, StringColumn, IdEntity, Id, changeDate, DateTimeColumn, SqlBuilder } from "../model-shared/types";
import { ColumnSetting, Column } from "radweb";
import { HelperIdReadonly, HelperId, Helpers } from "../helpers/helpers";
import { myAuthInfo } from "../auth/my-auth-info";
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { Context, EntityClass } from "../shared/context";
import { DeliveryEvents } from "../delivery-events/delivery-events";
import { FamilyDelveryEventId, FamilyDeliveryEvents } from "../delivery-events/FamilyDeliveryEvents";


@EntityClass
export class Families extends IdEntity<FamilyId>  {

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

            if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
              let geo = await GetGeoInformation(this.address.value);
              this.addressApiResult.value = geo.saveToString();
              this.city.value = '';
              if (geo.ok()) {
                this.city.value = geo.getCity();
              }
            }
            if (this.isNew()) {
              this.createDate.dateValue = new Date();
              this.createUser.value = context.info.helperId;
            }
            let logChanged = (col: Column<any>, dateCol: DateTimeColumn, user: HelperId, wasChanged: (() => void)) => {
              if (col.value != col.originalValue) {
                dateCol.dateValue = new Date();
                user.value = context.info.helperId;
                wasChanged();
              }
            }
            if (!this.disableChangeLogging) {
              logChanged(this.courier, this.courierAssingTime, this.courierAssignUser, async () => Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 2, await this.courier.getTheName())));//should be after succesfull save
              logChanged(this.callStatus, this.callTime, this.callHelper, () => { });
              logChanged(this.deliverStatus, this.deliveryStatusDate, this.deliveryStatusUser, async () => Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 1, await this.courier.getTheName()))); //should be after succesfull save
            }
          }
        }

      });
    this.initColumns();
    if (!context.isAdmin())
      this.__iterateColumns().forEach(c => c.readonly = c != this.courierComments && c != this.deliverStatus);
  }
  disableChangeLogging = false;


  name = new StringColumn({
    caption: "שם",
    onValidate: v => {
      if (!v.value || v.value.length < 2)
        this.name.error = 'השם קצר מידי';
    }
  });
  familyMembers = new NumberColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'מספר נפשות' });
  language = new LanguageColumn();
  basketType = new BasketId(this.context, 'סוג סל');
  familySource = new FamilySourceId(this.context, { excludeFromApi: !this.context.isAdmin(), caption: 'גורם מפנה' });
  special = new YesNoColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'שיוך מיוחד' });
  iDinExcel = new StringColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'מזהה באקסל' });
  internalComment = new StringColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'הערה פנימית - לא תופיע למשנע' });


  address = new StringColumn("כתובת");
  floor = new StringColumn('קומה');
  appartment = new StringColumn('דירה');
  addressComment = new StringColumn('הערת כתובת');
  deliveryComments = new StringColumn('הערות למשנע');
  addressApiResult = new StringColumn();
  city = new StringColumn({ caption: "עיר כפי שגוגל הבין", readonly: true });

  phone1 = new StringColumn({ caption: "טלפון 1", inputType: 'tel', dbName: 'phone' });
  phone1Description = new StringColumn('תאור טלפון 1');
  phone2 = new StringColumn({ caption: "טלפון 2", inputType: 'tel' });
  phone2Description = new StringColumn('תאור טלפון 2');



  callStatus = new CallStatusColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'סטטוס שיחה' });
  callTime = new changeDate({ excludeFromApi: !this.context.isAdmin(), caption: 'מועד שיחה' });
  callHelper = new HelperIdReadonly(this.context, { excludeFromApi: !this.context.isAdmin(), caption: 'מי ביצעה את השיחה' });
  callComments = new StringColumn({ excludeFromApi: !this.context.isAdmin(), caption: 'הערות שיחה' });


  courier = new HelperId(this.context, "משנע");
  courierAssignUser = new HelperIdReadonly(this.context, 'מי שייכה למשנע');

  courierAssignUserName = new StringColumn({
    caption: 'שם שיוך למשנע',
    virtualData: async () => (await this.context.for(Helpers).lookupAsync(this.courierAssignUser)).name.value
  });
  courierAssignUserPhone = new StringColumn({
    caption: 'טלפון שיוך למשנע',
    virtualData: async () => (await this.context.for(Helpers).lookupAsync(this.courierAssignUser)).phone.value
  });
  courierAssingTime = new changeDate('מועד שיוך למשנע');


  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  deliveryStatusUser = new HelperIdReadonly(this.context, 'מי עדכן את סטטוס המשלוח');
  routeOrder = new NumberColumn();
  courierComments = new StringColumn('הערות מסירה');

  readyFilter(city?: string, language?: number) {
    let where = this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery.id).and(
      this.courier.isEqualTo(''));
    if (language > -1)
      where = where.and(this.language.isEqualTo(language));
    if (city) {
      where = where.and(this.city.isEqualTo(city));
    }
    return where;
  }
  private dbNameFromLastDelivery(col: (fde: FamilyDeliveryEvents) => Column<any>, alias: string) {

    let de = new DeliveryEvents(this.context);
    let fde = new FamilyDeliveryEvents(this.context);
    let sql = new SqlBuilder();
    return sql.columnInnerSelect(this, {
      select: () => [sql.columnWithAlias(col(fde), alias)],
      from: de,
      outerJoin: () => [{ to: fde, on: () => [sql.eq(fde.deliveryEvent, de.id)] }],
      where: () => [sql.eq(fde.family, this.id),
      sql.ne(de.isActiveEvent, true),
      sql.not(sql.in(fde.deliverStatus, DeliveryStatus.NotInEvent.id)),
      sql.ne(fde.courier, "''")
      ],
      orderBy: [{ column: de.deliveryDate, descending: true }]
    });
  }

  previousDeliveryStatus = new DeliveryStatusColumn({
    caption: 'סטטוס שינוע קודם',
    dbReadOnly: true,
    dbName: () => {
      return this.dbNameFromLastDelivery(fde => fde.deliverStatus, "prevStatus");
    }
  });
  previousDeliveryComment = new StringColumn({
    caption: 'הערת שינוע קודם',
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
  courierBeenHereBefore() {
    return this.previousCourier.value == this.courier.value;
  }
  getPreviousDeliveryColumn() {
    return {
      caption: 'שינוע קודם',
      getValue: f => {
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
    switch (this.deliverStatus.listValue) {
      case DeliveryStatus.ReadyForDelivery:
        if (this.courier.value) {
          return this.courier.getValue() + ' יצא ' + this.courierAssingTime.relativeDateName();
        }
        break;
      case DeliveryStatus.Success:
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedOther:
        let duration = '';
        if (this.courierAssingTime.value && this.deliveryStatusDate.value)
          duration = ' תוך ' + Math.round((this.deliveryStatusDate.dateValue.valueOf() - this.courierAssingTime.dateValue.valueOf()) / 60000) + " דק'";
        return this.deliverStatus.displayValue + (this.courierComments.value ? ", " + this.courierComments.value + " - " : '') + (this.courier.value ? ' על ידי ' + this.courier.getValue() : '') + ' ' + this.deliveryStatusDate.relativeDateName() + duration;

    }
    return this.deliverStatus.displayValue;
  }
  getShortDeliveryDescription() {
    switch (this.deliverStatus.listValue) {
      case DeliveryStatus.ReadyForDelivery:
        if (this.courier.value) {
          return this.courier.getValue() + ' יצא ' + this.courierAssingTime.relativeDateName();
        }
        break;
      case DeliveryStatus.Success:
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedOther:

        return this.deliverStatus.displayValue;

    }
    return this.deliverStatus.displayValue;
  }


  createDate = new changeDate({ excludeFromApi: !this.context.isAdmin(), caption: 'מועד הוספה' });
  createUser = new HelperIdReadonly(this.context, { excludeFromApi: !this.context.isAdmin(), caption: 'משתמש מוסיף' });

  excludeColumns(info: myAuthInfo) {
    if (info && info.deliveryAdmin)
      return [];
    return [this.internalComment, this.callComments, this.callHelper, this.callStatus, this.callTime, this.createDate, this.createUser, this.familySource, this.familyMembers, this.special];
  }



  openWaze() {
    //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + 'export &navigate=yes', '_blank');
    window.open('waze://?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + '&navigate=yes');
  }
  openGoogleMaps() {
    window.open('https://www.google.com/maps/search/?api=1&query=' + this.address.value, '_blank');
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
        switch (n.deliverStatus.listValue) {
          case DeliveryStatus.ReadyForDelivery:
            break;
          case DeliveryStatus.Success:
          case DeliveryStatus.FailedBadAddress:
          case DeliveryStatus.FailedNotHome:
          case DeliveryStatus.FailedOther:
            let duration = '';
            if (n.courierAssingTime.value && n.deliveryStatusDate.value)
              duration = ' תוך ' + Math.round((n.deliveryStatusDate.dateValue.valueOf() - n.courierAssingTime.dateValue.valueOf()) / 60000) + " דק'";
            return n.deliverStatus.displayValue + (n.courierComments.value ? ", " + n.courierComments.value + " - " : '') + ' למשפחת ' + n.name.value + ' על ידי ' + courierName + duration;
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
}
export class FamilyId extends Id { }



@EntityClass
export class FamiliesSmall extends IdEntity<FamilyId>  {
  constructor(private context: Context) {
    super(new FamilyId(),
      {
        name: "FamiliesSmall",
        allowApiRead: false,
        allowApiUpdate: false,
        allowApiDelete: false,
        allowApiInsert: false,
        dbName: () => {
          let f = context.for(Families);
          return f.create().__getDbName();
        }


      });
    this.initColumns();

  }



}





export interface FamilyUpdateInfo {
  name: StringColumn,
  courier: HelperId,
  deliverStatus: DeliveryStatusColumn,
  courierAssingTime: changeDate,
  deliveryStatusDate: changeDate,
  courierComments: StringColumn
} 