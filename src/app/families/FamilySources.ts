import { IdEntity, HasAsyncGetTheValue, Id } from "../model-shared/types";
import { StringColumn } from "radweb";
import { evilStatics } from "../auth/evil-statics";
import { entityApiSettings, LoggedInCanViewButOnlyAdminUpdatesInsertsAndDeletes, entityWithApi } from "../server/api-interfaces";
import { DataColumnSettings } from "radweb/utils/dataInterfaces1";
import { Context } from "../shared/context";

export class FamilySources extends IdEntity<FamilySourceId> implements entityWithApi {
  name = new StringColumn({ caption: "שם" });
  contactPerson = new StringColumn({ caption: "איש קשר" });
  phone = new StringColumn('טלפון');
  constructor(context: Context) {
    super(new FamilySourceId(context), FamilySources, "FamilySources");
    this.initColumns();
  }
  getDataApiSettings(): entityApiSettings {
    return LoggedInCanViewButOnlyAdminUpdatesInsertsAndDeletes;
  }
}
export class FamilySourceId extends Id implements HasAsyncGetTheValue {
  constructor(private context: Context, settingsOrCaption?: DataColumnSettings<string, Id> | string) {
    super(settingsOrCaption);
  }
  get displayValue() {
    return this.context.for(FamilySources).lookup( this).name.value;
  }
  async getTheValue() {
    let r = await this.context.for(FamilySources).lookupAsync(this);
    if (r && r.name && r.name.value)
      return r.name.value;
    return '';
  }
}
