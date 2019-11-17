import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { Context, ServerFunction, DirectSQL } from '@remult/core';
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
  constructor(
    private dialogRef: MatDialogRef<SelectCompanyComponent>,
    @Inject(MAT_DIALOG_DATA) private data: SelectCompanyHelper,
    private context: Context
  ) {

  }
  clearCity() {
    this.select('');
  }
  select(city: string) {
    this.data.onSelect(city);
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
  static async getCompanies(context?: Context, directSql?: DirectSQL) {
    var sql = new SqlBuilder();
    let h = new Helpers(context);
    let r = await directSql.execute(sql.query({
      from: h,
      select: () => [sql.build("distinct ", h.company)],
      where: () => [h.company.isGreaterThan('')],
      orderBy:  [{ column: h.company, descending: false }]

    }));
    return r.rows.map(x => x.company);
  }
  static dialog(dialog: MatDialog, data: SelectCompanyHelper) {
    dialog.open(SelectCompanyComponent, { data });
  }



}

export interface SelectCompanyHelper {

  onSelect: (selectedValue: string) => void,


}