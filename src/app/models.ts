import * as radweb from 'radweb';
import * as uuid from 'uuid';
import { CompoundIdColumn, DataProviderFactory, EntityOptions, Entity, BoolColumn, Column, NumberColumn, ClosedListColumn, ColumnSetting, StringColumn, DateColumn } from 'radweb';
import { foreachSync, foreachEntityItem } from './shared/utils';
import { evilStatics } from './auth/evil-statics';
import { GetGeoInformation, GeocodeInformation } from './shared/googleApiHelpers';
import { myAuthInfo } from './auth/my-auth-info';
import { DataColumnSettings } from 'radweb/utils/dataInterfaces1';
import { SelectServiceInterface } from './select-popup/select-service-interface';



class IdEntity<idType extends Id> extends radweb.Entity<string>
{
  id: idType;
  constructor(id: idType, factory: () => IdEntity<idType>, source: DataProviderFactory, options?: EntityOptions | string) {
    super(factory, source, options);
    this.id = id;
    this.onSavingRow = () => {
      if (this.isNew() && !this.id.value && !this.disableNewId)
        this.id.setToNewId();
    }
  }
  private disableNewId = false;
  setEmptyIdForNewRow() {
    this.id.value = '';
    this.disableNewId = true;
  }
}



class Id extends radweb.StringColumn {
  setToNewId() {
    this.value = uuid();
  }
}
class DateTimeColumn extends radweb.DateTimeColumn {
  constructor(settingsOrCaption?: DataColumnSettings<string, DateTimeColumn> | string) {
    super(settingsOrCaption);
  }
  relativeDateName(d?: Date, now?: Date) {
    if (!d)
      d = this.dateValue;
    if (!d)
      return '';
    if (!now)
      now = new Date();
    let sameDay = (x: Date, y: Date) => {
      return x.getFullYear() == y.getFullYear() && x.getMonth() == y.getMonth() && x.getDate() == y.getDate()
    }
    let diffInMinues = Math.ceil((now.valueOf() - d.valueOf()) / 60000);
    if (diffInMinues <= 1)
      return 'לפני דקה';
    if (diffInMinues < 60) {

      return 'לפני ' + diffInMinues + ' דקות';
    }
    if (diffInMinues < 60 * 10 || sameDay(d, now)) {
      let hours = Math.floor(diffInMinues / 60);
      let min = diffInMinues % 60;
      if (min > 50) {
        hours += 1;
        min = 0;
      }
      let r;
      switch (hours) {
        case 1:
          r = 'שעה';
          break
        case 2:
          r = "שעתיים";
          break;
        default:
          r = hours + ' שעות';
      }

      if (min > 35)
        r += ' ושלושת רבעי';
      else if (min > 22) {
        r += ' וחצי';
      }
      else if (min > 7) {
        r += ' ורבע ';
      }
      return 'לפני ' + r;

    }
    let r = ''
    if (sameDay(d, new Date(now.valueOf() - 86400 * 1000))) {
      r = 'אתמול';
    }
    else if (sameDay(d, new Date(now.valueOf() - 86400 * 1000 * 2))) {
      r = 'שלשום';
    }
    else {
      r = 'ב' + d.toLocaleDateString();
    }
    let t = d.getMinutes().toString();
    if (t.length == 1)
      t = '0' + t;

    return r += ' ב' + d.getHours() + ':' + t;
  }

}
export class changeDate extends DateTimeColumn {
  constructor(caption: string) {
    super({
      caption: caption,
      readonly: true
    });
  }

}



class ItemId extends Id {

}
export interface HasAsyncGetTheValue {
  getTheValue(): Promise<string>;
}
export class HelperId extends Id implements HasAsyncGetTheValue {

