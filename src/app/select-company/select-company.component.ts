import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Remult, BackendMethod, SqlDatabase } from 'remult';
import { Roles } from '../auth/roles';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Helpers } from '../helpers/helpers';
import { ApplicationSettings } from '../manage/ApplicationSettings';

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
    private dialogRef: MatDialogRef<any>,
    public settings: ApplicationSettings
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
  @BackendMethod({ allowed: Roles.distCenterAdmin })
  static async getCompanies(remult?: Remult, db?: SqlDatabase) {
    var sql = new SqlBuilder(remult);
    let h = SqlFor(remult.repo(Helpers));
    let r = await db.execute(await sql.query({
      from: h,
      select: () => [sql.build("distinct ", h.company)],
      where: () => [h.where({ company: { ">": '' } })],
      orderBy: [{ field: h.company }]

    }));
    return r.rows.map(x => x.company);
  }
}

