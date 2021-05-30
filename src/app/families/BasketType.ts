

import { Column, ColumnSettings, Entity, IdEntity, Storable, StoreAsStringValueConverter } from '@remult/core';

import { LookupValue } from "../model-shared/LookupValue";
import { Context, } from '@remult/core';

import { Roles } from "../auth/roles";
import { use } from '../translate';
import { getLang } from '../sites/sites';
import { DataControl, getValueList } from '@remult/angular';

@Entity<BasketType>({
  key: "BasketType",
  allowApiRead: context => context.isSignedIn(),
  allowApiCrud: Roles.admin,
  saving: async (self) => {
    if ((!self.boxes || self.boxes < 1) && (!self.boxes2 || self.boxes2 < 1))
      self.boxes = 1;
  },
  defaultOrderBy: x => x.name
})
export class BasketType extends IdEntity {

  @Column({ caption: use.language.basketTypeName })
  name: string;
  @Column({ caption: BasketType.boxes1Name })
  boxes: number = 1;
  @Column({ caption: BasketType.boxes2Name })
  boxes2: number = 0;

  constructor(private context: Context) {
    super();
  }
  static boxes1Name = !use ? '' : use.language.boxes1Name;
  static boxes2Name = !use ? '' : use.language.boxes2Name;
}


@Storable<BasketTypeId>({
  valueConverter: c => new StoreAsStringValueConverter<BasketTypeId>(x => x.id, x => new BasketTypeId(x, c)),
  displayValue: (e, v) => v.item.name,
  caption: use.language.basketType
})
@DataControl({
  valueList: context => getValueList(context.for(BasketType)),
  width: '100'
})
export class BasketTypeId extends LookupValue<BasketType>{
  evilGetId(): string {
    return this.id;
  }
  constructor(id: string, context: Context) {
    super(id, context.for(BasketType));
  }
  async addBasketTypes(quantity: number, addColumn: (caption: string, v: string, t: import("xlsx/types").ExcelDataType) => void) {
    let r = await this.waitLoad();
    if (r) {
      addColumn(BasketType.boxes1Name, r.boxes ? (r.boxes * quantity).toString() : '', 'n');
      addColumn(BasketType.boxes2Name, r.boxes2 ? (r.boxes2 * quantity).toString() : '', 'n');
    }
  }
}


export function QuantityColumn<T>(settings?: ColumnSettings) {
  return Column<T, number>({ caption: use.language.quantity, ...settings });
}
