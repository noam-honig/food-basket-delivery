

import { StringColumn, IdColumn, IdEntity, BoolColumn, NumberColumn } from "radweb";

import {  HasAsyncGetTheValue } from "../model-shared/types";
import { Context, EntityClass } from "radweb";
import { ColumnOptions } from "radweb";
import { Roles } from "../auth/roles";

@EntityClass
export class BasketType extends IdEntity<BasketId>  {

  name = new StringColumn({ caption: "שם" });
  blocked = new BoolColumn({ caption: 'חסום לחלוקה' });
  boxes = new NumberColumn({ caption: 'ארגזים', value: 1 });
  constructor(context: Context) {
    super(new BasketId(context), {
      name: "BasketType",
      allowApiRead: context.isSignedIn(),
      allowApiCRUD: Roles.deliveryAdmin,
      onSavingRow: async () => {
        if (this.boxes.value < 1)
          this.boxes.value = 1;
      }
    });
  }
}
export class BasketId extends IdColumn implements HasAsyncGetTheValue {
  constructor(private context: Context, settingsOrCaption?: ColumnOptions<string> ) {
    super(settingsOrCaption);
  }
  get displayValue() {
    return this.context.for(BasketType).lookup(this).name.value;
  }
  async getTheValue() {
    let r = await this.context.for(BasketType).lookupAsync(this);
    if (r && r.name && r.name.value)
      return r.name.value;
    return '';
  }
  getColumn() {
    return {
      column: this,
      dropDown: {
        source: this.context.for(BasketType).create(),
        orderBy: (f: BasketType) => {
          return [{ column: f.name }];
        },
        width: '100'
      },
    };
  }
}