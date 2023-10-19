import { DataControl } from '../common-ui-elements/interfaces'
import { FieldRef, remult } from 'remult'
import { getSettings } from '../manage/ApplicationSettings'
import { getLang } from '../sites/sites'
import { FieldType, translationConfig } from '../translate'

@FieldType<Phone>({
  valueConverter: {
    toJson: (x) => (x ? x.thePhone : ''),
    fromJson: (x) => (x ? new Phone(x) : null)
  },
  inputType: 'tel',
  displayValue: (e, x) => x && getSettings().forWho?.formatPhone(x.thePhone)
})
@DataControl<any, Phone>({
  click: (e, x) => window.open('tel:' + x.displayValue),
  allowClick: (e, x) => !!x.displayValue && remult.authenticated(),
  clickIcon: 'phone',
  inputType: 'tel'
})
export class Phone {
  canSendWhatsapp() {
    //is mobile number
    return this.thePhone.startsWith('05')
  }
  constructor(public thePhone: string) {}
  isUrl() {
    return this.thePhone.startsWith('http')
  }
  call() {
    window.location.href = 'tel:' + this.thePhone
  }
  toString() {
    return this.thePhone
  }
  get displayValue() {
    return translationConfig.forWho()?.formatPhone(this.thePhone)
  }

  static toJson(x: Phone): string {
    return x ? x.thePhone : ''
  }
  static fixPhoneInput(s: string) {
    if (!s) return s
    let orig = s.trim()
    s = s.replace(/\D/g, '')
    if (orig.startsWith('+')) return '+' + s
    let forWho = getSettings().forWho
    if (forWho && forWho.args.suppressPhoneZeroAddition) return s
    if (s.length == 9 && s[0] != '0' && s[0] != '3') s = '0' + s
    return s
  }
  sendWhatsapp(message = '') {
    Phone.sendWhatsappToPhone(this.thePhone, message)
  }

  static sendWhatsappToPhone(phone: string, smsMessage: string, test = false) {
    phone = Phone.fixPhoneInput(phone)
    if (phone.startsWith('0')) {
      phone = getSettings().getInternationalPhonePrefix + phone.substr(1)
    }
    if (
      getSettings().forWho.args.suppressPhoneZeroAddition &&
      !phone.startsWith('+')
    )
      phone = getSettings().getInternationalPhonePrefix + phone

    if (phone.startsWith('+')) phone = phone.substr(1)
    if (test)
      window.open(
        'whatsapp://send/?phone=' + phone + '&text=' + encodeURI(smsMessage),
        '_blank'
      )
    else
      window.open(
        'https://wa.me/' + phone + '?text=' + encodeURI(smsMessage),
        '_blank'
      )
  }

  static validatePhone(col: FieldRef<any, Phone>, required = false) {
    if (!col.value || col.value.thePhone == '') {
      if (required) col.error = getLang().invalidPhoneNumber
      return
    }
    if (getLang().languageCode != 'iw' || col.value?.thePhone.startsWith('+'))
      if (col.value.thePhone.length < 10)
        col.error = getLang().invalidPhoneNumber
      else return

    if (!isPhoneValidForIsrael(col.value.thePhone)) {
      col.error = getLang().invalidPhoneNumber
    }
    /*
        if (col.displayValue.startsWith("05") || col.displayValue.startsWith("07")) {
          if (col.displayValue.length != 12) {
            col.validationError = getLang().invalidPhoneNumber;
          }
    
        } else if (col.displayValue.startsWith('0')) {
          if (col.displayValue.length != 11) {
            col.validationError = getLang().invalidPhoneNumber;
          }
        }
        else {
          col.validationError = getLang().invalidPhoneNumber;
        }
      */
  }
}
export function isPhoneValidForIsrael(input: string) {
  if (input) {
    input = input.trim()
    let st1 = input.match(/^0(5\d|7\d|[2,3,4,6,8,9])(-{0,1}\d{3})(-*\d{4})$/)
    return st1 != null
  }
}
