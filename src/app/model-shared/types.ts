import * as radweb from '@remult/core';
import { Entity, Column, FilterBase, SortSegment, FilterConsumerBridgeToSqlRequest, SQLCommand, SQLQueryResult, ColumnOptions, DecorateDataColumnSettings, ColumnSetting } from '@remult/core';





export interface HasAsyncGetTheValue {
  getTheValue(): Promise<string>;
}

export class PhoneColumn extends radweb.StringColumn {
  constructor(settingsOrCaption?: ColumnOptions<string>) {
    super({
      display: d => d({
        click: () => window.open('tel:' + this.displayValue),
        allowClick: () => !!this.displayValue,
        clickIcon: 'phone'
      })
    }, settingsOrCaption);
  }
  get displayValue() {
    return PhoneColumn.formatPhone(this.value);
  }

  static formatPhone(s: string) {
    if (!s)
      return s;
    let x = s.replace(/\D/g, '');
    if (x.length < 9 || x.length > 10)
      return s;
    x = x.substring(0, x.length - 4) + '-' + x.substring(x.length - 4, x.length);

    x = x.substring(0, x.length - 8) + '-' + x.substring(x.length - 8, x.length);
    return x;
  }
}


export class DateTimeColumn extends radweb.DateTimeColumn {

  dontShowTimeForOlderDates = false;
  getStringForInputTime() {
    if (!this.value)
      return '';
    return this.padZero(this.value.getHours()) + ':' + this.padZero(this.value.getMinutes());
  }
  getStringForInputDate() {
    if (!this.value)
      return '';

    return this.rawValue.substring(0, 10);
    return this.padZero(this.value.getHours()) + ':' + this.padZero(this.value.getMinutes());
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

    this.value = new Date(this.value.getFullYear(), this.value.getMonth(), this.value.getDate(), hour, minutes);

  }
  dateInputChangeEvent(e: any) {
    var newDate: Date = e.target.valueAsDate;
    var hours = 0;
    var minutes = 0;
    if (this.value) {
      hours = this.value.getHours();
      minutes = this.value.getMinutes();

    }
    this.value = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), hours, minutes);

  }
  relativeDateName(d?: Date, now?: Date) {
    if (!d)
      d = this.value;
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
      let days = (Math.trunc(now.valueOf() / (86400 * 1000)) - Math.trunc(d.valueOf() / (86400 * 1000)));
      r = 'לפני ' + days + ' ימים';
    }
    let t = d.getMinutes().toString();
    if (t.length == 1)
      t = '0' + t;
    if (this.dontShowTimeForOlderDates)
      return r;
    return r += ' ב' + d.getHours() + ':' + t;
  }
  get displayValue() {
    if (this.value)
      return this.value.toLocaleString("he-il");
    return '';
  }

}

export class changeDate extends DateTimeColumn {
  allowApiUpdate = false;
}


export class SqlBuilder {
  extractNumber(from: any): any {
    return this.build("NULLIF(regexp_replace(", from, ", '\\D','','g'), '')::numeric");
  }

  str(val: string): string {
    if (val == undefined)
      val = '';
    return '\'' + val.replace(/'/g, '\'\'') + '\'';
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

    let f = e as FilterBase;
    if (f && f.__applyToConsumer) {

      let bridge = new FilterConsumerBridgeToSqlRequest(new myDummySQLCommand());
      f.__applyToConsumer(bridge);
      return bridge.where.substring(' where '.length);
    }
    if (e instanceof Array) {
      v = e.map(x => this.getItemSql(x)).join(', ');
    }
    return v;
  }
  eq<T>(a: Column<T>, b: T | Column<T>) {
    return this.build(a, ' = ', b);
  }
  eqAny(a: string, b: any) {
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
  gtAny(a: Column<any>, b: any | any) {
    return this.build(a, ' > ', b);
  }
  and(...args: any[]): string {
    return args.map(x => this.getItemSql(x)).join(' and ');
  }
  or(...args: any[]): string {
    return "(" + args.map(x => this.getItemSql(x)).join(' or ') + ")";
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
  max(col: Column<any>, query: FromAndWhere, mappedColumn: Column<any>) {
    return this.build('(', this.query({
      select: () => [this.build("max(", col, ")")],
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
    return this.union(query1, query2) + ' result';
  }
  union(query1: QueryBuilder, query2: QueryBuilder) {
    return '(' + this.query(query1) + ' union ' + this.query(query2) + ')';
  }

  in(col: Column<any>, ...values: any[]) {
    return this.build(col, ' in (', values, ')');
  }
  not(arg0: string): any {
    return this.build(' not (', arg0, ')');
  }
  delete(e: Entity<any>, ...where: string[]) {
    return this.build('delete from ', e, ' where ', this.and(...where));
  }
  update(e: Entity<any>, info: UpdateInfo) {
    let result = [];
    result.push('update ', e, ' ', this.getEntityAlias(e), ' set ');

    let from: string;
    if (info.from) {
      from = this.build(' from ', info.from, ' ', this.getEntityAlias(info.from));
    }
    result.push(info.set().map(a => this.build(this.build(a[0].__getDbName(), ' = ', a[1]))));
    if (from)
      result.push(from);

    if (info.where) {
      result.push(' where ')
      result.push(this.and(...info.where()));
    }
    return this.build(...result);
  }
  insert(info: InsertInfo) {
    let result = [];
    result.push('insert into ', info.into, ' ');

    result.push('(', info.set().map(a => a[0].__getDbName()), ') ');
    result.push(this.query({
      select: () => info.set().map(a => a[1]),
      from: info.from,
      where: info.where
    }));

    return this.build(...result);
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
class myDummySQLCommand implements SQLCommand {
  addParameterToCommandAndReturnParameterName(col: radweb.Column<any>, val: any): string {
    if (typeof (val) == "string") {
      return new SqlBuilder().str(val);
    }
    return val.toString();
  } query(sql: string): Promise<SQLQueryResult> {
    throw new Error("Method not implemented.");
  }


}
export class myThrottle {
  constructor(private ms: number) {

  }
  lastRun: number = 0;

  runNext: () => void;

  do(what: () => void) {
    let current = new Date().valueOf();
    if (this.lastRun + this.ms < current) {
      this.lastRun = current;
      what();
    } else {
      if (!this.runNext) {
        this.runNext = what;
        setTimeout(() => {
          let x = this.runNext;
          this.runNext = undefined;
          this.lastRun = new Date().valueOf();
          x();
        }, this.lastRun + this.ms - current);
      }
      else this.runNext = what;
    }
  }
}
export class delayWhileTyping {
  lastTimer: any;
  constructor(private ms: number) {

  }

  do(what: () => void) {
    clearTimeout(this.lastTimer);
    this.lastTimer = setTimeout(() => {
      what();
    }, this.ms);

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
export interface UpdateInfo {
  set: () => [Column<any>, any][],
  where?: () => any[];
  from?: Entity<any>;
}
export interface InsertInfo {
  into: Entity<any>;
  set: () => [Column<any>, any][];
  from: Entity<any>;
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