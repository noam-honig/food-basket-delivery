import { Component, OnInit } from '@angular/core';
import { Context, SqlDatabase } from '@remult/core';
import { Helpers } from '../helpers/helpers';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { RegisterURL } from './regsiter-url';

@Component({
  selector: 'app-register-url',
  templateUrl: './register-url.component.html',
  styleUrls: ['./register-url.component.scss']
})

export class SigningURLComponent implements OnInit {

  constructor(private context: Context) { }
  urls = this.context.for(RegisterURL).gridSettings({
    allowUpdate: true, 
    allowInsert: true,
    numOfColumnsInGrid: 2,
    get: {
      orderBy: su => [{ column: su.prettyName, descending: false }],
      limit: 100
    },
    gridButtons:[{
      name:'עדכן ממתנדבים ותורמים',
      click:async ()=>{
        if (await this.context.openDialog(YesNoQuestionComponent, q => q.args = {
          question: 'האם להוסיף נתונים מטבלאות תורמים ומתנדבים?'
        }, q => q.yes)) {
          await RegisterURL.loadUrlsFromTables();
          await this.urls.getRecords();
        }
      }
    }]
  });

  ngOnInit() { }

}
