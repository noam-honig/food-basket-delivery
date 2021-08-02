import { Component, OnInit, Injectable } from '@angular/core';
import { Email } from '../model-shared/types';
import { Phone, isPhoneValidForIsrael } from "../model-shared/phone";
import { Context, Controller, getFields, Validators } from 'remult';
import { DialogService } from '../select-popup/dialog';
import { Sites } from '../sites/sites';
import { Families } from '../families/families';

import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { EmailSvc } from '../shared/utils';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { ActivatedRoute } from '@angular/router';
import { BackendMethod } from 'remult';
import { DataAreaSettings, DataControl, openDialog } from '@remult/angular';

import { Field, FieldType } from '../translate';
import { FamilySources } from '../families/FamilySources';
import { BasketType } from '../families/BasketType';
import { ValueListFieldType } from 'remult/src/remult3';


declare var gtag;
declare var fbq;

@Component({
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrls: ['./register-donor.component.scss']
})
export class RegisterDonorComponent implements OnInit {
  static MinQuantity = 10;

  constructor(private dialog: DialogService, private context: Context, private settings: ApplicationSettings, public activeRoute: ActivatedRoute) { }

  showCCMessage(): boolean {
    if (this.activeRoute.routeConfig.data && this.activeRoute.routeConfig.data.isCC)
      return true
    else return false;
  }

  refer: string = null;
  isDone = false;
  donor = new donorForm(this.context);
  area = new DataAreaSettings({
    fields: () =>
      [
        [this.donor.$.computer, this.donor.$.computerAge],
        [this.donor.$.laptop, this.donor.$.laptopAge],
        this.donor.$.screen,
        this.donor.$.donationType, { field: this.donor.$.phone, click: null },
        { field: this.donor.$.email, click: null }
      ]
  });
  ngOnInit() {
    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('refer')) {
      this.refer = urlParams.get('refer');
      this.donor.docref = this.refer;
    } else {
      this.donor.docref = document.referrer;
    }
  }

  allowSubmit() {
    return this.hasQuantity() && this.hasMandatoryFields() && !this.isDone;
  }

  hasMandatoryFields() {
    return (this.donor.name != null) && this.donor.phone && (isPhoneValidForIsrael(this.donor.phone.thePhone)
      && ((this.donor.selfDeliver) || (this.donor.address != null))
    );
  }
  hasQuantity() {
    return +this.donor.laptop > 0 || +this.donor.computer > 0 || +this.donor.screen > 0;
  }
  
  hasEnough() {
    let total = (this.donor.laptop != undefined ? (this.donor.laptop) : 0) +
                (this.donor.computer != undefined ? (this.donor.computer) : 0) +
                (this.donor.screen != undefined ? (this.donor.screen) : 0);
    return this.donor.selfDeliver || total >= RegisterDonorComponent.MinQuantity;
  }
  
  async submit() {

    if (!this.hasQuantity()) {
      this.dialog.Error("אנא הזן מספר מחשבים, לפטופים או מסכים");
      return;
    }
    if (!this.hasMandatoryFields()) {
      this.dialog.Error("יש למלא שדות חובה");
      return;
    }
    if (!this.hasEnough()) {
      this.dialog.Error("לצערינו לא נוכל לאסוף תרומות עם פחות מ-" + RegisterDonorComponent.MinQuantity + " פריטים. נשמח אם תביאו את הציוד אל אחת מנקודות האיסוף שלנו");
      return;
    }
    try {
      await this.donor.createDonor();

      this.isDone = true;
      try {
        this.dialog.analytics("submitDonorForm");
        gtag('event', 'conversion', { 'send_to': 'AW-452581833/GgaBCLbpje8BEMmz59cB' });
        if (fbq) fbq('track', 'Lead');
      }
      catch (err) {
        console.log("problem with tags: ", err)
      }
    }
    catch (err) {
      this.dialog.exception("donor form", err);
      throw err;
    }

    await openDialog(YesNoQuestionComponent, x => x.args = {
      question: this.settings.lang.thankYouForDonation,
      showOnlyConfirm: true
    });

    if (this.refer) return;
    if (this.donor.docref != '') window.location.href = this.donor.docref
    else window.location.href = "https://www.mitchashvim.org.il/";
  }

}

