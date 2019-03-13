import * as uuid from 'uuid';
import * as radweb from 'radweb';
import { DataProviderFactory, EntityOptions, Entity, Column, Filter, FilterBase, SortSegment } from "radweb";

import { ContextEntity, ContextEntityOptions, MoreDataColumnSettings, hasMoreDataColumnSettings } from '../shared/context';
import { BrowserPlatformLocation } from '@angular/platform-browser/src/browser/location/browser_platform_location';
import { query } from '@angular/animations';
export class IdEntity<idType extends Id> extends ContextEntity<string>
{
  id: idType;
  constructor(id: idType, options?: ContextEntityOptions | string) {
    super(options);
    this.id = id;
    id.readonly = true;
    let x = this.onSavingRow;
    this.onSavingRow = () => {
      if (this.isNew() && !this.id.value && !this.disableNewId)
        this.id.setToNewId();
      return x();
    }
  }
  private disableNewId = false;
  setEmptyIdForNewRow() {
    this.id.value = '';
    this.disableNewId = true;
  }
}




export interface HasAsyncGetTheValue {
  getTheValue(): Promise<string>;
}
export class StringColumn extends radweb.StringColumn implements hasMoreDataColumnSettings {
  __getMoreDataColumnSettings(): MoreDataColumnSettings<any, any> {
    return this.settingsOrCaption as MoreDataColumnSettings<any, any>;
  }
  constructor(private settingsOrCaption?: MoreDataColumnSettings<string, StringColumn> | string) {
    super(settingsOrCaption);
  }
}
export class NumberColumn extends radweb.NumberColumn implements hasMoreDataColumnSettings {
  __getMoreDataColumnSettings(): MoreDataColumnSettings<any, any> {
    return this.settingsOrCaption as MoreDataColumnSettings<any, any>;
  }
  constructor(private settingsOrCaption?: MoreDataColumnSettings<number, NumberColumn> | string) {
    super(settingsOrCaption);
  }
}
export class Id extends StringColumn {
  setToNewId() {
    this.value = uuid();
  }
}
export class BoolColumn extends radweb.BoolColumn implements hasMoreDataColumnSettings {
  __getMoreDataColumnSettings(): MoreDataColumnSettings<any, any> {
    return this.settingsOrCaption as MoreDataColumnSettings<any, any>;
  }
  constructor(private settingsOrCaption?: MoreDataColumnSettings<boolean, BoolColumn> | string) {
    super(settingsOrCaption);
  }
}

