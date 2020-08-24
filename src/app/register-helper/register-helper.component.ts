import { Component, OnInit } from '@angular/core';
import { PhoneColumn, required, isPhoneValidForIsrael } from '../model-shared/types';
import { StringColumn, NumberColumn, DataAreaSettings, ServerFunction, Context, Column, IdColumn } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Sites } from '../sites/sites';
import { Helpers } from '../helpers/helpers';
import { allCentersToken } from '../manage/distribution-centers';
import { executeOnServer, pack } from '../server/mlt';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { RequiredValidator } from '@angular/forms';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { EmailSvc } from '../shared/utils';
import { SendSmsAction } from '../asign-family/send-sms-action';

declare var gtag;
@Component({
  selector: 'app-register-helper',
  templateUrl: './register-helper.component.html',
  styleUrls: ['./register-helper.component.scss']
})
export class RegisterHelperComponent implements OnInit {
  constructor(private dialog: DialogService, private context: Context, private settings: ApplicationSettings) { }
  helper = new helperForm(this.context);
  area = new DataAreaSettings({ columnSettings: () => this.helper.columns.filter(c => c != this.helper.name && c != this.helper.address1 && c != this.helper.address2 && c != this.helper.docref) });
  ngOnInit() {
    this.helper.docref.value = document.referrer;
  }
  allowSubmit() {
    return true; //this.hasMandatoryFields();
  }

  hasMandatoryFields() {
    return (this.helper.name.value != null) && (this.helper.address1.value != null)
      && (isPhoneValidForIsrael(this.helper.phone.value)) && (this.helper.socialSecurityNumber.value != null);
  }

  async submit() {

    if (!this.hasMandatoryFields()) {
      this.dialog.Error(
        "יש למלא שדות חובה" +
        "(שם, כתובת, טלפון ות.ז.)"
      );
      return;
    }
    try {
      let error = '';
      for (const c of this.helper.columns) {
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
      this.dialog.analytics("submitVolunteerForm");
      {
        var callback = function () {

        };

        gtag('event', 'conversion', {
          'send_to': 'AW-607493389/ngwkCLDhp9wBEI261qEC',
          'event_callback': callback
        });
      }

      await RegisterHelperComponent.doHelperForm(pack(this.helper));
      await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: "תודה על עזרתך", showOnlyConfirm: true });
      window.location.href = "https://www.mitchashvim.org.il/";
    }
    catch (err) {
      this.dialog.exception("helper form", err);
    }
  }
  @ServerFunction({ allowed: true })
  static async doHelperForm(args: any[], context?: Context) {
    await executeOnServer(helperForm, args, context);
  }
}

class helperForm {
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
  address1 = new StringColumn({ caption: "כתובת שנדע לחבר לך תורמים קרובים", validate: () => required(this.address1) });
  address2 = new StringColumn({ caption: "איזור נוסף ממנו נח לך לאסוף תרומות?" });

  socialSecurityNumber = new StringColumn({ caption: "תעודת זהות (עבור ביטוח מתנדבים)", validate: () => required(this.socialSecurityNumber) });
  company = new StringColumn({ caption: "ארגון" });
  docref = new StringColumn();

  columns = [this.name, this.socialSecurityNumber, this.phone, this.email, this.address1, this.address2, this.company, this.docref];

  async doWork(context: Context) {
    let h = context.for(Helpers).create();
    h.name.value = this.name.value;
    if (!this.address1.value)
      this.address1.value = '';
    if (!this.address2.value)
      this.address2.value = '';
    h.preferredDistributionAreaAddress.value = this.address1.value;
    h.preferredDistributionAreaAddress2.value = this.address2.value;
    h.phone.value = this.phone.value;
    h.email.value = this.email.value;
    h.socialSecurityNumber.value = this.socialSecurityNumber.value;
    h.company.value = this.company.value;
    h.referredBy.value = this.docref.value;
    await h.save();

    let settings = await ApplicationSettings.getAsync(this.context);
    if (settings.registerHelperReplyEmailText.value && settings.registerHelperReplyEmailText.value != '') {
      let message = SendSmsAction.getMessage(settings.registerHelperReplyEmailText.value,
        settings.organisationName.value, '', h.name.value, context.user.name, '');

      try {
        await EmailSvc.sendMail(settings.lang.thankYouForHelp, message, h.email.value, context);
      } catch (err) {
        console.error('send mail', err);
      }
    }
  }
}