@ValueListFieldType(EquipmentAge)
@DataControl({
  width: '100'
})
export class EquipmentAge {
  static OldEq = new EquipmentAge(1, '5 שנים או יותר', false);
  static NewEq = new EquipmentAge(0, 'פחות מ 5 שנים', true);
  constructor(public id: number, public caption: string, public isNew: boolean) {
  }

}
@Controller('register-donor')
class donorForm {
  constructor(private context: Context) {

  }
  get $() { return getFields(this, this.context) }
  @Field({
    caption: "שם מלא",
    validate: Validators.required.withMessage("אנא הזן ערך")
  })
  name: string;
  @Field<donorForm, Phone>({
    caption: "טלפון",
    inputType: 'tel',
    validate: (self, col) => {
      if (!col.value || col.value.thePhone == '')
        col.error = "אנא הזן ערך";
      Phone.validatePhone(col, self.context);
    }
  })
  phone: Phone;
  @Field({
    caption: "דואל",
    inputType: 'email'
  })
  email: Email;


  @Field({ caption: "אגיע עצמאית לנקודת האיסוף" })
  selfDeliver: boolean;
  @Field<donorForm, string>({
    caption: "כתובת",
    validate: (e, col) => {
      if (!e.selfDeliver)
        Validators.required(e, col, "אנא הזן ערך");
    }
  })
  address: string;

  @Field({ caption: "מספר מחשבים נייחים" })
  computer: number;
  @Field({ caption: "גיל המחשב החדש ביותר" })
  computerAge: EquipmentAge;
  @Field({ caption: "מספר לפטופים" })
  laptop: number;
  @Field({ caption: "גיל הלפטופ החדש ביותר" })
  laptopAge: EquipmentAge;
  @Field({ caption: "מספר מסכים" })
  screen: number;
  @Field({ caption: "סוג תרומה" })
  @DataControl({
    valueList: [
      //{ id: 'ac52f4b0-6896-4ae3-8cc0-18ed17136e38', caption: 'תרומה פרטית' },
    { id: '0b9e0645-206a-457c-8785-97163073366d', caption: 'תרומת בית עסק' }]

  })
  donationType: string;
  @Field()
  docref: string;


  @BackendMethod({ allowed: true })
  async createDonor() {
    let settings = await ApplicationSettings.getAsync(this.context);
    if (!settings.isSytemForMlt())
      throw "Not Allowed";
    this.context.setUser({
      id: 'WIX',
      name: 'WIX',
      roles: []
    });
    let f = this.context.for(Families).create();
    f.name = this.name;
    if (!this.address)
      this.address = '';
    f.address = this.address;
    f.phone1 = this.phone;
    f.email = this.email;
    f.custom1 = this.docref;
    f.familySource = await this.context.for(FamilySources).findId(this.donationType);

    await f.save();
    var quantity = 0;
    let self = this;
    async function addDelivery(type: string, q: number, isSelfDeliver: boolean) {
      if (q > 0) {
        quantity += q;

        await Families.addDelivery(f.id, await self.context.for(BasketType).findId(type), null, null, {
          comment: '',
          quantity: q,
          selfPickup: isSelfDeliver,
        }, self.context);
      }
    }
    if (this.computerAge === undefined || this.computerAge.isNew)
      await addDelivery('מחשב', this.computer, this.selfDeliver)
    else
      await addDelivery('מחשב_ישן', this.computer, this.selfDeliver);

    if (this.laptopAge === undefined || this.laptopAge.isNew)
      await addDelivery('לפטופ', this.laptop, this.selfDeliver)
    else
      await addDelivery('לפטופ_ישן', this.laptop, this.selfDeliver);

    await addDelivery('מסך', this.screen, this.selfDeliver);

    if (quantity == 0) {
      await Families.addDelivery(f.id, await self.context.for(BasketType).findId('לא פורט'), null, null, {
        comment: '',
        quantity: 1,
        selfPickup: false
      }, this.context);
    }



    if (settings.registerFamilyReplyEmailText && settings.registerFamilyReplyEmailText != '') {
      let message = SendSmsAction.getMessage(settings.registerFamilyReplyEmailText,
        settings.organisationName, f.name, '', '', '');
      try {
        await f.email.Send(settings.lang.thankYouForDonation, message, this.context);
      } catch (err) {
        console.error('send mail', err);
      }
    }
  }
}




