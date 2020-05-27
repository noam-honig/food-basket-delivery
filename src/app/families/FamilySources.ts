import { HasAsyncGetTheValue, PhoneColumn } from "../model-shared/types";

import { Context, EntityClass, IdEntity, StringColumn, IdColumn, ColumnOptions, DecorateDataColumnSettings } from '@remult/core';
import { Roles } from "../auth/roles";
import { getLang } from "../translate";

@EntityClass
export class FamilySources extends IdEntity {
  name = new StringColumn({ caption: getLang(this.context).familySourceName });
  contactPerson = new StringColumn({ caption: getLang(this.context).contactPersonName });
  phone = new PhoneColumn({ caption: getLang(this.context).phone });
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
      dataControlSettings: () =>
        ({
          valueList:
            this.context.for(FamilySources).getValueList({
              orderBy: (f: FamilySources) => {
                return [{ column: f.name }];

              }
            })
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
