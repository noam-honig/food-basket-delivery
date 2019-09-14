import {  HasAsyncGetTheValue, PhoneColumn } from "../model-shared/types";

import { Context,  EntityClass, IdEntity, StringColumn, IdColumn, ColumnOptions } from "radweb";
import { Roles } from "../auth/roles";

@EntityClass
export class FamilySources extends IdEntity<FamilySourceId>  {
  name = new StringColumn({ caption: "שם" });
  contactPerson = new StringColumn({ caption: "איש קשר" });
  phone = new PhoneColumn({ caption: 'טלפון' });
  constructor(private context: Context) {
    super(new FamilySourceId(context), {
      name: "FamilySources",
      allowApiRead: context.isSignedIn(),
      allowApiCRUD: Roles.admin
    });
  }
}
export class FamilySourceId extends IdColumn implements HasAsyncGetTheValue {
  constructor(private context: Context, settingsOrCaption?: ColumnOptions<string> ) {
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