export class DateTimeColumn extends radweb.DateTimeColumn implements hasMoreDataColumnSettings {
  __getMoreDataColumnSettings(): MoreDataColumnSettings<any, any> {
    return this.settingsOrCaption as MoreDataColumnSettings<any, any>;
  }
  constructor(private settingsOrCaption?: MoreDataColumnSettings<string, DateTimeColumn> | string) {
    super(settingsOrCaption);
  }
  dontShowTimeForOlderDates = false;
  getStringForInputTime() {
    if (!this.value)
      return '';
    return this.padZero(this.dateValue.getHours()) + ':' + this.padZero(this.dateValue.getMinutes());
  }
  getStringForInputDate() {
    if (!this.value)
      return '';

    return this.value.substring(0, 10);
    return this.padZero(this.dateValue.getHours()) + ':' + this.padZero(this.dateValue.getMinutes());
  }
  padZero(v: number) {
    var result = '';
    if (v < 10)
      result = '0';
    result += v;
    return result;
  }
  timeInputChangeEvent(e: any) {
    var hour = 0;
    var minutes = 0;
    var timeString: string = e.target.value;
    if (timeString.length >= 5) {
      hour = +timeString.substring(0, 2);
      minutes = +timeString.substring(3, 5);

    }

    this.dateValue = new Date(this.dateValue.getFullYear(), this.dateValue.getMonth(), this.dateValue.getDate(), hour, minutes);

  }
  dateInputChangeEvent(e: any) {
    var newDate: Date = e.target.valueAsDate;
    var hours = 0;
    var minutes = 0;
    if (this.dateValue) {
      hours = this.dateValue.getHours();
      minutes = this.dateValue.getMinutes();

    }
    this.dateValue = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), hours, minutes);

  }
  relativeDateName(d?: Date, now?: Date) {
    if (!d)
      d = this.dateValue;
    if (!d)
      return '';
    if (!now)
      now = new Date();
    let sameDay = (x: Date, y: Date) => {
      return x.getFullYear() == y.getFullYear() && x.getMonth() == y.getMonth() && x.getDate() == y.getDate()
    }
    let diffInMinues = Math.ceil((now.valueOf() - d.valueOf()) / 60000);
    if (diffInMinues <= 1)
      return 'לפני דקה';
    if (diffInMinues < 60) {

      return 'לפני ' + diffInMinues + ' דקות';
    }
    if (diffInMinues < 60 * 10 || sameDay(d, now)) {
      let hours = Math.floor(diffInMinues / 60);
      let min = diffInMinues % 60;
      if (min > 50) {
        hours += 1;
        min = 0;
      }
      let r;
      switch (hours) {
        case 1:
          r = 'שעה';
          break
        case 2:
          r = "שעתיים";
          break;
        default:
          r = hours + ' שעות';
      }

      if (min > 35)
        r += ' ושלושת רבעי';
      else if (min > 22) {
        r += ' וחצי';
      }
      else if (min > 7) {
        r += ' ורבע ';
      }
      return 'לפני ' + r;

    }
    let r = ''
    if (sameDay(d, new Date(now.valueOf() - 86400 * 1000))) {
      r = 'אתמול';
    }
    else if (sameDay(d, new Date(now.valueOf() - 86400 * 1000 * 2))) {
      r = 'שלשום';
    }
    else {
      r = 'לפני ' + (Math.trunc(now.valueOf() / (86400 * 1000)) - Math.trunc(d.valueOf() / (86400 * 1000))) + ' ימים';
    }
    let t = d.getMinutes().toString();
    if (t.length == 1)
      t = '0' + t;
    if (this.dontShowTimeForOlderDates)
      return r;
    return r += ' ב' + d.getHours() + ':' + t;
  }

}
export function updateSettings<type, colType>(original: MoreDataColumnSettings<type, colType> | string, addValues: (x: MoreDataColumnSettings<type, colType>) => void) {
  let result: MoreDataColumnSettings<type, colType> = {};
  if (typeof (original) == "string")
    result.caption = original;
  else
    result = original;
  addValues(result);
  return result;
}
export class changeDate extends DateTimeColumn implements hasMoreDataColumnSettings {
  __getMoreDataColumnSettings(): MoreDataColumnSettings<any, any> {
    return this.optionsOrCaption as MoreDataColumnSettings<any, any>;
  }
  constructor(private optionsOrCaption: MoreDataColumnSettings<string, DateTimeColumn> | string) {
    super(updateSettings(optionsOrCaption, x => x.readonly = true));
  }

}

export async function checkForDuplicateValue(row: Entity<any>, column: Column<any>, message?: string) {
  if (row.isNew() || column.value != column.originalValue) {
    let rows = await row.source.find({ where: column.isEqualTo(column.value) });
    console.log(rows.length);
    if (rows.length > 0)
      column.error = message || 'כבר קיים במערכת';
  }

}

export class SqlBuilder {

  str(val: string): string | radweb.Column<string> {
    return '\'' + val.replace('\'', '\'\'') + '\'';
  }
  private dict = new Map<Column<any>, string>();


  private entites = new Map<Entity<any>, string>();



  addEntity(e: Entity<any>, alias?: string) {
    if (alias) {
      e.__iterateColumns().forEach(c => {
        this.dict.set(c, alias);
      });
      this.entites.set(e, alias);
    }
  }
  columnWithAlias(a: any, b: any) {
    return this.build(a, ' ', b);
  }
  build(...args: any[]): string {
    let result = '';
    args.forEach(e => {

      result += this.getItemSql(e);
    });
    return result;
  }

  getItemSql(e: any) {
    if (this.dict.has(e))
      return this.dict.get(e) + '.' + e.__getDbName();
    let v = e;
    if (e instanceof Entity)
      v = e.__getDbName();
    if (e instanceof Column)
      v = e.__getDbName();
    if (e instanceof Array) {
      v = e.map(x => this.getItemSql(x)).join(', ');
    }
    return v;
  }
  eq<T>(a: Column<T>, b: T | Column<T>) {
    return this.build(a, ' = ', b);
  }
  ne<T>(a: Column<T>, b: T | Column<T>) {
    return this.build(a, ' <> ', b);
  }
  notNull(col: Column<any>) {
    return this.build(col, ' is not null');
  }


