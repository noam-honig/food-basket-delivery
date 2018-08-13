import { IdEntity, HasAsyncGetTheValue, Id } from "../model-shared/types";
import { StringColumn } from "radweb";
import { evilStatics } from "../auth/evil-statics";

export class FamilySources extends IdEntity<FamilySourceId> {
  name = new StringColumn({ caption: "שם" });
  contactPerson = new StringColumn({ caption: "איש קשר" });
  phone = new StringColumn('טלפון');
  constructor() {
    super(new FamilySourceId(), () => new FamilySources(), evilStatics.dataSource, "FamilySources");
    this.initColumns();
  }
}
export class FamilySourceId extends Id implements HasAsyncGetTheValue {
    get displayValue() {
      return this.lookup(new FamilySources()).name.value;
    }
    async getTheValue() {
      let r = await this.lookupAsync(new FamilySources());
      if (r && r.name && r.name.value)
        return r.name.value;
      return '';
    }
  }
  