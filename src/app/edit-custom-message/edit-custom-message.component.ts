import { Component, OnInit } from '@angular/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { GridButton } from '@remult/angular';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-edit-custom-message',
  templateUrl: './edit-custom-message.component.html',
  styleUrls: ['./edit-custom-message.component.scss']
})
export class EditCustomMessageComponent implements OnInit {

  constructor(public settings: ApplicationSettings, public ref:MatDialogRef<any>) { }

args = {
  message: specificMessage("noam"),
  templateText: "test",
  title: "שליחת SMS",
  helpText: "עזרה",
  buttons: [] as GridButton[]
}
ngOnInit(): void {
}


testSms() {
  return this.args.message.merge(this.args.templateText);
}

}



function specificMessage(volunteer: string) {
  return new messageMerger([{
    token: '!מתנדב!',
    caption: "שם מתנדב",
    value: volunteer
  }])
}

export class messageMerger {
  constructor(public tokens: {
    token: string;
    caption?: string;
    value: string;
  }[]) {
    for (const t of this.tokens) {
      if (!t.caption)
        t.caption = t.token;
      t.token = "!" + t.token + "!";
    }
  }
  merge(message: string) {
    for (const t of this.tokens) {
      message = message.split(t.token).join(t.value);
    }
    return message;
  }

}