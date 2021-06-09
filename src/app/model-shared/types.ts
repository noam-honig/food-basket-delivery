
import { Entity, Filter, SortSegment, FilterConsumerBridgeToSqlRequest, SqlCommand, SqlResult, AndFilter, Context, ValueConverter, InputTypes, EntityField, FieldSettings, FieldDefinitions, EntityDefinitions, rowHelper, Repository, FieldDefinitionsOf, filterOf, filterOptions, comparableFilterItem, supportsContains, ClassType } from '@remult/core';
import { TranslationOptions, use, Field, FieldType, TranslatedCaption } from '../translate';
import * as moment from 'moment';
import { Sites, getLang } from '../sites/sites';
import { EmailSvc, isDesktop } from '../shared/utils';
import { isDate } from 'util';
import { DataControl } from '@remult/angular';







@FieldType<Email>({
  valueConverter: {
    toJson: x => x ? x.address : '',
    fromJson: x => x ? new Email(x) : null
  },
  translation: l => l.email
})
@DataControl<any, Email>({
  click: (x, col) => window.open('mailto:' + col.displayValue),
  allowClick: (x, col) => !!col.displayValue,
  clickIcon: 'email',
  inputType: InputTypes.email,
  width: '250',
  forceEqualFilter: false
})
export class Email {
  async Send(subject: string, message: string, context: Context) {
    await EmailSvc.sendMail(subject, message, this.address, context);
  }
  constructor(public readonly address: string) {

  }
}

export function DateTimeColumn<T = any>(settings?: FieldSettings<Date, T> & TranslatedCaption) {
  return Field<T, Date>({
    ...{ displayValue: (e, x) => x ? x.toLocaleString("he-il") : '' },
    ...settings
  })
}
export function ChangeDateColumn<T = any>(settings?: FieldSettings<Date, T> & TranslatedCaption) {
  return DateTimeColumn<T>({
    ...{ allowApiUpdate: false },
    ...settings
  })
}





export class SqlBuilder {
  max(val: any): any {
    return this.func('max', val);
  }

  extractNumber(from: any): any {
    return this.build("NULLIF(regexp_replace(", from, ", '\\D','','g'), '')::numeric");
  }

  str(val: string): string {
    if (val == undefined)
      val = '';
    return '\'' + val.replace(/'/g, '\'\'') + '\'';
  }
  private dict = new Map<any, string>();


  private entites = new Map<SqlDefs, string>();

  sumWithAlias(what: any, alias: string, ...when: any[]) {
    if (when && when.length > 0) {
      return this.columnWithAlias(this.func('sum', this.case([{ when: when, then: what }], 0)), alias);
    }
    else {
      return this.columnWithAlias(this.func('sum', what), alias);
    }
  }

