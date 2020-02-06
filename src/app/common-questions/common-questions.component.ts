import { Component, OnInit } from '@angular/core';
import { ApplicationSettings, qaItem, phoneOption } from '../manage/ApplicationSettings';
import { MatDialogRef } from '@angular/material';
import { Context } from '@remult/core';
import { Families } from '../families/families';

@Component({
  selector: 'app-common-questions',
  templateUrl: './common-questions.component.html',
  styleUrls: ['./common-questions.component.scss']
})
export class CommonQuestionsComponent implements OnInit {

  questions:qaItem[];
  args: {
    family:Families
  };
  phoneOptions: phoneOption[]=[];
  constructor(private settings: ApplicationSettings, private dialog: MatDialogRef<any>,private context:Context) { 
    this.questions = settings.getQuestions();

  }
  async init(family:Families){
    this.args ={family: family};
    this.phoneOptions = await this.settings.getPhoneOptions(family,this.context);
  }

  async ngOnInit() {
    
  }
  cancel()
  {
    this.dialog.close();
  }
  updateFailedDelivery=false;
  confirm(){
    this.updateFailedDelivery = true;
    this.dialog.close();
  }

}
