import * as radweb from 'radweb';
import * as uuid from 'uuid';
import { Families, FamilyId, DeliveryStatus, BasketId, CallStatusColumn, DeliveryStatusColumn, } from './families/families';
import { CompoundIdColumn, DataProviderFactory, EntityOptions, Entity, BoolColumn, Column, NumberColumn, ClosedListColumn, ColumnSetting, StringColumn, DateColumn } from 'radweb';
import { foreachSync, foreachEntityItem } from './shared/utils';
import { evilStatics } from './auth/evil-statics';
import { GetGeoInformation, GeocodeInformation } from './shared/googleApiHelpers';
import { myAuthInfo } from './auth/my-auth-info';
import { DataColumnSettings } from 'radweb/utils/dataInterfaces1';
import { SelectServiceInterface } from './select-popup/select-service-interface';
import { Helpers, HelperId, HelperIdReadonly } from './helpers/helpers';
import { IdEntity, changeDate, Id, HasAsyncGetTheValue, DateTimeColumn, buildSql } from './model-shared/types';
import { SendSmsAction } from './asign-family/send-sms-action';










class ItemId extends Id {

}



class EventId extends Id { }
class DeliveryEventId extends Id { }
class FamilyDelveryEventId extends Id { }

class EventHelperId extends Id { }

export class EventStatusColumn extends radweb.ClosedListColumn<EventStatus> {
  constructor(settingsOrCaption?: DataColumnSettings<number, NumberColumn> | string) {
    super(EventStatus, settingsOrCaption);
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

export class EventStatus {
  static Prepare: EventStatus = new EventStatus(0, 'בהכנה');
  static Active: EventStatus = new EventStatus(10, 'פעיל');
  static Done: EventStatus = new EventStatus(20, 'הסתיים');
  constructor(public id: number,
    private caption: string) {

  }
  toString() {
    return this.caption;
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

export class DeliveryEvents extends IdEntity<DeliveryEventId>{
  name = new StringColumn('שם');
  deliveryDate = new DateColumn('תאריך החלוקה');
  isActiveEvent = new BoolColumn();
  createDate = new changeDate('מועד הוספה');
  eventStatus = new EventStatusColumn('סטטוס');
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
  routeOrder = new NumberColumn();
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





let h = new Helpers();
let fromFamilies = () => buildSql(' from ', f,
        ' where ', f.courier, ' = ', h, '.', h.id);

let fromFamiliesWithCourierAndStatus = (s: DeliveryStatus) => buildSql(fromFamilies(), ' and ', f.deliverStatus, ' = ', s.id);

let fromFamiliesWithCourierAndReady = () => fromFamiliesWithCourierAndStatus(DeliveryStatus.ReadyForDelivery);

function log(s: string) {
  console.log(s);
  return s;
}
export class HelpersAndStats extends IdEntity<HelperId> {
  name = new radweb.StringColumn({
    caption: "שם",
    onValidate: v => {
      if (!v.value || v.value.length < 3)
        this.name.error = 'השם קצר מידי';
    }
  });
  phone = new radweb.StringColumn({ caption: "טלפון", inputType: 'tel' });
  smsDate = new changeDate('מועד משלוח SMS');
  reminderSmsDate = new changeDate('מועד משלוח תזכורת SMS');
  deliveriesInProgress = new NumberColumn({
    dbReadOnly: true,
    caption: 'משפחות מחכות'

  });
  allFamilies = new NumberColumn({
    dbReadOnly: true,
    caption: 'משפחות'

  });
  deliveriesWithProblems = new NumberColumn({
    dbReadOnly: true,
    caption: 'משפחות עם בעיות'

  });
  firstDeliveryInProgressDate = new DateTimeColumn({
    dbReadOnly: true

  });
  constructor() {
    super(new HelperId(), () => new HelpersAndStats(), evilStatics.dataSource, {
      name: "helpersAndStats",
      dbName: buildSql('(select ', [
        h.id,
        h.name,
        h.phone,
        h.smsDate,
        h.reminderSmsDate,
        buildSql('(select count(*) ', fromFamiliesWithCourierAndReady(), ') deliveriesInProgress'),
        buildSql('(select count(*) ', fromFamilies(), ') allFamilies'),
        buildSql('(select count(*) ', buildSql(fromFamilies(), ' and ', f.deliverStatus, ' in (', [
          DeliveryStatus.FailedBadAddress.id,
          DeliveryStatus.FailedNotHome.id,
          DeliveryStatus.FailedOther.id
        ], ')'), ') deliveriesWithProblems'),
        buildSql('(select min(', f.courierAssingTime, ') ', fromFamiliesWithCourierAndReady(), ') firstDeliveryInProgressDate')

      ], ' from ', h, ') x')
    });
    this.initColumns();
  }
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


export class ApplicationSettings extends Entity<number>{
  id = new radweb.NumberColumn();
  organisationName = new radweb.StringColumn('שם הארגון');
  smsText = new radweb.StringColumn('תוכן הודעת SMS');
  logoUrl = new radweb.StringColumn('לוגו URL');
  address = new radweb.StringColumn("כתובת מרכז השילוח");
  addressApiResult = new radweb.StringColumn();
  private _lastString: string;
  private _lastGeo: GeocodeInformation;
    getGeocodeInformation() {
      if (this._lastString == this.addressApiResult.value)
        return this._lastGeo ? this._lastGeo : new GeocodeInformation();
      this._lastString = this.addressApiResult.value;
      return this._lastGeo = GeocodeInformation.fromString(this.addressApiResult.value);
    }
    async doSaveStuff() {
      if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
        let geo = await GetGeoInformation(this.address.value);
        this.addressApiResult.value = geo.saveToString();
        if (geo.ok()) {
        }
      }
    }

    constructor() {
      super(() => new ApplicationSettings(), evilStatics.openedDataApi, 'ApplicationSettings')
      this.initColumns(this.id);
    }
  private static _settings: ApplicationSettings;
  static get() {
      if (!this._settings) {
        this._settings = new ApplicationSettings();
        this._settings.source.find({}).then(s => this._settings = s[0]);
      }
      return this._settings;
    }
  static async getAsync(): Promise < ApplicationSettings > {
      let a = new ApplicationSettings();
      return(await a.source.find({}))[0];
  }
}
export class ApplicationImages extends Entity<number>{
  id = new radweb.NumberColumn();

  base64Icon = new radweb.StringColumn("איקון דף base64");
  base64PhoneHomeImage = new radweb.StringColumn("איקון דף הבית בטלפון base64");
  constructor() {
    super(() => new ApplicationImages(), evilStatics.dataSource, 'ApplicationImages')
    this.initColumns(this.id);
  }
  private static _settings: ApplicationImages;
  static get() {
    if (!this._settings) {
      this._settings = new ApplicationImages();
      this._settings.source.find({}).then(s => this._settings = s[0]);
    }
    return this._settings;
  }
  static async getAsync(): Promise<ApplicationImages> {
    let a = new ApplicationImages();
    return (await a.source.find({}))[0];
  }
}