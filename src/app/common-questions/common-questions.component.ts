import { Component, OnInit } from '@angular/core';
import { ApplicationSettings, qaItem, phoneOption } from '../manage/ApplicationSettings';
import { MatDialogRef } from '@angular/material/dialog';

import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

@Component({
  selector: 'app-common-questions',
  templateUrl: './common-questions.component.html',
  styleUrls: ['./common-questions.component.scss']
})
export class CommonQuestionsComponent implements OnInit {

  questions: qaItem[];
  args: {
    family: ActiveFamilyDeliveries
  };
  phoneOptions: phoneOption[] = [];
  constructor(public settings: ApplicationSettings, private dialog: MatDialogRef<any>) {
    this.questions = settings.getQuestions();

  }
  async init(family: ActiveFamilyDeliveries) {
    this.args = { family: family };
    this.phoneOptions = await ApplicationSettings.getPhoneOptions(family.id);
  }

  async ngOnInit() {

  }
  cancel() {
    this.dialog.close();
  }
  updateFailedDelivery = false;
  confirm() {
    this.updateFailedDelivery = true;
    this.dialog.close();
  }

}
