
import { IdEntity } from "../model-shared/types";
import { StringColumn } from "radweb";
import { evilStatics } from "../auth/evil-statics";
import { Id, HasAsyncGetTheValue } from "../model-shared/types";
import { entityWithApi, entityApiSettings, LoggedInCanViewButOnlyAdminUpdatesInsertsAndDeletes } from "../server/api-interfaces";


export class BasketType extends IdEntity<BasketId> implements entityWithApi {
  getDataApiSettings(): entityApiSettings {
    return LoggedInCanViewButOnlyAdminUpdatesInsertsAndDeletes;
  }
  name = new StringColumn({ caption: "שם" });
  constructor() {
    super(new BasketId(), () => new BasketType(), evilStatics.dataSource, "BasketType");
    this.initColumns();
  }
}
export class BasketId extends Id implements HasAsyncGetTheValue {
  get displayValue() {
    return this.lookup(new BasketType()).name.value;
  }
  async getTheValue() {
    let r = await this.lookupAsync(new BasketType());
    if (r && r.name && r.name.value)
      return r.name.value;
    return '';
  }
}