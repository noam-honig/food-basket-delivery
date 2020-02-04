import { ValueListColumn, Column, ColumnOptions, DecorateDataColumnSettings } from '@remult/core';



export class YesNo {
  static Yes = new YesNo(1, 'כן');
  static No = new YesNo(0, 'לא');
  constructor(public id: number, public caption: string) {
  }
  
}
export class YesNoColumn extends ValueListColumn<YesNo>{
  constructor(caption: ColumnOptions<YesNo>) {
    super(YesNo, {
      dataControlSettings: () => ({
        valueList:this.getOptions(),
        width: '100'
      })
    }
      , caption);
  }

}