import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, ServerFunction, SqlDatabase } from '@remult/core';
import { Roles } from '../auth/roles';
import { SqlBuilder } from '../model-shared/types';
import { Helpers } from '../helpers/helpers';

@Component({
  selector: 'app-select-company',
  templateUrl: './select-company.component.html',
  styleUrls: ['./select-company.component.scss']
})
export class SelectCompanyComponent implements OnInit {

  searchString: string = '';
  cities: string[] = [];
  public argOnSelect: (selectedValue: string) => void;



  constructor(
    private dialogRef: MatDialogRef<any>
  ) {

  }
  clearCity() {
    this.select('');
  }
  select(city: string) {
    this.argOnSelect(city);
    this.dialogRef.close();
  }

  async ngOnInit() {
    this.cities = await SelectCompanyComponent.getCompanies();
  }
  matches(s: string) {
    if (this.searchString == '')
      return true;
    return s.indexOf(s) >= 0;
  }

  selectFirst() {
    for (const c of this.cities) {
      if (this.matches(c)) {
        this.select(c);
        return;
      }
    }

  }
  @ServerFunction({ allowed: Roles.admin })
  static async getCompanies(context?: Context, db?: SqlDatabase) {
    var sql = new SqlBuilder();
    let h = context.for(Helpers).create();
    let r = await db.execute(sql.query({
      from: h,
      select: () => [sql.build("distinct ", h.company)],
      where: () => [h.company.isGreaterThan('')],
      orderBy: [{ column: h.company, descending: false }]

    }));
    return r.rows.map(x => x.company);
  }
}

