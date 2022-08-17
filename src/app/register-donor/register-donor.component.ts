import { Component, OnInit, Injectable } from '@angular/core';
import { isPhoneValidForIsrael } from "../model-shared/phone";
import { remult, Remult } from 'remult';
import { DialogService } from '../select-popup/dialog';

import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { ActivatedRoute } from '@angular/router';
import { DataAreaSettings, DataControl } from '@remult/angular/interfaces';
import { openDialog } from '@remult/angular';
import { donorForm } from './register-donor.controller';



declare var gtag;
declare var fbq;

@Component({
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrls: ['./register-donor.component.scss']
})
export class RegisterDonorComponent implements OnInit {
  static MinQuantity = 10;

  constructor(private dialog: DialogService, private settings: ApplicationSettings, public activeRoute: ActivatedRoute) { }

  showCCMessage(): boolean {
    if (this.activeRoute.routeConfig.data && this.activeRoute.routeConfig.data.isCC)
      return true
    else return false;
  }

  refer: string = null;
  isDone = false;
  donor = new donorForm();
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






