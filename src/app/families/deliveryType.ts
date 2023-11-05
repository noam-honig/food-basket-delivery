import { ValueListFieldType, getValueList } from 'remult'
import { DataControl } from '../common-ui-elements/interfaces'
import { Language } from '../translate'

@DataControl({
  width: '150'
})
@ValueListFieldType({
  displayValue: (e, val) => val.caption,
  caption: 'סוג משלוח'
})
export class DeliveryType {
  static delivery = new DeliveryType('', 'משלוח ממרכז')
  static deliveryToOtherAddress = new DeliveryType(
    '10',
    'איסוף ממשפחה ומסירה בכתובת אחרת',
    {
      inputSecondAddress: true,
      displaySecondAddress: true,
      secondAddressCaption: 'כתובת למסירה',
      firstAddressCaption: 'כתובת לאיסוף'
    }
  )
  static pickupFromOtherAddress = new DeliveryType(
    '20',
    'איסוף מכתובת אחרת ומסירה למשפחה',
    {
      showSecondAddressAsPickupAddress: true,
      inputSecondAddress: true,
      secondAddressCaption: 'כתובת לאיסוף',
      firstAddressCaption: 'כתובת למסירה',
      displaySecondAddress: true
    }
  )
  static pickupFromVolunteer = new DeliveryType(
    '30',
    'איסוף ממתנדב ומסירה למשפחה',
    {
      inputPickupVolunteer: true,
      secondAddressCaption: 'כתובת לאיסוף',
      firstAddressCaption: 'כתובת למסירה',
      showSecondAddressAsPickupAddress: true,
      displaySecondAddress: true
    }
  )
  inputSecondAddress = false
  displaySecondAddress = false
  inputPickupVolunteer = false
  showSecondAddressAsPickupAddress = false
  secondAddressCaption: string
  firstAddressCaption: string
  constructor(
    public id: string,
    public caption: string,
    args: Partial<DeliveryType> = {}
  ) {
    Object.assign(this, args)
  }
}
