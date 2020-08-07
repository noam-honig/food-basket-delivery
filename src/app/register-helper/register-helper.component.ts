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
import { RegisterDonorComponent } from '../register-donor/register-donor.component';

@Component({
  selector: 'app-register-helper',
  templateUrl: './register-helper.component.html',
  styleUrls: ['./register-helper.component.scss']
})
export class RegisterHelperComponent implements OnInit {
  constructor(private dialog: DialogService, private context: Context) { }
  helper = new helperForm(this.context);
  area = new DataAreaSettings({ columnSettings: () => this.helper.columns.filter(c => c != this.helper.name && c != this.helper.address1 && c != this.helper.address2) });
  ngOnInit() {
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
      var message=`
      הי 

      נעים מאוד! שמי כרמל כהן
      ואני מנהלת מערך ההתנדבות של "מתחשבים",
      המיזם הלאומי לחלוקת מחשבים לתלמידים בפריפריה הגיאוגרפית-חברתית בישראל.
      
      ראשית, אני ממש מעריכה שהצטרפת להתנדבות איתנו.
      יחד איתך ועם מאות מתנדבים נוספים, נצליח להגיע לעשרות אלפי תלמידים.
      תודה!
      
      המתנדבים הם ❤ המיזם וחשוב לי להשאיר אותך בלופ על הפעילות ולהעביר לך עדכונים חשובים.
      לכן אני מזמינה אותך להצטרף לקבוצת הווסטאפ של המתדנבים
      בה רק אני כותבת (Admin only) ואין חפירות, מבטיחה!
      https://chat.whatsapp.com/KqqnKiGDOsb9wwr0fT08k1
      
      אני רוצה להכיר אותך קצת יותר,
      מבקשת לקבל ממך עוד 2 דקות לענות על כמה שאלות בסיסיות:
      
      יש לי 2 דקות. לשאלות >>
      בינתיים אני מזמינה אותך לשמור ולעבור על המדריך למתחשב 👇🏼
      (ככה אנחנו מכנים את המתנדבים שלנו 😄)
      
      
      שוב- תודה ענקית!
      זמינה במייל לכל עניין.
      
      נהיה בקשר,
      
      כרמל כהן
      
       
       
      חזרה לאתר מתחשבים 
      Created with
      Love it?
      Discover more
      
      `
      var subject="";
      await RegisterHelperComponent.doHelperForm(pack(this.helper),subject,message);
      await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: "תודה על עזרתך", showOnlyConfirm: true });
      window.location.href = "https://www.mitchashvim.org.il/";
    }
    catch (err) {
      this.dialog.exception("helper form", err);
    }
  }
  @ServerFunction({ allowed: true })
  static async doHelperForm(args: any[],subject:string,message:string, context?: Context) {
    await executeOnServer(helperForm, args, context);
    await RegisterDonorComponent.sendMail(subject,message,args[4]);
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
  address2 = new StringColumn({ caption: "איזור נוסף ממנו נח לך לאסוף תרומות?"});
  
  socialSecurityNumber = new StringColumn({ caption: "תעודת זהות (עבור ביטוח מתנדבים)", validate: () => required(this.socialSecurityNumber) });
  company = new StringColumn({ caption: "ארגון"});

  columns = [this.name, this.socialSecurityNumber, this.phone, this.email, this.address1, this.address2, this.company];


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
    h.socialSecurityNumber.value = this.socialSecurityNumber.value;
    h.company.value = this.company.value;
    await h.save();
  }
}




