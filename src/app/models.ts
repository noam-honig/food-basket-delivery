import * as radweb from 'radweb';
import { environment } from './../environments/environment';
import * as uuid from 'uuid';
import { CompoundIdColumn, DataProviderFactory, EntityOptions, Entity, BoolColumn } from 'radweb';
import { foreachSync, foreachEntityItem } from './shared/utils';
import { evilStatics } from './auth/evil-statics';


class IdEntity<idType extends Id> extends radweb.Entity<string>
{
  id: idType;
  constructor(id: idType, factory: () => IdEntity<idType>, source: DataProviderFactory, options?: EntityOptions | string) {
    super(factory, source, options);
    this.id = id;
    this.onSavingRow = () => {
      if (this.isNew() && !this.id.value)
        this.id.setToNewId();
    }
  }
}


export class Categories extends radweb.Entity<number> {
  id = new radweb.NumberColumn({ dbName: 'CategoryID' });
  categoryName = new radweb.StringColumn();
  description = new radweb.StringColumn();

  constructor() {
    super(() => new Categories(), evilStatics.dataSource, 'Categories');
    this.initColumns();
  }
}

class Id extends radweb.StringColumn {
  setToNewId() {
    this.value = uuid();
  }
}
class ItemId extends Id {

}
class HelperId extends Id { }

class EventId extends Id { }
class FamilyId extends Id { }
class EventHelperId extends Id { }
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
  //email = new radweb.StringColumn('דוא"ל');
  //address = new radweb.StringColumn("כתובת");

  //userName = new radweb.StringColumn("שם משתמשת");
  realStoredPassword = new radweb.StringColumn({ dbName: 'password' });
  password = new radweb.StringColumn({ caption: 'סיסמה', inputType: 'password', virtualData: () => Helpers.emptyPassword });

  createDate = new radweb.DateTimeColumn({
    caption: 'תאריך הוספה',
    readonly: true
  });
  isAdmin = new BoolColumn('מנהלת');

  constructor() {

    super(new HelperId(), () => new Helpers(), evilStatics.openedDataApi, "Helpers");
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
  phone = new radweb.StringColumn({ caption: "טלפון", inputType: 'tel' });

  address = new radweb.StringColumn("כתובת");
  courier = new HelperId("מוביל");
  createDate = new radweb.DateTimeColumn({
    caption: 'תאריך הוספה',
    readonly: true
  });

  constructor() {

    super(new FamilyId(), () => new Families(), evilStatics.dataSource, "Families");
    this.initColumns();
    let x = this.onSavingRow;
    this.onSavingRow = () => {
      if (this.isNew())
        this.createDate.dateValue = new Date();
      x();
    };
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
