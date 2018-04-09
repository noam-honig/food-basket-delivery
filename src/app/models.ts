import * as radweb from 'radweb';
import { environment } from './../environments/environment';
import * as uuid from 'uuid';
import { CompoundIdColumn } from 'radweb';

export class Categories extends radweb.Entity<number> {
  id = new radweb.NumberColumn({ dbName: 'CategoryID' });
  categoryName = new radweb.StringColumn();
  description = new radweb.StringColumn();

  constructor() {
    super(() => new Categories(), environment.dataSource, 'Categories');
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

export class Items extends radweb.Entity<string>{
  id = new ItemId();
  quantity = new radweb.NumberColumn("יח'");
  item = new radweb.StringColumn('מה צריך');
  constructor() {
    super(() => new Items(), environment.dataSource, "items");
    this.initColumns();
    this.onSavingRow = () => {
      if (this.isNew())
        this.id.setToNewId();
    };
  }


}

export class ItemsPerHelper extends radweb.Entity<string>{
  itemId = new ItemId();
  quantity = new radweb.NumberColumn();

  constructor() {
    super(() => new ItemsPerHelper(), environment.dataSource, "ItemsPerHelper");
    this.initColumns(this.itemId);
  }
}
export class Helpers extends radweb.Entity<string>{
  id = new HelperId();
  name = new radweb.StringColumn();
  phone = new radweb.StringColumn();
  email = new radweb.StringColumn();
  constructor() {
    super(() => new Helpers(), environment.dataSource, "Helpers");
    this.initColumns();
    this.onSavingRow = () => {
      if (this.isNew())
        this.id.setToNewId();
    };
  }
}