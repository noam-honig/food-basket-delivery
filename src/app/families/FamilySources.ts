import { IdEntity, HasAsyncGetTheValue, Id, StringColumn } from "../model-shared/types";

import { Context, MoreDataColumnSettings, EntityClass } from "../shared/context";
@EntityClass
export class FamilySources extends IdEntity<FamilySourceId>  {
  name = new StringColumn({ caption: "שם" });
  contactPerson = new StringColumn({ caption: "איש קשר", excludeFromApi: !this.context.isAdmin() });
  phone = new StringColumn({ caption: 'טלפון', excludeFromApi: !this.context.isAdmin() });
  constructor(private context: Context) {
    super(new FamilySourceId(context), {
      name: "FamilySources",
      allowApiRead: context.isLoggedIn(),
      allowApiCRUD: context.isAdmin()
    });
  }
}
export class FamilySourceId extends Id implements HasAsyncGetTheValue {
  constructor(private context: Context, settingsOrCaption?: MoreDataColumnSettings<string, Id> | string) {
    super(settingsOrCaption);
  }
  get displayValue() {
    return this.context.for(FamilySources).lookup(this).name.value;
  }
  async getTheValue() {
    let r = await this.context.for(FamilySources).lookupAsync(this);
    if (r && r.name && r.name.value)
      return r.name.value;
    return '';
  }
  getColumn() {
    return {
      column: this,
      dropDown: {
        source: this.context.for(FamilySources).create(),
        orderBy: (f: FamilySources) => {
          return [{ column: f.name }];
        }

      },
    };
  }
}
