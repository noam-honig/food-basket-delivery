import { Component, OnInit, Injectable } from '@angular/core';
import { Email } from '../model-shared/types';
import { Phone, isPhoneValidForIsrael } from "../model-shared/Phone";
import { ServerFunction, Context, Column, ServerController, Storable, getControllerDefs, Validators } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Sites } from '../sites/sites';
import { Families } from '../families/families';
import { allCentersToken } from '../manage/distribution-centers';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { EmailSvc } from '../shared/utils';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { ActivatedRoute } from '@angular/router';
import { ServerMethod } from '@remult/core';
import { DataAreaSettings, DataControl, openDialog } from '../../../../radweb/projects/angular';
import { ValueListValueConverter } from '../../../../radweb/projects/core/src/column';
import { use } from '../translate';
import { FamilySourceId } from '../families/FamilySources';

declare var gtag;
declare var fbq;

/*
edit the Wix forms: 

// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world
import wixWindow from 'wix-window';


// ...

$w.onReady(function () {
  // Write your JavaScript here
  let referrer = wixWindow.referrer;  // "http://somesite.com"
  //$w('#button4').label = referrer;

  $w('#button4').onClick ( () => {
    wixWindow.openModal("https://mlt-test.herokuapp.com/mlt/register-donor?refer=" + referrer, {
              "width": 650, "height": 800} );
  } );
  // To select an element by ID use: $w("#elementID")

  // Click "Preview" to run your code
});
*/

@Component({
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrls: ['./register-donor.component.scss']
})
export class RegisterDonorComponent implements OnInit {
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
    columnSettings: () =>
      [
        [this.donor.$.computer, this.donor.$.computerAge],
        [this.donor.$.laptop, this.donor.$.laptopAge],
        this.donor.$.screen,
        this.donor.$.donationType, this.donor.$.phone, this.donor.$.email
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
    return (this.donor.name != null) && (isPhoneValidForIsrael(this.donor.phone.thePhone)
      && ((this.donor.selfDeliver) || (this.donor.address != null))
    );
  }
  hasQuantity() {
    return +this.donor.laptop > 0 || +this.donor.computer > 0 || +this.donor.screen > 0;
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

@Storable({
  valueConverter: () => new ValueListValueConverter(EquipmentAge),
})
@DataControl({
  width: '100'
})
export class EquipmentAge {
  static OldEq = new EquipmentAge(1, '5 שנים או יותר', false);
  static NewEq = new EquipmentAge(0, 'פחות מ 5 שנים', true);
  constructor(public id: number, public caption: string, public isNew: boolean) {
  }

}
@ServerController({
  allowed: true,
  key: 'register-donor'
})
class donorForm {
  constructor(private context: Context) {

  }
  get $() { return getControllerDefs(this).columns }
  @Column({
    caption: "שם מלא",
    validate: Validators.required.withMessage("אנא הזן ערך")
  })
  name: string;
  @Column<donorForm, Phone>({
    caption: "טלפון",
    inputType: 'tel',
    validate: (self, col) => {
      if (!col.value || col.value.thePhone == '')
        col.error = "אנא הזן ערך";
      Phone.validatePhone(col, self.context);
    }
  })
  phone: Phone;
  @Column({
    caption: "דואל",
    inputType: 'email'
  })
  email: Email;


  @Column({ caption: "אגיע עצמאית לנקודת האיסוף" })
  selfDeliver: boolean;
  @Column<donorForm, string>({
    caption: "כתובת",
    validate: (e, col) => {
      Validators.required(e, col, "אנא הזן ערך");
    }
  })
  address: string;

  @Column({ caption: "מספר מחשבים נייחים" })
  computer: number;
  @Column({ caption: "גיל המחשב החדש ביותר" })
  computerAge: EquipmentAge;
  @Column({ caption: "מספר לפטופים" })
  laptop: number;
  @Column({ caption: "גיל הלפטופ החדש ביותר" })
  laptopAge: EquipmentAge;
  @Column({ caption: "מספר מסכים" })
  screen: number;
  @Column({ caption: "סוג תרומה" })
  @DataControl({
    valueList: [{ id: 'ac52f4b0-6896-4ae3-8cc0-18ed17136e38', caption: 'תרומה פרטית' },
    { id: '0b9e0645-206a-457c-8785-97163073366d', caption: 'תרומת בית עסק' }]

  })
  donationType: FamilySourceId;
  @Column()
  docref: string;


  @ServerMethod()
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
    f.familySource = this.donationType;

    await f.save();
    var quantity = 0;
    let self = this;
    async function addDelivery(type: string, q: number, isSelfDeliver: boolean) {
      if (q > 0) {
        quantity += q;
        await Families.addDelivery(f.id, {
          comment: '',
          basketType: type,
          courier: '',
          distCenter: allCentersToken,
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
      await Families.addDelivery(f.id, {
        comment: '',
        basketType: 'לא פורט',
        courier: '',
        distCenter: allCentersToken,
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




