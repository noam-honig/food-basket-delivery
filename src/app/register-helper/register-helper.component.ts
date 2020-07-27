import { Component, OnInit } from '@angular/core';
import { PhoneColumn, required, isPhoneValidForIsrael } from '../model-shared/types';
import { StringColumn, NumberColumn, DataAreaSettings, ServerFunction, Context, Column } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Sites } from '../sites/sites';
import { Helpers } from '../helpers/helpers';
import { allCentersToken } from '../manage/distribution-centers';
import { executeOnServer, pack } from '../server/mlt';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { RequiredValidator } from '@angular/forms';

@Component({
  selector: 'app-register-helper',
  templateUrl: './register-helper.component.html',
  styleUrls: ['./register-helper.component.scss']
})
export class RegisterHelperComponent implements OnInit {
  constructor(private dialog: DialogService, private context: Context) { }
  helper = new helperForm(this.context);
  area = new DataAreaSettings({ columnSettings: () => this.helper.columns.filter(c => c != this.helper.name && c != this.helper.address1) });
  ngOnInit() {
  }
  allowSubmit() {
    return true; //this.hasMandatoryFields();
  }

  hasMandatoryFields() {
    return (this.helper.name.value != null) && (this.helper.address1.value != null) && 
    (this.helper.address2.value != null) && (isPhoneValidForIsrael(this.helper.phone.value));
  }

  async submit() {

    if (!this.hasMandatoryFields()) {
      this.dialog.Error("יש למלא שדות חובה");
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
  address1 = new StringColumn({ caption: "כתובת איזור חלוקה 1", validate: () => required(this.address1) });
  address2 = new StringColumn({ caption: "כתובת איזור חלוקה 2", validate: () => required(this.address2) });
  

  columns = [this.name, this.phone, this.email, this.address1, this.address2];


  async doWork(context: Context) {
    let h = context.for(Helpers).create();
    h.name.value = this.name.value;
    if (!this.address1.value)
      this.address1.value = '';
    if (!this.address2.value)
      this.address2.value = '';
    h.preferredDistributionAreaAddress.value = this.address1.value ;
    h.preferredDistributionAreaAddress2.value = this.address2.value ;
    h.phone.value = this.phone.value;
    h.email.value = this.email.value;
    await h.save();
  }
}