  addEntity(e: SqlDefs, alias?: string) {
    if (alias) {
      for (const c of e.defs.fields) {
        this.dict.set(c, alias);
        this.dict.set(e[c.key], alias);
      }

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
  func(funcName: string, ...args: any[]): any {
    return this.build(funcName, '(', args, ')');
  }

  getItemSql(e: any) {
    if (this.dict.has(e))
      return this.dict.get(e) + '.' + e.dbName;
    let v = e;
    if (e.dbName)
      v = e.dbName;
    if (e.defs) {
      v = e.defs.dbName;
    }


    let f = e as Filter;
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
  eq<T>(a: FieldDefinitions<T>, b: T | FieldDefinitions<T>) {
    return this.build(a, ' = ', b);
  }
  eqAny(a: string, b: any) {
    return this.build(a, ' = ', b);
  }
  ne<T>(a: FieldDefinitions<T>, b: T | FieldDefinitions<T>) {
    return this.build(a, ' <> ', b);
  }
  notNull(col: FieldDefinitions) {
    return this.build(col, ' is not null');
  }


  gt<T>(a: FieldDefinitions<T>, b: T | FieldDefinitions<T>) {
    return this.build(a, ' > ', b);
  }
  gtAny(a: FieldDefinitions, b: any | any) {
    return this.build(a, ' > ', b);
  }
  and(...args: any[]): string {
    return args.filter(x => x != undefined).map(x => this.getItemSql(x)).filter(x => x != undefined && x != '').join(' and ');
  }
  or(...args: any[]): string {
    return "(" + args.map(x => this.getItemSql(x)).join(' or ') + ")";
  }
  private last = 1;
  getEntityAlias(e: SqlDefs) {
    let result = this.entites.get(e);
    if (result)
      return result;
    result = 'e' + this.last++;
    this.addEntity(e, result);
    return result;



  }
  columnSumInnerSelect(rootEntity: SqlDefs, col: FieldDefinitions<Number>, query: FromAndWhere) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build("sum(", col, ")")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    });
  }
  columnCount(rootEntity: SqlDefs, query: FromAndWhere) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build("count(*)")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    });
  }
  columnCountWithAs(rootEntity: SqlDefs, query: FromAndWhere, colName: string) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build("count(*) ", colName)],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    });
  }
  columnMaxWithAs(rootEntity: SqlDefs, column: FieldDefinitions, query: FromAndWhere, colName: string) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build("max(", column, ") ", colName)],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    });
  }
  columnInnerSelect(rootEntity: SqlDefs, query: QueryBuilder) {
    this.addEntity(rootEntity, rootEntity.defs.dbName);
    return '(' + this.query(query) + ' limit 1)';
  }
  countInnerSelect(query: FromAndWhere, mappedColumn: any) {
    return this.build("(", this.query({
      select: () => [this.build("count(*)")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    }), ") ", mappedColumn);
  }
  countDistinctInnerSelect(col: FieldDefinitions, query: FromAndWhere, mappedColumn: any) {
    return this.build("(", this.query({
      select: () => [this.build("count(distinct ", col, ")")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    }), ") ", mappedColumn);
  }


  countDistinct(col: FieldDefinitions, mappedColumn: FieldDefinitions<number>) {
    return this.build("count (distinct ", col, ") ", mappedColumn)
  }
  count() {
    return this.func('count', '*');
  }
  minInnerSelect(col: FieldDefinitions, query: FromAndWhere, mappedColumn: FieldDefinitions) {
    return this.build('(', this.query({
      select: () => [this.build("min(", col, ")")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    }), ") ", mappedColumn);
  }
  maxInnerSelect(col: FieldDefinitions, query: FromAndWhere, mappedColumn: FieldDefinitions) {
    return this.build('(', this.query({
      select: () => [this.build("max(", col, ")")],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    }), ") ", mappedColumn);
  }
  columnDbName(rootEntity: SqlDefs, query: QueryBuilder) {
    this.addEntity(rootEntity, rootEntity.defs.dbName);
    return '(' + this.query(query) + ')';
  }
  entityDbName(query: QueryBuilder) {
    return '(' + this.query(query) + ') result';
  }
  entityDbNameUnionAll(query1: QueryBuilder, query2: QueryBuilder) {
    return this.unionAll(query1, query2) + ' result';
  }
  union(query1: QueryBuilder, query2: QueryBuilder) {
    return '(' + this.query(query1) + ' union ' + this.query(query2) + ')';
  }
  unionAll(query1: QueryBuilder, query2: QueryBuilder) {
    return '(' + this.query(query1) + ' union  all ' + this.query(query2) + ')';
  }

  in(col: FieldDefinitions, ...values: any[]) {
    return this.build(col, ' in (', values, ')');
  }
  not(arg0: string): any {
    return this.build(' not (', arg0, ')');
  }
  delete(e: SqlDefs, ...where: string[]) {
    return this.build('delete from ', e, ' where ', this.and(...where));
  }
  update(e: SqlDefs, info: UpdateInfo) {
    let result = [];
    result.push('update ', e, ' ', this.getEntityAlias(e), ' set ');

    let from: string;
    if (info.from) {
      from = this.build(' from ', info.from, ' ', this.getEntityAlias(info.from));
    }
    let set = info.set();
    result.push(set.map(a => this.build(this.build(a[0].dbName, ' = ', a[1]))));
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

    result.push('(', info.set().map(a => a[0].dbName), ') ');
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
    let where = [];
    if (query.where) {
      where.push(...query.where());
    }
    {
      if (query.from.defs.evilOriginalSettings.fixedFilter) {
        where.push(Filter.translateWhereToFilter(query.from, query.from.defs.evilOriginalSettings.fixedFilter));
      }
    }
    if (where.length > 0)
      result.push(' where ', this.and(...where));
    if (query.groupBy) {
      result.push(' group by ');
      result.push(query.groupBy());
    }
    if (query.having) {
      result.push(' having ', this.and(...query.having()));
    }
    if (query.orderBy) {
      result.push(' order by ', query.orderBy.map(x => {
        var f = x as SortSegment;
        if (f && f.field) {
          return this.build(f.field, ' ', f.isDescending ? 'desc' : '')
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

  innerSelect(builder: QueryBuilder, col: FieldDefinitions) {
    return this.build('(', this.query(builder), ' limit 1) ', col);
  }
}
class myDummySQLCommand implements SqlCommand {

  execute(sql: string): Promise<SqlResult> {
    throw new Error("Method not implemented.");
  }
  addParameterAndReturnSqlToken(val: any): string {
    if (val === null)
      return "null";
    if (isDate(val))
      val = val.toISOString();
    if (typeof (val) == "string") {
      return new SqlBuilder().str(val);
    }
    return val.toString();
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

class a {
  b: string;
}

export type SqlDefs<T = unknown> = FieldDefinitionsOf<T> & filterOf<T> & { defs: EntityDefinitions };
export function SqlFor<T>(repo: Repository<T> | EntityDefinitions<T>): SqlDefs<T> {
  let defs: EntityDefinitions;
  let re = repo as Repository<T>;
  if (re && re.defs)
    defs = re.defs;
  else
    defs = repo as EntityDefinitions;
  let r = {
    defs,
    idColumn: defs.fields.idColumn,
    [Symbol.iterator]: () => defs.fields[Symbol.iterator](),
    find: defs.fields.find
  };
  let f = Filter.createFilterOf(defs);

  for (const col of defs.fields) {
    r[col.key] = new myBridge(f[col.key] as unknown as filterOptions<any> & comparableFilterItem<any> & supportsContains<any>, col)
  }
  return r as unknown as SqlDefs<T>;
}
class myBridge implements filterOptions<any>, comparableFilterItem<any>, supportsContains<any>, FieldDefinitions {
  constructor(private filter: filterOptions<any> & comparableFilterItem<any> & supportsContains<any>, private defs: FieldDefinitions) {

  }
  isEqualTo(val: any): Filter {
    return this.filter.isEqualTo(val);
  }
  isDifferentFrom(val: any) {
    return this.filter.isDifferentFrom(val);
  }
  isIn(val: any[]): Filter {
    return this.filter.isIn(val);
  }
  isNotIn(val: any[]): Filter {
    return this.filter.isNotIn(val);
  }
  isLessOrEqualTo(val: any): Filter {
    return this.filter.isLessOrEqualTo(val);
  }
  isLessThan(val: any): Filter {
    return this.filter.isLessThan(val);
  }
  isGreaterThan(val: any): Filter {
    return this.filter.isGreaterThan(val);
  }
  isGreaterOrEqualTo(val: any): Filter {
    return this.filter.isGreaterOrEqualTo(val);
  }
  contains(val: string): Filter {
    return this.filter.contains(val);
  }

  key = this.defs.key;
  target = this.defs.target;
  dataType = this.defs.dataType;
  caption = this.defs.caption;
  inputType = this.defs.inputType;
  allowNull = this.defs.allowNull;
  isServerExpression = this.defs.isServerExpression;
  dbReadOnly = this.defs.dbReadOnly;
  get dbName() { return this.defs.dbName; }
  valueConverter = this.defs.valueConverter;
  evilOriginalSettings = this.defs.evilOriginalSettings;

}


export interface QueryBuilder {
  select: () => any[];
  from: SqlDefs;
  crossJoin?: () => SqlDefs[];
  innerJoin?: () => JoinInfo[];
  outerJoin?: () => JoinInfo[];
  where?: () => any[];
  orderBy?: (FieldDefinitions | SortSegment)[];
  groupBy?: () => any[];
  having?: () => any[];
}
export interface FromAndWhere {
  from: SqlDefs;
  crossJoin?: () => SqlDefs[];
  innerJoin?: () => JoinInfo[];
  outerJoin?: () => JoinInfo[];
  where?: () => any[];
}
export interface UpdateInfo {
  set: () => [FieldDefinitions, any][],
  where?: () => any[];
  from?: SqlDefs;
}
export interface InsertInfo {
  into: SqlDefs;
  set: () => [FieldDefinitions, any][];
  from: SqlDefs;
  where?: () => any[];
}
export interface JoinInfo {
  to: SqlDefs;
  on: () => any[];
}

export interface CaseWhenItemHelper {
  when: any[];
  then: any;
}
export function relativeDateName(context: Context, args: { d?: Date, dontShowTimeForOlderDates?: boolean }) {
  let d = args.d;
  if (!d)
    return '';
  return moment(d).locale(getLang(context).languageCodeHe).fromNow();

}

export function logChanges(e: rowHelper<any>, context: Context, args?: {
  excludeColumns?: EntityField<any, any>[],
  excludeValues?: EntityField<any, any>[]
}) {
  if (!args) {
    args = {};
  }
  if (!args.excludeColumns)
    args.excludeColumns = [];
  if (!args.excludeValues)
    args.excludeValues = [];

  let cols = '';
  let vals = '';
  for (const c of e.fields) {
    if (c.wasChanged()) {
      if (!args.excludeColumns.includes(c)) {
        cols += c.defs.key + "|";
        if (!args.excludeValues.includes(c)) {
          vals += c.defs.key + "=" + c.displayValue;
          if (!e.isNew()) {

            vals += " was (" + c.defs.valueConverter.toJson(c.originalValue) + ")";
          }
          vals += "|";
        }
      }
    }
  }


  if (cols) {
    var p = '';
    try {
      p = Sites.getOrganizationFromContext(context);
    }
    catch {
    }
    p += "/" + e.repository.defs.key + "/" + e.fields.idField.value;
    if (e.isNew()) {
      p += "(new)";
    }
    if (context.user)
      p += ", user=" + context.user.id + " (" + context.user.name + ")";
    p += " :" + vals + "\t cols=" + cols;
    console.log(p)
  }

}

export function getValueFromResult(r: any, col: FieldDefinitions) {
  let result = r[col.dbName.toLowerCase()];
  if (result === undefined)
    console.error("couldn't find " + col.key, r);
  return result;
}

