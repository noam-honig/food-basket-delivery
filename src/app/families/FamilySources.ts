import { HasAsyncGetTheValue, PhoneColumn } from "../model-shared/types";

import { Context, EntityClass, IdEntity, StringColumn, IdColumn, ColumnOptions, DecorateDataColumnSettings } from '@remult/core';
import { Roles } from "../auth/roles";

@EntityClass
export class FamilySources extends IdEntity {
  name = new StringColumn({ caption: "שם" });
  contactPerson = new StringColumn({ caption: "איש קשר" });
  phone = new PhoneColumn({ caption: 'טלפון' });
  constructor(private context: Context) {
    super({
      name: "FamilySources",
      allowApiRead: context.isSignedIn(),
      allowApiCRUD: Roles.admin
    });
  }
}
export class FamilySourceId extends IdColumn implements HasAsyncGetTheValue {
  constructor(private context: Context, settingsOrCaption?: ColumnOptions<string>) {
    super({
      display: () =>
        ({
          dropDown: {
            source: this.context.for(FamilySources).dropDownSource({
              orderBy: (f: FamilySources) => {
                return [{ column: f.name }];
              }
            })
          }
        })
    }, settingsOrCaption);
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

}
