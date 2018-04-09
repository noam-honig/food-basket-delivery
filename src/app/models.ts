import * as radweb from 'radweb';
import { environment } from './../environments/environment';
import * as uuid from 'uuid';

export class Categories extends radweb.Entity<number> {
  id = new radweb.NumberColumn({ dbName: 'CategoryID' });
  categoryName = new radweb.StringColumn();
  description = new radweb.StringColumn();

  constructor() {
    super(() => new Categories(), environment.dataSource, 'Categories');
    this.initColumns();
  }
}
export class Items extends radweb.Entity<string>{
  id = new radweb.StringColumn({

  });
  quantity = new radweb.NumberColumn("יח'");
  item = new radweb.StringColumn('מה צריך');
  constructor() {
    super(() => new Items(), environment.dataSource, "items");
    this.initColumns();
    this.onSavingRow = () => {
      if (this.isNew())
        this.id.value = uuid();
    };
  }
  
  
}