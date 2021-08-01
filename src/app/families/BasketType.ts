

import { FieldOptions, Entity, IdEntity, Allow, IntegerField } from 'remult';


import { Context, } from 'remult';

import { Roles } from "../auth/roles";
import { use, Field, FieldType } from '../translate';
import { getLang } from '../sites/sites';
import { DataControl, getValueList } from '@remult/angular';


@FieldType<BasketType>({
  valueConverter: {
    toJson: x => x != undefined ? x : '',
    fromJson: x => x || x == '' ? x : null
  },
  displayValue: (e, v) => v ? v.name : '',
  translation: l => l.basketType
})
@DataControl({
  valueList: context => getValueList(context.for(BasketType)),
  width: '100'
})
@Entity<BasketType>({
  key: "BasketType",
  allowApiRead: Allow.authenticated,
  allowApiCrud: Roles.admin,
  saving: async (self) => {
    if ((!self.boxes || self.boxes < 1) && (!self.boxes2 || self.boxes2 < 1))
      self.boxes = 1;
  },
  defaultOrderBy: x => x.name
})
export class BasketType extends IdEntity {
  @Field({ translation: l => l.basketTypeName })
  name: string;
  @IntegerField({ caption: BasketType.boxes1Name })
  boxes: number = 1;
  @IntegerField({ caption: BasketType.boxes2Name })
  boxes2: number = 0;

  static boxes1Name = !use ? '' : use.language.boxes1Name;
  static boxes2Name = !use ? '' : use.language.boxes2Name;

  addBasketTypes(quantity: number, addColumn: (caption: string, v: string, t: import("xlsx/types").ExcelDataType) => void) {
    addColumn(BasketType.boxes1Name, this.boxes ? (this.boxes * quantity).toString() : '', 'n');
    addColumn(BasketType.boxes2Name, this.boxes2 ? (this.boxes2 * quantity).toString() : '', 'n');
  }
}




