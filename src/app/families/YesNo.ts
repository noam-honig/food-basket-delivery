
import { DataControl } from '@remult/angular';
import { ValueListFieldType } from 'remult/src/remult3';

@DataControl({ width: '100' })
@ValueListFieldType()
export class YesNo {
  static Yes = new YesNo(1, 'כן');
  static No = new YesNo(0, 'לא');
  constructor(public id: number, public caption: string) {
  }

}
