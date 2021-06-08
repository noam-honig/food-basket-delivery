import { Component, OnInit } from '@angular/core';

import { ServerFunction, Context,  ServerController, ServerMethod, getControllerDefs } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Helpers } from '../helpers/helpers';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DataAreaSettings, openDialog } from '@remult/angular';


declare var gtag;
declare var fbq;
@Component({
  selector: 'app-register-helper',
  templateUrl: './register-helper.component.html',
  styleUrls: ['./register-helper.component.scss']
})
export class RegisterHelperComponent implements OnInit {
  constructor(private dialog: DialogService, private context: Context, private settings: ApplicationSettings) { }

  refer: string = null;
  isDone = false;

  helper = this.context.for(Helpers).create();
  
  area = new DataAreaSettings({
    fields: () => [
      { column: this.helper.$.socialSecurityNumber, caption: "תעודת זהות (עבור ביטוח מתנדבים)" },
      { column: this.helper.$.phone, allowClick: () => false },
      { column: this.helper.$.email, allowClick: () => false },
      { column: this.helper.$.company, allowClick: () => false }
    ]
  });
  ngOnInit() {
  }
  allowSubmit() {
    return !this.isDone;
  }

  async submit() {
    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('refer')) {
      this.refer = urlParams.get('refer');
      this.helper.referredBy = this.refer;
    } else {
      this.helper.referredBy = document.referrer;
    }

    await this.helper.mltRegister();

    this.isDone = true;
    try {
      this.dialog.analytics("submitVolunteerForm");
      gtag('event', 'conversion', { 'send_to': 'AW-452581833/e8KfCKWQse8BEMmz59cB' });
      if (fbq) fbq('track', 'CompleteRegistration');
    }
    catch (err) {
      console.log("problem with tags: ", err)
    }

    await openDialog(YesNoQuestionComponent, x => x.args = { question: "תודה על עזרתך", showOnlyConfirm: true });

    if (this.refer) return;
    if (this.helper.referredBy != '') window.location.href = this.helper.referredBy;
    else window.location.href = "https://www.mitchashvim.org.il/";
  }

}
