import { ClosedListColumn, Column, ColumnOptions, DecorateDataColumnSettings } from '@remult/core';



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
  constructor(caption: ColumnOptions<YesNo>) {
    super(YesNo, {
      display: () => ({
        dropDown: {
          items: this.getOptions()
        },
        width: '100'
      })
    }
      , caption);
  }

}