import { Component, OnInit } from '@angular/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-edit-custom-message',
  templateUrl: './edit-custom-message.component.html',
  styleUrls: ['./edit-custom-message.component.scss']
})
export class EditCustomMessageComponent implements OnInit {

  constructor(public settings: ApplicationSettings) { }

  args = {
    message: specificMessage("noam"),
    templateText: "test",
    title: "שליחת SMS",
    helpText: "עזרה",
    ok: () => { }
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

class messageMerger {
  constructor(public tokens: {
    token: string;
    caption: string;
    value: string;
  }[]) {

  }
  merge(message: string) {
    for (const t of this.tokens) {
      message = message.split(t.token).join(t.value);
    }
    return message;
  }

}