import { ColumnOptions, ValueListColumn, NumberColumn, FilterBase, Column, DecorateDataColumnSettings, ValueListItem } from '@remult/core';
export class TranslationOptions {


    static Families: TranslationOptions = new TranslationOptions(0, 'משפחות');
    static Donors: TranslationOptions = new TranslationOptions(1, 'תורמים');
    static Soldiers: TranslationOptions = new TranslationOptions(2, 'חיילים');
    TranslateOption() {
  
    }
    constructor(public id: number, public caption: string) {
    }
  
  }
  export class TranslationOptionsColumn extends ValueListColumn<TranslationOptions> {
  
    constructor(settingsOrCaption?: ColumnOptions<TranslationOptions>, chooseFrom?: TranslationOptions[]) {
      super(TranslationOptions, {
        dataControlSettings: () => {
          let op = this.getOptions();
          if (chooseFrom)
            op = chooseFrom.map(x => {
              return {
                id: x.id,
                caption: x.caption
              } as ValueListItem
            });
  
          return {
            valueList: op,
            width: '150'
          };
  
        }
      }, settingsOrCaption);
      if (!this.defs.caption)
        this.defs.caption = 'המערכת היא עבור';
    }
  
  }