import { Component, OnInit } from '@angular/core';
import { ServerFunction, Context, SqlDatabase } from '@remult/core';
import { SqlBuilder } from '../model-shared/types';
import { Families } from '../families/families';

@Component({
  selector: 'app-duplicate-families',
  templateUrl: './duplicate-families.component.html',
  styleUrls: ['./duplicate-families.component.scss']
})
export class DuplicateFamiliesComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  @ServerFunction({ allowed: true })
  static async familiesInSameAddress(context?: Context, db?: SqlDatabase) {
    let sql = new SqlBuilder();
    let f = context.for(Families).create();
    sql.query({
      select: () => [sql.max(f.createDate), f.drivingLatitude, f.drivingLongitude, sql.max(f.address), sql.count()],
      from: f,
      groupBy: () => [f.drivingLatitude, f.drivingLatitude],
      having: () => [sql.gt(sql.count(), 1)]
      
    });
  }

}
