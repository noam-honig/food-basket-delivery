

import { Entity, IdEntity, Allow, Fields, FieldRef } from 'remult';

import { Roles } from "../auth/roles";
import { use, Field, FieldType } from '../translate';
import { getLang } from '../sites/sites';
import { DataControl, getEntityValueList, InputField } from '../common-ui-elements/interfaces';
import { getSettings } from '../manage/ApplicationSettings';
import { FamilyDeliveries } from './FamilyDeliveries';
import { UITools } from '../helpers/init-context';


@FieldType<BasketType>({
  valueConverter: {
    toJson: x => x != undefined ? x : '',
    fromJson: x => x || x == '' ? x : null
  },
  displayValue: (e, v) => v ? v.name : '',
  translation: l => l.basketType
})
@DataControl({
  valueList: remult => getEntityValueList(remult.repo(BasketType)),
  width: '100'
})
@Entity<BasketType>("BasketType", {
  allowApiRead: remult => Allow.authenticated(remult) || getSettings().familySelfOrderEnabled,
  allowApiCrud: Roles.admin,
  saving: async (self) => {
    if ((!self.boxes || self.boxes < 1) && (!self.boxes2 || self.boxes2 < 1))
      self.boxes = 1;
  },
  defaultOrderBy: { name: "asc" }
})
export class BasketType extends IdEntity {
  @Field({ translation: l => l.basketTypeName })
  name: string;
  @Fields.integer({}, (options) => options.caption = BasketType.boxes1Name)
  boxes: number = 1;
  @Fields.integer({}, (options) => options.caption = BasketType.boxes2Name)
  boxes2: number = 0;
  @Field<any, string>({
    translation: l => l.whatToTake,
    clickWithTools: (u, fr, ui) => editItems(fr, ui)
  })
  whatToTake: string = '';

  static boxes1Name = !use ? '' : use.language.boxes1Name;
  static boxes2Name = !use ? '' : use.language.boxes2Name;

  addBasketTypes(quantity: number, addColumn: (caption: string, v: string, t: import("xlsx/types").ExcelDataType) => void) {
    addColumn(BasketType.boxes1Name, this.boxes ? (this.boxes * quantity).toString() : '', 'n');
    addColumn(BasketType.boxes2Name, this.boxes2 ? (this.boxes2 * quantity).toString() : '', 'n');
  }
}



export class quantityHelper {
  items: totalItem[] = [];
  add(key: string, quantity: number) {
    key = key.trim();
    let x = this.items.find(w => w.name == key);
    if (x)
      x.quantity += quantity;
    else
      this.items.push({ name: key, quantity });
  }
  parseComment(comment: string, quantity = 1) {
    if (!comment)
      return;
    for (let item of comment.split(',')) {
      item = item.trim();
      let reg = /(^\d*)(.*)/.exec(item);
      if (reg[2].trim()) {
        if (reg[1])
          this.add(reg[2], +reg[1] * quantity)
        else this.add(reg[2], 1 * quantity);
      }
    }
  }
  toString(seperator = "\n") {
    return this.items.map(x => (x.quantity + ' X ') + x.name).join(seperator);
  }
}

export interface totalItem {
  name: string,
  quantity: number
}
export function editItems(fr: FieldRef<FamilyDeliveries, string>, ui: UITools) {
  const field = new InputField<string>({
    customInput: c => c.textArea(),
    caption: fr.metadata.caption
  });
  field.value = fr.value.split(',').map(x => x.trim()).join("\n");
  ui.inputAreaDialog({
    fields: [field],
    ok: () => {
      fr.value = field.value.split("\n").map(x => x.trim()).join(", ");
    }
  });
}