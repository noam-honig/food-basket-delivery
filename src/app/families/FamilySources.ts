import { IdEntity, HasAsyncGetTheValue, Id } from "../model-shared/types";
import { StringColumn } from "radweb";
import {  ApiAccess } from "../server/api-interfaces";
import { Context, MoreDataColumnSettings } from "../shared/context";

export class FamilySources extends IdEntity<FamilySourceId>  {
  name = new StringColumn({ caption: "שם" });
  contactPerson = new StringColumn({ caption: "איש קשר" });
  phone = new StringColumn('טלפון');
  constructor(context: Context) {
    super(new FamilySourceId(context), FamilySources, {
      name: "FamilySources",
      apiAccess: ApiAccess.loggedIn,
      apiReadOnly: !context.isAdmin()
    });
    this.initColumns();
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
}
