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

@Component({
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrls: ['./register-donor.component.scss']
})
export class RegisterDonorComponent implements OnInit {
  constructor(private dialog: DialogService, private context: Context,private settings:ApplicationSettings) { }
  donor = new donorForm(this.context);
  static sendMail: (subject: string, message: string, email: string) => Promise<boolean>;
  area = new DataAreaSettings({
    columnSettings: () =>
      this.donor.columns.filter(c => c != this.donor.name && c != this.donor.address && c != this.donor.selfDeliver)
  });
  ngOnInit() {
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
      var message=this.settings.donorEmailText.value
      var subject = "מתחשבים";
      await RegisterDonorComponent.doDonorForm(pack(this.donor), subject, message);
      await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: "תודה על תרומך", showOnlyConfirm: true });
      window.location.href = "https://www.mitchashvim.org.il/";
    }
    catch (err) {
      this.dialog.exception("donor form", err);
    }
  }

  @ServerFunction({ allowed: true })
  static async doDonorForm(args: any[], subject: string, message: string, context?: Context) {
    await executeOnServer(donorForm, args, context);
    await RegisterDonorComponent.sendMail(subject, message, args[4]);
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

  selfDeliver = new BoolColumn("אגיע עצמאית למעבדה");
  address = new StringColumn({
    caption: "כתובת",
    validate: () => {
      if (!this.selfDeliver.value)
        required(this.address);
    }
  });

  computer = new NumberColumn("מספר מחשבים ניידים");
  laptop = new NumberColumn("מספר מחשבים נייחים");
  screen = new NumberColumn("מספר מסכים");


  columns = [this.name, this.selfDeliver, this.address, this.phone, this.email, this.computer, this.laptop, this.screen];


  async doWork(context: Context) {
    let f = context.for(Families).create();
    f.name.value = this.name.value;
    if (!this.address.value)
      this.address.value = '';
    f.address.value = this.address.value;
    f.phone1.value = this.phone.value;
    f.email.value = this.email.value;
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
  }
}




