import { Component, OnInit } from '@angular/core'
import { remult } from 'remult'
import { GridSettings } from '../common-ui-elements/interfaces'
import { Helpers } from '../helpers/helpers'
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component'
import { RegisterURL } from './regsiter-url'
import { openDialog } from '../common-ui-elements'

@Component({
  selector: 'app-register-url',
  templateUrl: './register-url.component.html',
  styleUrls: ['./register-url.component.scss']
})
export class RegisterURLComponent implements OnInit {
  urls = new GridSettings(remult.repo(RegisterURL), {
    allowUpdate: true,
    allowInsert: true,
    numOfColumnsInGrid: 2,

    orderBy: { prettyName: 'asc' },
    rowsInPage: 100,
    gridButtons: [
      {
        name: 'עדכן ממתנדבים ותורמים',
        click: async () => {
          if (
            await openDialog(
              YesNoQuestionComponent,
              (q) =>
                (q.args = {
                  question: 'האם להוסיף נתונים מטבלאות תורמים ומתנדבים?'
                }),
              (q) => q.yes
            )
          ) {
            await RegisterURL.loadUrlsFromTables()
            await this.urls.reloadData()
          }
        }
      }
    ]
  })

  ngOnInit() {}
}
