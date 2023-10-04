import { DataControl } from '../common-ui-elements/interfaces'
import { ValueListFieldType } from 'remult'

@DataControl({ width: '100' })
@ValueListFieldType()
export class YesNo {
  static Yes = new YesNo(1, 'כן')
  static No = new YesNo(0, 'לא')
  constructor(public id: number, public caption: string) {}
}
