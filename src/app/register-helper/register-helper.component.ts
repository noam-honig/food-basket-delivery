import { Component, OnInit } from '@angular/core';
import { PhoneColumn, required, isPhoneValidForIsrael } from '../model-shared/types';
import { StringColumn, NumberColumn, DataAreaSettings, ServerFunction, Context, Column, IdColumn } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Helpers } from '../helpers/helpers';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { RequiredValidator } from '@angular/forms';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { EmailSvc } from '../shared/utils';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { ControllerBase, ServerMethod } from '../dev/server-method';

declare var gtag;
declare var fbq;
@Component({
  selector: 'app-register-helper',
  templateUrl: './register-helper.component.html',
  styleUrls: ['./register-helper.component.scss']
})
export class RegisterHelperComponent implements OnInit {
  constructor(private dialog: DialogService, private context: Context, private settings: ApplicationSettings) { }

  refer : string = null;
  isDone = false;

  helper = new helperForm(this.context);
  area = new DataAreaSettings({ columnSettings: () => this.helper.columns.filter(c => c != this.helper.name && c != this.helper.address1 && c != this.helper.address2 && c != this.helper.docref) });
  ngOnInit() {

    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('refer')) {
      this.refer = urlParams.get('refer');
      this.helper.docref.value = this.refer;
    } else {
      this.helper.docref.value = document.referrer;
    }
  }
  allowSubmit() {
    return !this.isDone; //this.hasMandatoryFields();
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

  //    await RegisterHelperComponent.doHelperForm(pack(this.helper));

      this.isDone = true;
      try {
       this.dialog.analytics("submitVolunteerForm");
        gtag('event', 'conversion', {'send_to': 'AW-452581833/e8KfCKWQse8BEMmz59cB'});
        if (fbq) fbq('track', 'CompleteRegistration');
      }
      catch (err) {
        console.log("problem with tags: ", err)
      }
    }
    catch (err) {
      this.dialog.exception("helper form", err);
    }

    await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: "תודה על עזרתך", showOnlyConfirm: true });

    if (this.refer) return;
    if (this.helper.docref.value != '') window.location.href = this.helper.docref.value 
    else window.location.href = "https://www.mitchashvim.org.il/";
  }

}

class helperForm extends ControllerBase {
  constructor(private context: Context) {
    super({ key: 'register-donor', allowed: true })
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

  @ServerMethod()
  async createHelper() {
    let h = this.context.for(Helpers).create();
    h.name.value = this.name.value;
    if (!this.address1.value)
      this.address1.value = '';
    if (!this.address2.value)
      this.address2.value = '';
    h.preferredDistributionAreaAddress.value = this.address1.value;
    h.preferredFinishAddress.value = this.address2.value;
    h.phone.value = this.phone.value;
    h.email.value = this.email.value;
    h.socialSecurityNumber.value = this.socialSecurityNumber.value;
    h.company.value = this.company.value;
    h.referredBy.value = this.docref.value;
    await h.save();

    let settings = await ApplicationSettings.getAsync(this.context);
    if (settings.registerHelperReplyEmailText.value && settings.registerHelperReplyEmailText.value != '') {
      let message = SendSmsAction.getMessage(settings.registerHelperReplyEmailText.value,
        settings.organisationName.value, '', h.name.value, this.context.user.name, '');

      try {
        await EmailSvc.sendMail(settings.lang.thankYouForHelp, message, h.email.value, this.context);
      } catch (err) {
        console.error('send mail', err);
      }
    }
  }
}




