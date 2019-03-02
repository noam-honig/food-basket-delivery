import { ClosedListColumn } from "radweb";
import { NumberColumn } from "../model-shared/types";
import { MoreDataColumnSettings } from "../shared/context";

export class YesNo {
  static Yes = new YesNo(1, 'כן');
  static No = new YesNo(0, 'לא');
  constructor(public id: number, private caption: string) {
  }
  toString() {
    return this.caption;
  }
}
export class YesNoColumn extends ClosedListColumn<YesNo>{
  constructor(caption: MoreDataColumnSettings<number, NumberColumn> | string) {
    super(YesNo, caption);
  }
  getColumn() {
    return {
      column: this,
      dropDown: {
        items: this.getOptions()
      },
      width: '100'
    };
  }
}