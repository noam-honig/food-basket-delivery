
import { DataControl } from '../../../../radweb/projects/angular';
import { ValueListFieldType } from '../../../../radweb/projects/core/src/remult3';

@DataControl({ width: '100' })
@ValueListFieldType(YesNo)
export class YesNo {
  static Yes = new YesNo(1, 'כן');
  static No = new YesNo(0, 'לא');
  constructor(public id: number, public caption: string) {
  }

}
