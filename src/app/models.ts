import * as radweb from 'radweb';
import { environment } from './../environments/environment';
import * as uuid from 'uuid';
import { CompoundIdColumn, DataProviderFactory, EntityOptions } from 'radweb';

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

class ProjectId extends Id {

}
class ProjectHelperId extends Id { }
export class Items extends IdEntity<ItemId>{

  projectId = new ProjectId();
  quantity = new radweb.NumberColumn("יח'");
  item = new radweb.StringColumn('מה צריך');
  constructor() {
    super(new ItemId(), () => new Items(), environment.dataSource, "items");
    this.initColumns();
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
export class Helpers extends IdEntity<HelperId>{

  name = new radweb.StringColumn();
  phone = new radweb.StringColumn();
  email = new radweb.StringColumn();
  constructor() {
    super(new HelperId(), () => new Helpers(), environment.dataSource, "Helpers");
    this.initColumns();
  }
}

export class ProjectHelpers extends IdEntity<ProjectHelperId>{

  helperId = new HelperId();
  projectId = new ProjectId();
  constructor() {
    super(new ProjectHelperId(), () => new ProjectHelpers(), environment.dataSource, 'ProjectHelpers');
    this.initColumns();
  }

}

export class Projects extends IdEntity<ProjectId>{
  name = new radweb.StringColumn();
  description = new radweb.StringColumn();
  constructor() {
    super(new ProjectId(), () => new Projects(), environment.dataSource, "projects");
    this.initColumns();
  }
}