  getColumn(dialog: SelectServiceInterface): ColumnSetting<Families> {
    return {
      column: this,
      getValue: f => f.courier.getValue(),
      hideDataOnInput: true,
      click: f => dialog.selectHelper(s => f.__getColumn(this).value = s.id.value),
      readonly: this.readonly,
      width: '200'

    }
  }
  getValue() {
    return this.lookup(new Helpers()).name.value;
  }
  async getTheName() {
    let r = await this.lookupAsync(new Helpers(), this);
    if (r && r.name && r.name.value)
      return r.name.value;
    return '';
  }
  async getTheValue() {
    let r = await this.lookupAsync(new Helpers(), this);
    if (r && r.name && r.name.value && r.phone)
      return r.name.value + ' ' + r.phone.value;
    return '';
  }
}
class HelperIdReadonly extends HelperId {
  constructor(caption: string) {
    super({
      caption: caption,
      readonly: true
    });
  }
  get displayValue() {
    return this.lookup(new Helpers()).name.value;
  }
}
class BasketId extends Id implements HasAsyncGetTheValue {
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


class EventId extends Id { }
class DeliveryEventId extends Id { }
class FamilyDelveryEventId extends Id { }
class FamilyId extends Id { }
class EventHelperId extends Id { }



export class CallStatusColumn extends radweb.ClosedListColumn<CallStatus> {
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


export class DeliveryStatusColumn extends radweb.ClosedListColumn<DeliveryStatus> {
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
  static FailedBadAddress: DeliveryStatus = new DeliveryStatus(21, 'לא נמסר, בעייה בכתובת');
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

export class Items extends IdEntity<ItemId>{

  eventId = new EventId();
  quantity = new radweb.NumberColumn("יח'");
  item = new radweb.StringColumn('מה צריך');
  totalSoFar = new radweb.NumberColumn({
    caption: 'נאסף',
    virtualData: async () => {
      let total = 0;
      await foreachEntityItem(new ItemsPerHelper(), i => i.itemId.isEqualTo(this.id), async (i) => {

        total += i.quantity.value;
      });
      return total;
    }
  });

  constructor() {
    super(new ItemId(), () => new Items(), evilStatics.dataSource, "items");
    this.initColumns();
  }
  async delete() {
    foreachEntityItem(
      new ItemsPerHelper(),
      hi => hi.itemId.isEqualTo(this.id),
      item => item.delete());
    return super.delete();
  }

}
export class ItemsPerHelper extends radweb.Entity<string>{

  itemId = new ItemId();
  eventHelperId = new EventHelperId();
  quantity = new radweb.NumberColumn('כמות');


  private id = new CompoundIdColumn(this, this.itemId, this.eventHelperId)

  constructor() {
    super(() => new ItemsPerHelper(), evilStatics.dataSource, "ItemsPerHelper");
    this.initColumns(this.id);
  }
}
export class Helpers extends IdEntity<HelperId>{
  public static emptyPassword = 'password';
  name = new radweb.StringColumn({
    caption: "שם",
    onValidate: v => {
      if (!v.value || v.value.length < 3)
        this.name.error = 'השם קצר מידי';
    }
  });
  phone = new radweb.StringColumn({ caption: "טלפון", inputType: 'tel' });
  realStoredPassword = new radweb.StringColumn({ dbName: 'password' });
  password = new radweb.StringColumn({ caption: 'סיסמה', inputType: 'password', virtualData: () => Helpers.emptyPassword });

  createDate = new changeDate('מועד הוספה');
  smsDate = new changeDate('מועד משלוח SMS');
  reminderSmsDate = new changeDate('מועד משלוח תזכורת SMS');
  isAdmin = new BoolColumn('מנהלת');
  shortUrlKey = new radweb.StringColumn();

  constructor(factory?: () => Helpers, name?: string, source?: DataProviderFactory) {

    super(new HelperId(), factory ? factory : () => new Helpers(), source ? source : evilStatics.openedDataApi, {
      name: name ? name : "Helpers",
      dbName: "Helpers"

    });
    this.initColumns();
    let x = this.onSavingRow;
    this.onSavingRow = () => {
      if (this.isNew())
        this.createDate.dateValue = new Date();
      x();
    };
  }
}


export class Families extends IdEntity<FamilyId>{


  name = new radweb.StringColumn({
    caption: "שם",
    onValidate: v => {
      if (!v.value || v.value.length < 3)
        this.name.error = 'השם קצר מידי';
    }
  });
  familyMembers = new radweb.NumberColumn('מספר נפשות');
  language = new LanguageColumn();
  basketType = new BasketId('סוג סל');
  familySource = new FamilySourceId('גורם מפנה');
  special = new YesNoColumn('שיוך מיוחד');
  internalComment = new radweb.StringColumn('הערה פנימית - לא תופיע למשנע');


  address = new radweb.StringColumn("כתובת");
  floor = new radweb.NumberColumn('קומה');
  appartment = new radweb.StringColumn('דירה');
  addressComment = new radweb.StringColumn('הערת כתובת');
  deliveryComments = new radweb.StringColumn('הערות למשנע');
  addressApiResult = new radweb.StringColumn();
  city = new radweb.StringColumn({ caption: "עיר כפי שגוגל הבין", readonly: true });

