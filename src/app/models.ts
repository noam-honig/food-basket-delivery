import * as radweb from 'radweb';
import { environment } from './../environments/environment';
import * as uuid from 'uuid';
import { CompoundIdColumn, DataProviderFactory, EntityOptions, Entity } from 'radweb';
import { foreachSync, foreachEntityItem } from './shared/utils';


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
  projectHelperId = new ProjectHelperId();
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
  async delete() {
    foreachEntityItem(
      new ItemsPerHelper(),
      hi => hi.projectHelperId.isEqualTo(this.id),
      item => item.delete());
    return super.delete();
  }
  helper() {
    return this.lookup(new Helpers(), this.helperId);
  }
  project() {
    return this.lookupAsync(new Projects(), this.projectId);
  }
}


export class Projects extends IdEntity<ProjectId>{
  name = new radweb.StringColumn();
  description = new radweb.StringColumn();
  constructor() {
    super(new ProjectId(), () => new Projects(), environment.dataSource, "projects");
    this.initColumns();
  }
  async delete() {
    await foreachEntityItem(
      new Items(),
      hi => hi.projectId.isEqualTo(this.id),
      item => item.delete());

    await foreachEntityItem(
      new ProjectHelpers(),
      hi => hi.projectId.isEqualTo(this.id),
      item => item.delete());

    return super.delete();
  }
}
