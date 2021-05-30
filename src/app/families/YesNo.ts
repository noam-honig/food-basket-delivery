import { Column, Storable } from '@remult/core';
import { DataControl } from '../../../../radweb/projects/angular';
import { ValueListValueConverter } from '../../../../radweb/projects/core/src/column';



@DataControl({ width: '100' })
@Storable({ valueConverter: () => new ValueListValueConverter(YesNo) })
export class YesNo {
  static Yes = new YesNo(1, 'כן');
  static No = new YesNo(0, 'לא');
  constructor(public id: number, public caption: string) {
  }

}
