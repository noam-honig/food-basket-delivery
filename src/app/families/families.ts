import { IdEntity, Id, changeDate, DateTimeColumn, HasAsyncGetTheValue, buildSql } from "../model-shared/types";
import { StringColumn, NumberColumn, ClosedListColumn, ColumnSetting, Column, Entity } from "radweb";
import { DataColumnSettings, DataProviderFactory } from "radweb/utils/dataInterfaces1";
import { HelperIdReadonly, HelperId, Helpers } from "../helpers/helpers";
import { myAuthInfo } from "../auth/my-auth-info";
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { evilStatics } from "../auth/evil-statics";

export class Families extends IdEntity<FamilyId>{


    name = new StringColumn({
      caption: "שם",
      onValidate: v => {
        if (!v.value || v.value.length < 2)
          this.name.error = 'השם קצר מידי';
      }
    });
    familyMembers = new NumberColumn('מספר נפשות');
    language = new LanguageColumn();
    basketType = new BasketId('סוג סל');
    familySource = new FamilySourceId('גורם מפנה');
    special = new YesNoColumn('שיוך מיוחד');
    internalComment = new StringColumn('הערה פנימית - לא תופיע למשנע');
  
  
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
  
  
  
    callStatus = new CallStatusColumn('סטטוס שיחה');
    callTime = new changeDate('מועד שיחה');
    callHelper = new HelperIdReadonly('מי ביצעה את השיחה');
    callComments = new StringColumn('הערות שיחה');
  
  
    courier = new HelperId("משנע");
    courierAssignUser = new HelperIdReadonly('מי שייכה למשנע');
    courierAssignUserName = new StringColumn({
      caption: 'שם שיוך למשנע',
      virtualData: async () => (await this.lookupAsync(new Helpers(), this.courierAssignUser)).name.value
    });
    courierAssignUserPhone = new StringColumn({
      caption: 'שם שיוך למשנע',
      virtualData: async () => (await this.lookupAsync(new Helpers(), this.courierAssignUser)).phone.value
    });
    courierAssingTime = new changeDate('מועד שיוך למשנע');
  
  
    deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
    deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
    deliveryStatusUser = new HelperIdReadonly('מי עדכן את סטטוס המשלוח');
    routeOrder = new NumberColumn();
    courierComments = new StringColumn('הערות מסירה');
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
          return this.deliverStatus.displayValue + ' על ידי ' + this.courier.getValue() + ' ' + this.deliveryStatusDate.relativeDateName() + duration;
  
      }
      return this.deliverStatus.displayValue;
    }
  
  
    createDate = new changeDate('מועד הוספה');
    createUser = new HelperIdReadonly('משתמש מוסיף');
  
    excludeColumns(info: myAuthInfo) {
      if (info && info.admin)
        return [];
      return [this.internalComment, this.callComments,this.callHelper, this.callStatus,this.callTime, this.createDate, this.createUser, this.familySource, this.familyMembers, this.special];
    }
  
  
  
    openWaze() {
      //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + '&navigate=yes', '_blank');
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
    constructor(source?: DataProviderFactory) {
      super(new FamilyId(), () => new Families(source), source ? source : evilStatics.dataSource, "Families");
      this.initColumns();
    }
    async doSave(authInfo: myAuthInfo) {
      await this.doSaveStuff(authInfo);
      await this.save();
    }
    async doSaveStuff(authInfo: myAuthInfo) {
      if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
        let geo = await GetGeoInformation(this.address.value);
        this.addressApiResult.value = geo.saveToString();
        this.city.value = '';
        if (geo.ok()) {
          this.city.value = geo.getCity();
        }
      }
      let logChanged = (col: Column<any>, dateCol: DateTimeColumn, user: HelperId, wasChanged: (() => void)) => {
        if (col.value != col.originalValue) {
          dateCol.dateValue = new Date();
          user.value = authInfo.helperId;
          wasChanged();
        }
      }
      if (this.isNew()) {
        this.createDate.dateValue = new Date();
        this.createUser.value = authInfo.helperId;
      }
  
      logChanged(this.courier, this.courierAssingTime, this.courierAssignUser, async () => Families.SendMessageToBrowsers(NewsUpdate.GetUpdateMessage(this, 2, await this.courier.getTheName())));//should be after succesfull save
      logChanged(this.callStatus, this.callTime, this.callHelper, () => { });
      logChanged(this.deliverStatus, this.deliveryStatusDate, this.deliveryStatusUser, async () => Families.SendMessageToBrowsers(NewsUpdate.GetUpdateMessage(this, 1, await this.courier.getTheName()))); //should be after succesfull save
    }
    static SendMessageToBrowsers = (s: string) => { };
  }
  export class FamilyId extends Id { }

  export class LanguageColumn extends ClosedListColumn<Language> {
    constructor() {
      super(Language, "שפה ראשית");
    }
  
  
  }
  
  export class Language {
    static Hebrew = new Language(0, 'עברית');
    static Russian = new Language(10, 'רוסית');
    static Amharit = new Language(20, 'אמהרית');
    constructor(public id: number,
      private caption: string) {
  
    }
    toString() {
      return this.caption;
    }
  
  }
  export class BasketId extends Id implements HasAsyncGetTheValue {
    get displayValue() {
      return this.lookup(new BasketType()).name.value;
    }
    async getTheValue() {
      let r = await this.lookupAsync(new BasketType());
      if (r && r.name && r.name.value)
        return r.name.value;
      return '';
    }
  }
  class FamilySourceId extends Id implements HasAsyncGetTheValue {
    get displayValue() {
      return this.lookup(new FamilySources()).name.value;
    }
    async getTheValue() {
      let r = await this.lookupAsync(new FamilySources());
      if (r && r.name && r.name.value)
        return r.name.value;
      return '';
    }
  }
  
  
  export class YesNoColumn extends ClosedListColumn<YesNo>{
    constructor(caption: string) {
      super(YesNo, caption);
    }
    getColumn() {
      return {
        column: this,
        dropDown: {
          items: this.getOptions()
        },
        width: '100'
      };
    }
  }
  export class YesNo {
    static Yes = new YesNo(1, 'כן');
    static No = new YesNo(0, 'לא');
    constructor(public id: number,
      private caption: string) {
  
    }
    toString() {
      return this.caption;
    }
  }
  
  export class CallStatusColumn extends ClosedListColumn<CallStatus> {
    constructor(settingsOrCaption?: DataColumnSettings<number, NumberColumn> | string) {
      super(CallStatus, settingsOrCaption);
    }
  
  
  }
  
  export class CallStatus {
    static NotYet: CallStatus = new CallStatus(0, 'עדיין לא');
    static Success: CallStatus = new CallStatus(10, 'בוצעה שיחה');
    static Failed: CallStatus = new CallStatus(20, 'לא הצלנו להשיג');
    constructor(public id: number,
      private caption: string) {
  
    }
    toString() {
      return this.caption;
    }
  }
  export class DeliveryStatusColumn extends ClosedListColumn<DeliveryStatus> {
    constructor(settingsOrCaption?: DataColumnSettings<number, NumberColumn> | string) {
      super(DeliveryStatus, settingsOrCaption);
    }
    getColumn() {
      return {
        column: this,
        dropDown: {
          items: this.getOptions()
        },
        width: '150'
      };
    }
  
  }
  
  export class DeliveryStatus {
    static ReadyForDelivery: DeliveryStatus = new DeliveryStatus(0, 'מוכן למשלוח');
    static Success: DeliveryStatus = new DeliveryStatus(11, 'נמסר בהצלחה');
    static FailedBadAddress: DeliveryStatus = new DeliveryStatus(21, 'לא נמסר, בעיה בכתובת');
    static FailedNotHome: DeliveryStatus = new DeliveryStatus(23, 'לא נמסר, לא היו בבית');
    static FailedOther: DeliveryStatus = new DeliveryStatus(25, 'לא נמסר, אחר');
    static Frozen: DeliveryStatus = new DeliveryStatus(90, 'מוקפא');
    static NotInEvent: DeliveryStatus = new DeliveryStatus(95, 'לא באירוע');
    constructor(public id: number,
      private name: string) {
  
    }
    toString() {
      return this.name;
    }
  
  
  }
  export class BasketType extends IdEntity<BasketId>{

    name = new StringColumn({ caption: "שם" });
    constructor() {
  
      super(new BasketId(), () => new BasketType(), evilStatics.dataSource, "BasketType");
      this.initColumns();
    }
  }
  
  export class FamilySources extends IdEntity<FamilySourceId>{
  
    name = new StringColumn({ caption: "שם" });
    contactPerson = new StringColumn({ caption: "איש קשר" });
    phone = new StringColumn('טלפון');
    constructor() {
  
      super(new FamilySourceId(), () => new FamilySources(), evilStatics.dataSource, "FamilySources");
      this.initColumns();
    }
  }
  
  let f = new Families();
  export class NewsUpdate extends Entity<string>{
    id = new StringColumn();
    name = new StringColumn();
    courier = new HelperId("משנע");
    courierAssingTime = new changeDate('מועד שיוך למשנע');
    courierAssignUser = new HelperIdReadonly('מי שייכה למשנע');
    deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
    deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
    deliveryStatusUser = new HelperIdReadonly('מי עדכן את סטטוס המשלוח');
    updateTime = new changeDate('מועד העדכון');
    updateUser = new HelperIdReadonly('מי עדכן');
    updateType = new NumberColumn();
    constructor() {
      super(() => new NewsUpdate(), evilStatics.dataSource, {
        caption: 'חדשות',
        name: 'news',
        dbName: buildSql("(select ", [f.id, f.name, f.courier, f.deliverStatus, f.deliveryStatusDate, f.courierAssingTime, f.courierAssignUser, f.deliveryStatusUser], ", ", f.deliveryStatusDate, " updateTime, ", f.deliveryStatusUser, " updateUser, 1 updateType from ", f, " where ", f.deliveryStatusDate, " is not null ",
          "union select ", [f.id, f.name, f.courier, f.deliverStatus, f.deliveryStatusDate, f.courierAssingTime, f.courierAssignUser, f.deliveryStatusUser], ", ", f.courierAssingTime, " updateTime, ", f.courierAssignUser, " updateUser, 2 updateType from ", f, " where ", f.courierAssingTime, " is not null", ") x")
      });
      this.initColumns();
    }
    describe() {
      return NewsUpdate.GetUpdateMessage(this, this.updateType.value, this.courier.getValue());
    }
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
              return n.deliverStatus.displayValue + ' למשפחת ' + n.name.value + ' על ידי ' + courierName + duration;
  
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
  interface FamilyUpdateInfo {
    name: StringColumn,
    courier: HelperId,
    deliverStatus: DeliveryStatusColumn,
    courierAssingTime: changeDate,
    deliveryStatusDate: changeDate
  }