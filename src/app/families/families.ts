import { DeliveryStatus, DeliveryStatusColumn } from "./DeliveryStatus";
import { CallStatusColumn } from "./CallStatus";
import { YesNoColumn } from "./YesNo";
import { LanguageColumn } from "./Language";
import { FamilySourceId } from "./FamilySources";
import { BasketId } from "./BasketType";
import { IdEntity, Id, changeDate, DateTimeColumn } from "../model-shared/types";
import { StringColumn, NumberColumn, ColumnSetting, Column } from "radweb";
import { DataProviderFactory } from "radweb/utils/dataInterfaces1";
import { HelperIdReadonly, HelperId, Helpers } from "../helpers/helpers";
import { myAuthInfo } from "../auth/my-auth-info";
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { evilStatics } from "../auth/evil-statics";
import { entityWithApi, entityApiSettings, ApiAccess } from "../server/api-interfaces";
import { DataApiSettings } from "radweb/utils/server/DataApi";
import {  Context } from "../shared/context";

export class Families extends IdEntity<FamilyId> implements entityWithApi {
  getDataApiSettings(): entityApiSettings {
    return {
      apiAccess: ApiAccess.loggedIn,
      apiSettings: authInfo => {
        return {
          allowDelete: authInfo && authInfo.admin,
          allowInsert: authInfo && authInfo.admin,
          allowUpdate: authInfo ? true : false,
          readonlyColumns: f => {
            if (authInfo) {
              if (authInfo.admin)
                return [];
              return f.__iterateColumns().filter(c => c != f.courierComments && c != f.deliverStatus);
            }
          },
          excludeColumns: f => {
            return f.excludeColumns(authInfo);
          },
          onSavingRow: async family => {
            await family.doSaveStuff(authInfo);
          },
          get: {
            where: f => {
              if (authInfo && !authInfo.admin)
                return f.courier.isEqualTo(authInfo.helperId);
              return undefined;
            }
          }
        } as DataApiSettings<this>;

      }
    };
  }


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
  callHelper = new HelperIdReadonly(this.context, 'מי ביצעה את השיחה');
  callComments = new StringColumn('הערות שיחה');


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
  createUser = new HelperIdReadonly(this.context, 'משתמש מוסיף');

  excludeColumns(info: myAuthInfo) {
    if (info && info.admin)
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

  constructor(private context: Context, source?: DataProviderFactory) {
    super(new FamilyId(), () => new Families(context, source), source ? source : evilStatics.dataSource, "Families");
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

    logChanged(this.courier, this.courierAssingTime, this.courierAssignUser, async () => Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 2, await this.courier.getTheName())));//should be after succesfull save
    logChanged(this.callStatus, this.callTime, this.callHelper, () => { });
    logChanged(this.deliverStatus, this.deliveryStatusDate, this.deliveryStatusUser, async () => Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 1, await this.courier.getTheName()))); //should be after succesfull save
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
export class FamilyId extends Id { }









export interface FamilyUpdateInfo {
  name: StringColumn,
  courier: HelperId,
  deliverStatus: DeliveryStatusColumn,
  courierAssingTime: changeDate,
  deliveryStatusDate: changeDate
} 