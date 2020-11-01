import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-token-replacer',
  templateUrl: './token-replacer.component.html',
  styleUrls: ['./token-replacer.component.scss']
})
export class TokenReplacerComponent implements OnInit {
  listOfSchemas: string = 'test,test1,test2,test3';

  token: string = 'test1';
  sql: string = 'select city from test1.families';
  seperator: string = ' union all ';
  constructor() { }

  result: string;
  build() {
    this.result = '';

    for (let s of this.listOfSchemas.split(',')) {
      if (s) {
        s = s.trim();
        if (s.length > 0) {
          if (this.result != '')
            this.result += this.seperator + '\r\n';
          this.result += this.sql.split(this.token).join(s) ;
        }
      }
    }
  }

  ngOnInit() {
    this.build();
  }

}
