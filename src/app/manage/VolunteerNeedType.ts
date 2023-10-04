import { ValueListFieldType } from 'remult'

@ValueListFieldType({
  displayValue: (e, val) => val.caption
})
export class VolunteerNeedType {
  static none = new VolunteerNeedType('לא צריכים מתנדבים', false, '', '')
  static holidays = new VolunteerNeedType(
    'צריכים מתנדבים בחגים',
    true,
    '9999-12-31'
  )
  static allYear = new VolunteerNeedType(
    'צריכים מתנדבים כל השנה',
    true,
    '9998-12-31'
  )
  static jsonDate: string
  public constructor(
    public caption: string,
    public includeInList: boolean,
    public jsonDate: string,
    public id?: string
  ) {}
}
