import { Component, OnInit } from '@angular/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { GridButton } from '@remult/angular/interfaces';
import { MatDialogRef } from '@angular/material/dialog';
import { messageMerger } from './messageMerger';
import { EditCustomMessageArgs } from '../helpers/init-context';

@Component({
  selector: 'app-edit-custom-message',
  templateUrl: './edit-custom-message.component.html',
  styleUrls: ['./edit-custom-message.component.scss']
})
export class EditCustomMessageComponent implements OnInit {

  constructor(public settings: ApplicationSettings, public ref: MatDialogRef<any>) { }

  args: EditCustomMessageArgs = {
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
  getButtonArgs() {
    return {
      templateText: this.args.templateText,
      close: () => this.ref.close()
    }
  }

}




export function specificMessage(volunteer: string) {
  return new messageMerger([{
    token: '!מתנדב!',
    caption: "שם מתנדב",
    value: volunteer
  }])
}

