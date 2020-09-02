import { Component, OnInit, Injectable } from '@angular/core';
import { PhoneColumn, required, isPhoneValidForIsrael } from '../model-shared/types';
import { StringColumn, NumberColumn, BoolColumn, DataAreaSettings, ServerFunction, Context, Column } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Sites } from '../sites/sites';
import { Families } from '../families/families';
import { allCentersToken } from '../manage/distribution-centers';
import { executeOnServer, pack } from '../server/mlt';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { RequiredValidator } from '@angular/forms';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { EmailSvc } from '../shared/utils';
import { SendSmsAction } from '../asign-family/send-sms-action';

declare var gtag;
@Component({
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrls: ['./register-donor.component.scss']
})
export class RegisterDonorComponent implements OnInit {
  constructor(private dialog: DialogService, private context: Context, private settings: ApplicationSettings) { }
  donor = new donorForm(this.context);
  area = new DataAreaSettings({
    columnSettings: () =>
      this.donor.columns.filter(c => c != this.donor.name && c != this.donor.address && c != this.donor.selfDeliver && c != this.donor.docref)
  });
  ngOnInit() {
    this.donor.docref.value = document.referrer;
  }
  allowSubmit() {
    return this.hasQuantity() && this.hasMandatoryFields();
  }

  hasMandatoryFields() {
    return (this.donor.name.value != null) && (isPhoneValidForIsrael(this.donor.phone.value)
      && ((this.donor.selfDeliver.value) || (this.donor.address.value != null))
    );
  }
  hasQuantity() {
    return +this.donor.laptop.value > 0 || +this.donor.computer.value > 0 || +this.donor.screen.value > 0;
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
      let error = '';
      for (const c of this.donor.columns) {
        //@ts-ignore
        c.__clearErrors();
        //@ts-ignore
        c.__performValidation();
        if (!error && c.validationError) {
          error = c.defs.caption + ": " + c.validationError;
        }
      }
      if (error) {
        this.dialog.Error(error);
        return;
      }
      this.dialog.analytics("submitDonorForm");
      {
        var callback = function () {

        };

        gtag('event', 'conversion', {
          'send_to': 'AW-607493389/xIauCNGPlNoBEI261qEC',
          'event_callback': callback
        });
      }

      await RegisterDonorComponent.doDonorForm(pack(this.donor));

      this.dialog.analytics("submitDonorForm");
      await this.context.openDialog(YesNoQuestionComponent, x => x.args = {
        question: this.settings.lang.thankYouForDonation,
        showOnlyConfirm: true
      });
      window.location.href = "https://www.mitchashvim.org.il/";
    }
    catch (err) {
      this.dialog.exception("donor form", err);
    }
  }

  @ServerFunction({ allowed: true })
  static async doDonorForm(args: any[], context?: Context) {
    await executeOnServer(donorForm, args, context);
  }
}

class donorForm {
  constructor(private context: Context) {

  }
  name = new StringColumn({
    caption: "שם מלא", validate: () => {
      required(this.name);

    }
  });
  phone = new StringColumn({
    caption: "טלפון",
    dataControlSettings: () => ({ inputType: 'tel' }),
    validate: () => {
      required(this.phone);
      PhoneColumn.validatePhone(this.phone, this.context);
    }
  });
  email = new StringColumn({
    caption: "דואל",
    dataControlSettings: () => ({ inputType: 'email' })
  });

  selfDeliver = new BoolColumn("אגיע עצמאית לנקודת האיסוף");
  address = new StringColumn({
    caption: "כתובת",
    validate: () => {
      if (!this.selfDeliver.value)
        required(this.address);
    }
  });

  computer = new NumberColumn("מספר מחשבים נייחים");
  laptop = new NumberColumn("מספר לפטופים");
  screen = new NumberColumn("מספר מסכים");

  docref = new StringColumn();
  columns = [this.name, this.selfDeliver, this.computer, this.laptop, this.screen, this.address, this.phone, this.email, this.docref];

  async doWork(context: Context) {
    let f = context.for(Families).create();
    f.name.value = this.name.value;
    if (!this.address.value)
      this.address.value = '';
    f.address.value = this.address.value;
    f.phone1.value = this.phone.value;
    f.email.value = this.email.value;
    f.custom1.value = this.docref.value;

    await f.save();
    var quantity = 0;
    async function addDelivery(type: string, q: number, isSelfDeliver: boolean) {
      if (q > 0) {
        quantity += q;
        await Families.addDelivery(f.id.value, {
          comment: '',
          basketType: type,
          courier: '',
          distCenter: allCentersToken,
          quantity: q,
          selfPickup: isSelfDeliver,
        }, context);
      }
    }
    await addDelivery('מחשב', this.computer.value, this.selfDeliver.value);
    await addDelivery('לפטופ', this.laptop.value, this.selfDeliver.value);
    await addDelivery('מסך', this.screen.value, this.selfDeliver.value);

    if (quantity == 0) {
      await Families.addDelivery(f.id.value, {
        comment: '',
        basketType: 'לא פורט',
        courier: '',
        distCenter: allCentersToken,
        quantity: 1,
        selfPickup: false
      }, context);
    }

    let settings = await ApplicationSettings.getAsync(this.context);

    if (settings.registerFamilyReplyEmailText.value && settings.registerFamilyReplyEmailText.value != '') {
      let message = SendSmsAction.getMessage(settings.registerFamilyReplyEmailText.value,
        settings.organisationName.value, f.name.value, '', '', '');
      try {
        await EmailSvc.sendMail(settings.lang.thankYouForDonation, message, f.email.value, this.context);
      } catch (err) {
        console.error('send mail', err);
      }
    }
  }
}