  phone1 = new radweb.StringColumn({ caption: "טלפון 1", inputType: 'tel', dbName: 'phone' });
  phone1Description = new radweb.StringColumn('תאור טלפון 1');
  phone2 = new radweb.StringColumn({ caption: "טלפון 2", inputType: 'tel' });
  phone2Description = new radweb.StringColumn('תאור טלפון 2');



  callStatus = new CallStatusColumn('סטטוס שיחה');
  callTime = new changeDate('מועד שיחה');
  callHelper = new HelperIdReadonly('מי ביצעה את השיחה');
  callComments = new radweb.StringColumn('הערות שיחה');


  courier = new HelperId("משנע");
  courierAssignUser = new HelperIdReadonly('מי שייכה למשנע');
  courierAssignUserName = new radweb.StringColumn({
    caption: 'שם שיוך למשנע',
    virtualData: async () => (await this.lookupAsync(new Helpers(), this.courierAssignUser)).name.value
  });
  courierAssignUserPhone = new radweb.StringColumn({
    caption: 'שם שיוך למשנע',
    virtualData: async () => (await this.lookupAsync(new Helpers(), this.courierAssignUser)).phone.value
  });
  courierAssingTime = new changeDate('מועד שיוך למשנע');


  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  deliveryStatusUser = new HelperIdReadonly('מי עדכן את סטטוס המשלוח');
  courierComments = new radweb.StringColumn('הערות מסירה');
  addressByGoogle() {
    let r: ColumnSetting<Families> = {
      caption: 'כתובת כפי שגוגל הבין',
      getValue: f => {
        let result = '';
        let g = f.getGeocodeInformation();
        if (!g.ok())
          return '!!! NOT OK!!!';
        return f.getGeocodeInformation().info.results[0].formatted_address;
      }
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
export class DeliveryEvents extends IdEntity<DeliveryEventId>{
  name = new StringColumn('שם');
  deliveryDate = new DateColumn('תאריך החלוקה');
  isActiveEvent = new BoolColumn();
  createDate = new changeDate('מועד הוספה');
  createUser = new HelperIdReadonly('משתמש מוסיף');
  families = new NumberColumn({
    dbReadOnly: true,
    caption: 'משפחות',
    dbName: buildSql('case when ', 'isActiveEvent', ' then ', '(select count(*) from ', f, ' where ', f.deliverStatus, '<>', DeliveryStatus.NotInEvent.id,
      ') else (select count(*) from ', fde, ' where ', fde.deliveryEvent, '=', this, '.id', ' and ', fde.deliverStatus, '<>', DeliveryStatus.NotInEvent.id, ') end'),
    readonly: true
  });

  async doSaveStuff(authInfo: myAuthInfo) {
    console.log(this.deliveryDate.value, this.deliveryDate.dateValue, this.deliveryDate.displayValue);
    if (this.isNew()) {
      this.createDate.dateValue = new Date();
      this.createUser.value = authInfo.helperId;
    }
  }
  constructor(source?: DataProviderFactory) {
    super(new DeliveryEventId(), () => new DeliveryEvents(source), source ? source : evilStatics.dataSource, 'DeliveryEvents');
    this.initColumns();
  }
}
let f = new Families();
export class FamilyDeliveryEvents extends IdEntity<FamilyDelveryEventId>{
  deliveryEvent = new DeliveryEventId();
  family = new FamilyId();
  basketType = new BasketId('סוג סל');
  callStatus = new CallStatusColumn('סטטוס שיחה');
  callTime = new changeDate('מועד שיחה');
  callHelper = new HelperIdReadonly('מי ביצעה את השיחה');
  callComments = new radweb.StringColumn('הערות שיחה');


  courier = new HelperId("משנע");
  courierAssignUser = new HelperIdReadonly('מי שייכה למשנע');
  courierAssingTime = new changeDate('מועד שיוך למשנע');


  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  deliveryStatusUser = new HelperIdReadonly('מי עדכן את סטטוס המשלוח');
  courierComments = new radweb.StringColumn('הערות מסירה');

  constructor(source?: DataProviderFactory) {
    super(new FamilyDelveryEventId(), () => new FamilyDeliveryEvents(source), source ? source : evilStatics.dataSource, 'FamilyDeliveryEvents');
    this.initColumns();
  }
}
let fde = new FamilyDeliveryEvents();
var de = new DeliveryEvents();

export class FamilyDeliveryEventsView extends IdEntity<FamilyDelveryEventId>{
  family = new FamilyId();
  basketType = new BasketId('סוג סל');
  eventName = new StringColumn('שם אירוע');

  deliveryDate = new DateTimeColumn('תאריך החלוקה');

  courier = new HelperId("משנע");
  courierAssingTime = new changeDate('מועד שיוך למשנע');


  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  courierComments = new radweb.StringColumn('הערות מסירה');

  constructor(source?: DataProviderFactory) {
    super(new FamilyDelveryEventId(), () => new FamilyDeliveryEventsView(source), source ? source : evilStatics.dataSource, {
      name: 'FamilyDeliveryEventsView',
      dbName: buildSql(
        '(select ', fde, '.', fde.id, ', ', [fde.family, fde.basketType, fde.courier, fde.courierAssingTime, fde.deliverStatus, fde.deliveryStatusDate, fde.courierComments, de.deliveryDate],
        ', ', de, '.', de.name, ' eventName',

        ' from ', fde,
        ' inner join ', de, ' on ', de, '.', de.id, '=', fde.deliveryEvent,

        ' where ', de.isActiveEvent, '=false',

        ') as x')
    });
    this.initColumns();
  }
}


export class EventHelpers extends IdEntity<EventHelperId>{

  helperId = new HelperId();
  eventId = new EventId();
  constructor() {
    super(new EventHelperId(), () => new EventHelpers(), evilStatics.dataSource, 'EventHelpers');
    this.initColumns();
  }
  async delete() {
    foreachEntityItem(
      new ItemsPerHelper(),
      hi => hi.eventHelperId.isEqualTo(this.id),
      item => item.delete());
    return super.delete();
  }
  helper() {
    return this.lookup(new Helpers(), this.helperId);
  }
  event() {
    return this.lookupAsync(new Events(), this.eventId);
  }
}

function getItemSql(e: any) {
  let v = e;
  if (e instanceof Entity)
    v = e.__getDbName();
  if (e instanceof Column)
    v = e.__getDbName();
  if (e instanceof Array) {
    v = e.map(x => getItemSql(x)).join(', ');
  }
  return v;
}
function buildSql(...args: any[]): string {
  let result = '';
  args.forEach(e => {

    result += getItemSql(e);
  });
  return result;
}

let fromFamiliesWhereId = (h: Helpers) => buildSql(' from ', f
  , ' where ', f.courier, ' = ', h, '.', h.id, ' and ', f.deliverStatus, ' = ', DeliveryStatus.ReadyForDelivery.id)


export class HelpersAndStats extends Helpers {
  deliveriesInProgress = new NumberColumn({
    dbReadOnly: true,
    caption: 'משפחות מחכות',
    dbName: buildSql('(select count(*) ', fromFamiliesWhereId(this), ')')
  });
  firstDeliveryInProgressDate = new DateTimeColumn({
    dbReadOnly: true,
    dbName: buildSql('(select min(', f.courierAssingTime, ') ', fromFamiliesWhereId(this), ')')
  })
    ;
  constructor() {
    super(() => new HelpersAndStats(), "helpersAndStats", evilStatics.dataSource);
    this.initColumns();
  }
}
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
export class Events extends IdEntity<EventId>{
  name = new radweb.StringColumn('שם אירוע');
  description = new radweb.StringColumn();
  constructor() {
    super(new EventId(), () => new Events(), evilStatics.dataSource, "events");
    this.initColumns();
  }
  async delete() {
    await foreachEntityItem(
      new Items(),
      hi => hi.eventId.isEqualTo(this.id),
      item => item.delete());

    await foreachEntityItem(
      new EventHelpers(),
      hi => hi.eventId.isEqualTo(this.id),
      item => item.delete());

    return super.delete();
  }
}

export class BasketType extends IdEntity<BasketId>{

  name = new radweb.StringColumn({ caption: "שם" });
  constructor() {

    super(new BasketId(), () => new BasketType(), evilStatics.dataSource, "BasketType");
    this.initColumns();
  }
}

export class FamilySources extends IdEntity<FamilySourceId>{

  name = new radweb.StringColumn({ caption: "שם" });
  contactPerson = new radweb.StringColumn({ caption: "איש קשר" });
  phone = new radweb.StringColumn('טלפון');
  constructor() {

    super(new FamilySourceId(), () => new FamilySources(), evilStatics.dataSource, "FamilySources");
    this.initColumns();
  }
}