  gt<T>(a: Column<T>, b: T | Column<T>) {
    return this.build(a, ' > ', b);
  }
  and(...args: any[]): string {
    return args.map(x => this.getItemSql(x)).join(' and ');
  }
  private last = 1;
  getEntityAlias(e: Entity<any>) {
    let result = this.entites.get(e);
    if (result)
      return result;
    result = 'e' + this.last++;
    this.addEntity(e, result);
    return result;



  }
  columnSumInnerSelect(rootEntity: Entity<any>, col: Column<Number>, query: FromAndWhere) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build("sum(", col, ")")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    });
  }
  columnCount(rootEntity: Entity<any>, query: FromAndWhere) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build("count(*)")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    });
  }
  columnInnerSelect(rootEntity: Entity<any>, query: QueryBuilder) {
    this.addEntity(rootEntity, rootEntity.__getDbName());
    return '(' + this.query(query) + ' limit 1)';
  }
  countInnerSelect(query: FromAndWhere, mappedColumn: Column<number>) {
    return this.build("(", this.query({
      select: () => [this.build("count(*)")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    }), ") ", mappedColumn);
  }
  countDistinct(col: Column<any>, mappedColumn: Column<number>) {
    return this.build("count (distinct ", col, ") ", mappedColumn)
  }
  min(col: Column<any>, query: FromAndWhere, mappedColumn: Column<any>) {
    return this.build('(', this.query({
      select: () => [this.build("min(", col, ")")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    }), ") ", mappedColumn);
  }
  columnDbName(rootEntity: Entity<any>, query: QueryBuilder) {
    this.addEntity(rootEntity, rootEntity.__getDbName());
    return '(' + this.query(query) + ')';
  }
  entityDbName(query: QueryBuilder) {
    return '(' + this.query(query) + ') result';
  }
  entityDbNameUnion(query1: QueryBuilder, query2: QueryBuilder) {
    return '(' + this.query(query1) + ' union ' + this.query(query2) + ') result';
  }
  in(col: Column<any>, ...values: any[]) {
    return this.build(col, ' in (', values, ')');
  }
  not(arg0: string): any {
    return this.build(' not (', arg0, ')');
  }
  query(query: QueryBuilder) {

    let from = [];
    from.push(' from ');
    from.push(query.from, ' ', this.getEntityAlias(query.from));
    if (query.crossJoin) {
      query.crossJoin().forEach(j => {
        from.push(' cross join ', j, ' ', this.getEntityAlias(j));
      });
    }
    if (query.innerJoin) {
      query.innerJoin().forEach(j => {
        let alias = this.getEntityAlias(j.to);
        from.push(' left join ', j.to, ' ', alias, ' on ', this.and(...j.on()));
      });
    }
    if (query.outerJoin) {
      query.outerJoin().forEach(j => {
        let alias = this.getEntityAlias(j.to);
        from.push(' left outer join ', j.to, ' ', alias, ' on ', this.and(...j.on()));
      });
    }
    let result = [];
    result.push('select ');
    result.push(query.select());
    result.push(...from);
    if (query.where) {
      result.push(' where ', this.and(...query.where()));
    }
    if (query.orderBy) {
      result.push(' order by ', query.orderBy.map(x => {
        var f = x as SortSegment;
        if (f && f.column) {
          return this.build(f.column, ' ', f.descending ? 'desc' : '')
        }
        else return x;

      }));
    }
    return this.build(...result);



  }
  case(args: CaseWhenItemHelper[], else_: any) {
    if (args.length == 0)
      return else_;
    let result = [];
    result.push('case');
    args.forEach(x => {
      result.push(' when ');
      result.push(this.and(...x.when));
      result.push(' then ');
      result.push(x.then);
    });
    result.push(' else ');
    result.push(else_);
    result.push(' end');
    return this.build(...result);

  }

  innerSelect(builder: QueryBuilder, col: Column<any>) {
    return this.build('(', this.query(builder), ' limit 1) ', col);
  }
}
export interface QueryBuilder {
  select: () => any[];
  from: Entity<any>;
  crossJoin?: () => Entity<any>[];
  innerJoin?: () => JoinInfo[];
  outerJoin?: () => JoinInfo[];
  where?: () => any[];
  orderBy?: (Column<any> | SortSegment)[];
}
export interface FromAndWhere {
  from: Entity<any>;
  crossJoin?: () => Entity<any>[];
  innerJoin?: () => JoinInfo[];
  outerJoin?: () => JoinInfo[];
  where?: () => any[];
}
export interface JoinInfo {
  to: Entity<any>;
  on: () => any[];
}

export interface CaseWhenItemHelper {
  when: any[];
  then: any;
}