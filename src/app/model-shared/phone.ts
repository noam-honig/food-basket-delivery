import { DataControl } from "@remult/angular";
import { Context, FieldRef } from "remult";
import { InputTypes } from "remult/inputTypes";
import { getSettings } from "../manage/ApplicationSettings";
import { getLang } from "../sites/sites";
import { FieldType } from "../translate";

@FieldType<Phone>({
  displayValue: (e, x) => x && x.displayValue,
  valueConverter: {
    toJson: x => x ? x.thePhone : '',
    fromJson: x => x ? new Phone(x) : null
  },
  inputType: InputTypes.tel
})
@DataControl<any, Phone>({
  click: (e, x) => window.open('tel:' + x.displayValue),
  allowClick: (e, x) => !!x.displayValue,
  clickIcon: 'phone',
  inputType: InputTypes.tel,
  forceEqualFilter: false
})
export class Phone {

  canSendWhatsapp() {//is mobile number
    return this.thePhone.startsWith('05');
  }
  constructor(public thePhone: string) {

  }
  get displayValue() {
    return Phone.formatPhone(this.thePhone);
  }

  static toJson(x: Phone): string {
    return x ? x.thePhone : '';
  }
  static fixPhoneInput(s: string, context: Context) {
    if (!s)
      return s;
    let orig = s;
    s = s.replace(/\D/g, '');
    if (orig.startsWith('+'))
      return '+' + s;
    let forWho = getSettings(context).forWho;
    if (forWho && forWho.args.suppressPhoneZeroAddition)
      return s;
    if (s.length == 9 && s[0] != '0' && s[0] != '3')
      s = '0' + s;
    return s;
  }
  sendWhatsapp(context: Context, message = "") {
    Phone.sendWhatsappToPhone(this.thePhone, message, context);
  }

  static sendWhatsappToPhone(phone: string, smsMessage: string, context: Context, test = false) {
    phone = Phone.fixPhoneInput(phone, context);
    if (phone.startsWith('0')) {
      phone = getSettings(context).getInternationalPhonePrefix() + phone.substr(1);
    }
    if (getSettings(context).forWho.args.suppressPhoneZeroAddition && !phone.startsWith('+'))
      phone = getSettings(context).getInternationalPhonePrefix() + phone;

    if (phone.startsWith('+'))
      phone = phone.substr(1);
    if (test)
      window.open('whatsapp://send/?phone=' + phone + '&text=' + encodeURI(smsMessage), '_blank');
    else
      window.open('https://wa.me/' + phone + '?text=' + encodeURI(smsMessage), '_blank');
  }

  static formatPhone(s: string) {
    if (!s)
      return s;
    let x = s.replace(/\D/g, '');
    if (x.length < 9 || x.length > 10)
      return s;
    if (x.length < 10 && !x.startsWith('0'))
      x = '0' + x;
    x = x.substring(0, x.length - 4) + '-' + x.substring(x.length - 4, x.length);

    x = x.substring(0, x.length - 8) + '-' + x.substring(x.length - 8, x.length);

    return x;
  }
  static validatePhone(col: FieldRef<any, Phone>, context: Context, required = false) {
    if (!col.value || col.value.thePhone == '') {
      if (required)
        col.error = getLang(context).invalidPhoneNumber;
      return;
    }
    if (getLang(context).languageCode != 'iw')
      if (col.value.thePhone.length < 10)
        col.error = getLang(context).invalidPhoneNumber;
      else
        return;

    if (!isPhoneValidForIsrael(col.value.thePhone)) {
      col.error = getLang(context).invalidPhoneNumber;
    }
    /*
        if (col.displayValue.startsWith("05") || col.displayValue.startsWith("07")) {
          if (col.displayValue.length != 12) {
            col.validationError = getLang(context).invalidPhoneNumber;
          }
    
        } else if (col.displayValue.startsWith('0')) {
          if (col.displayValue.length != 11) {
            col.validationError = getLang(context).invalidPhoneNumber;
          }
        }
        else {
          col.validationError = getLang(context).invalidPhoneNumber;
        }
      */
  }
}
export function isPhoneValidForIsrael(input: string) {
  if (input) {
    let st1 = input.match(/^0(5\d|7\d|[2,3,4,6,8,9])(-{0,1}\d{3})(-*\d{4})$/);
    return st1 != null;
  }
}