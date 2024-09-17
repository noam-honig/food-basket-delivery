import {
  Filter,
  SortSegment,
  FieldMetadata,
  SqlCommand,
  FieldsMetadata,
  Repository,
  EntityMetadata,
  SqlResult,
  EntityFilter,
  CustomSqlFilterBuilder,
  remult,
  SqlDatabase,
  type CustomSqlFilterBuilderFunction
} from 'remult'

import { FilterConsumer } from 'remult/src/filter/filter-interfaces'

import { InitContext } from '../helpers/init-context'

export class SqlBuilder {
  static filterTranslators: { translate: (f: Filter) => Promise<Filter> }[] = []
  max(val: any): any {
    return this.func('max', val)
  }

  extractNumber(from: any): any {
    return this.build(
      'NULLIF(regexp_replace(',
      from,
      ", '\\D','','g'), '')::numeric"
    )
  }
  extractNumberChars(from: any): any {
    return this.build('NULLIF(regexp_replace(', from, ", '\\D','','g'), '')")
  }

  str(val: string): string {
    if (val == undefined) val = ''
    return "'" + val.replace(/'/g, "''") + "'"
  }
  private dict = new Map<any, string>()

  private entites = new Map<SqlDefs, string>()

  sumWithAlias(what: any, alias: string, ...when: any[]) {
    if (when && when.length > 0) {
      return this.columnWithAlias(
        this.func('sum', this.case([{ when: when, then: what }], 0)),
        alias
      )
    } else {
      return this.columnWithAlias(this.func('sum', what), alias)
    }
  }

  addEntity(e: SqlDefs, alias?: string) {
    if (alias) {
      for (const c of e.metadata.fields) {
        this.dict.set(c, alias)
        this.dict.set(e[c.key], alias)
      }

      this.entites.set(e, alias)
    }
  }
  columnWithAlias(a: any, b: any) {
    return this.build(a, ' ', b)
  }
  async build(...args: any[]): Promise<string> {
    let result = ''
    for (const x of args) {
      result += await this.getItemSql(x)
    }
    return result
  }
  func(funcName: string, ...args: any[]) {
    return this.build(funcName, '(', args, ')')
  }

  async getItemSql(e: any) {
    if (e instanceof Promise) return this.getItemSql(await e)
    if (this.dict.has(e))
      return this.dict.get(e) + '.' + (await e.metadata.getDbName())
    let v = e
    if (e.getDbName) v = await e.getDbName()
    if (e.metadata?.getDbName) {
      v = await e.metadata.getDbName()
    }

    let f = e as Filter
    if (f && f.__applyToConsumer) {
      for (const t of SqlBuilder.filterTranslators) {
        f = await t.translate(f)
      }
      let bridge = new FilterConsumerBridgeToSqlRequest(new myDummySQLCommand())
      bridge._addWhere = false
      f.__applyToConsumer(bridge)
      return await bridge.resolveWhere()
    }
    if (e instanceof Array) {
      v = (await Promise.all(e.map((x) => this.getItemSql(x)))).join(', ')
    }
    return v
  }
  eq<T>(a: FieldMetadata<T>, b: any | FieldMetadata<any>) {
    //should have been typed but broke - to fix later
    return this.build(a, ' = ', b)
  }
  eqAny(a: string, b: any) {
    return this.build(a, ' = ', b)
  }
  ne<T>(a: FieldMetadata<T>, b: T | FieldMetadata<T> | string) {
    return this.build(a, ' <> ', b)
  }
  notNull(col: FieldMetadata) {
    return this.build(col, ' is not null')
  }

  gt<T>(a: FieldMetadata<T>, b: T | FieldMetadata<T>) {
    return this.build(a, ' > ', b)
  }
  gtAny(a: FieldMetadata, b: any | any) {
    return this.build(a, ' > ', b)
  }
  async and(...args: any[]): Promise<string> {
    return (
      await Promise.all(
        args
          .filter((x) => x != undefined)
          .map(async (x) => await this.getItemSql(x))
      )
    )
      .filter((x) => x != undefined && x != '')
      .join(' and ')
  }
  async or(...args: any[]): Promise<string> {
    return (
      '(' +
      (await Promise.all(args.map(async (x) => await this.getItemSql(x)))).join(
        ' or '
      ) +
      ')'
    )
  }
  private last = 1
  getEntityAlias(e: SqlDefs) {
    let result = this.entites.get(e)
    if (result) return result
    result = 'e' + this.last++
    this.addEntity(e, result)
    return result
  }
  columnSumInnerSelect(
    rootEntity: SqlDefs,
    col: FieldMetadata<Number>,
    query: FromAndWhere
  ) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build('sum(', col, ')')],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    })
  }
  columnCount(rootEntity: SqlDefs, query: FromAndWhere) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build('count(*)')],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    })
  }
  columnCountWithAs(rootEntity: SqlDefs, query: FromAndWhere, colName: string) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build('count(*) ', colName)],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    })
  }
  columnMaxWithAs(
    rootEntity: SqlDefs,
    column: FieldMetadata,
    query: FromAndWhere,
    colName: string
  ) {
    return this.columnDbName(rootEntity, {
      select: () => [this.build('max(', column, ') ', colName)],
      from: query.from,
      innerJoin: query.innerJoin,
      outerJoin: query.outerJoin,
      crossJoin: query.crossJoin,
      where: query.where
    })
  }
  async columnInnerSelect(rootEntity: SqlDefs, query: QueryBuilder) {
    this.addEntity(rootEntity, await rootEntity.metadata.getDbName())
    return '(' + (await await this.query(query)) + ' limit 1)'
  }
  async countInnerSelect(query: FromAndWhere, mappedColumn: any) {
    return this.build(
      '(',
      await this.query({
        select: () => [this.build('count(*)')],
        from: query.from,
        innerJoin: query.innerJoin,
        outerJoin: query.outerJoin,
        crossJoin: query.crossJoin,
        where: query.where
      }),
      ') ',
      mappedColumn
    )
  }
  async countDistinctInnerSelect(
    col: FieldMetadata,
    query: FromAndWhere,
    mappedColumn: any
  ) {
    return this.build(
      '(',
      await this.query({
        select: () => [this.build('count(distinct ', col, ')')],
        from: query.from,
        innerJoin: query.innerJoin,
        outerJoin: query.outerJoin,
        crossJoin: query.crossJoin,
        where: query.where
      }),
      ') ',
      mappedColumn
    )
  }

  countDistinct(col: FieldMetadata, mappedColumn: FieldMetadata<number>) {
    return this.build('count (distinct ', col, ') ', mappedColumn)
  }
  count() {
    return this.func('count', '*')
  }
  async minInnerSelect(
    col: FieldMetadata,
    query: FromAndWhere,
    mappedColumn: FieldMetadata
  ) {
    return this.build(
      '(',
      await this.query({
        select: () => [this.build('min(', col, ')')],
        from: query.from,
        innerJoin: query.innerJoin,
        outerJoin: query.outerJoin,
        crossJoin: query.crossJoin,
        where: query.where
      }),
      ') ',
      mappedColumn
    )
  }
  async maxInnerSelect(
    col: FieldMetadata,
    query: FromAndWhere,
    mappedColumn: FieldMetadata
  ) {
    return this.build(
      '(',
      await this.query({
        select: () => [this.build('max(', col, ')')],
        from: query.from,
        innerJoin: query.innerJoin,
        outerJoin: query.outerJoin,
        crossJoin: query.crossJoin,
        where: query.where
      }),
      ') ',
      mappedColumn
    )
  }
  async columnDbName(rootEntity: SqlDefs, query: QueryBuilder) {
    this.addEntity(rootEntity, await rootEntity.metadata.getDbName())
    return '(' + (await this.query(query)) + ')'
  }
  async entityDbName(query: QueryBuilder) {
    return '(' + (await this.query(query)) + ') result'
  }
  async entityDbNameUnionAll(query1: QueryBuilder, query2: QueryBuilder) {
    return (await this.unionAll(query1, query2)) + ' result'
  }
  async union(query1: QueryBuilder, query2: QueryBuilder) {
    return (
      '(' +
      (await this.query(query1)) +
      ' union ' +
      (await this.query(query2)) +
      ')'
    )
  }
  async unionAll(query1: QueryBuilder, query2: QueryBuilder) {
    return (
      '(' +
      (await this.query(query1)) +
      ' union  all ' +
      (await this.query(query2)) +
      ')'
    )
  }

  in(col: FieldMetadata, ...values: any[]) {
    return this.build(col, ' in (', values, ')')
  }
  not(arg0: any): any {
    return this.build(' not (', arg0, ')')
  }
  delete(e: SqlDefs, ...where: any[]) {
    return this.build('delete from ', e, ' where ', this.and(...where))
  }
  async update(e: SqlDefs, info: UpdateInfo) {
    let result = []
    result.push('update ', e, ' ', this.getEntityAlias(e), ' set ')

    let from: string
    if (info.from) {
      from = await this.build(
        ' from ',
        info.from,
        ' ',
        this.getEntityAlias(info.from)
      )
    }
    let set = info.set()
    result.push(
      set.map((a) => this.build(this.build(a[0].getDbName(), ' = ', a[1])))
    )
    if (from) result.push(from)

    if (info.where) {
      result.push(' where ')
      result.push(this.and(...info.where()))
    }
    return this.build(...result)
  }
  async insert(info: InsertInfo) {
    let result = []
    result.push('insert into ', info.into, ' ')

    result.push(
      '(',
      info.set().map((a) => a[0]),
      ') '
    )
    result.push(
      await this.query({
        select: () => info.set().map((a) => a[1]),
        from: info.from,
        where: info.where
      })
    )

    return this.build(...result)
  }
  constructor() {
    if (remult && !remult.context.getSite) InitContext(remult)
  }
  async query(query: QueryBuilder) {
    let from = []
    from.push(' from ')
    from.push(query.from, ' ', this.getEntityAlias(query.from))
    if (query.crossJoin) {
      query.crossJoin().forEach((j) => {
        from.push(' cross join ', j, ' ', this.getEntityAlias(j))
      })
    }
    if (query.innerJoin) {
      for (const j of await query.innerJoin()) {
        let alias = this.getEntityAlias(j.to)
        from.push(
          ' left join ',
          j.to,
          ' ',
          alias,
          ' on ',
          this.and(...(await j.on()))
        )
      }
    }
    if (query.outerJoin) {
      for (const j of await query.outerJoin()) {
        let alias = this.getEntityAlias(j.to)
        from.push(
          ' left outer join ',
          j.to,
          ' ',
          alias,
          ' on ',
          this.and(...(await j.on()))
        )
      }
    }
    let result = []
    result.push('select ')
    result.push(
      await Promise.all((await query.select()).map(async (x) => await x))
    )
    result.push(...from)
    let where = []
    if (query.where) {
      where.push(...(await query.where()))
    }
    if (query.from.metadata.options.backendPrefilter) {
      where.push(
        await Filter.translateCustomWhere(
          await Filter.fromEntityFilter(
            query.from.metadata,
            query.from.metadata.options.backendPrefilter
          ),
          query.from.metadata,
          remult
        )
      )
    }
    if (where.length > 0) {
      const w = await this.and(...where)
      if (w) result.push(' where ', w)
    }
    if (query.groupBy) {
      result.push(' group by ')
      result.push(query.groupBy())
    }
    if (query.having) {
      result.push(' having ', this.and(...query.having()))
    }
    if (query.orderBy) {
      result.push(
        ' order by ',
        query.orderBy.map(async (x) => {
          var f = x as SortSegment
          if (f && f.field) {
            return await this.build(f.field, ' ', f.isDescending ? 'desc' : '')
          } else return x
        })
      )
    }
    return this.build(...result)
  }
  case(args: CaseWhenItemHelper[], else_: any) {
    if (args.length == 0) return else_
    let result = []
    result.push('case')
    args.forEach((x) => {
      result.push(' when ')
      result.push(this.and(...x.when))
      result.push(' then ')
      result.push(x.then)
    })
    result.push(' else ')
    result.push(else_)
    result.push(' end')
    return this.build(...result)
  }

  async innerSelect(builder: QueryBuilder, col: FieldMetadata) {
    return this.build('(', await this.query(builder), ' limit 1) ', col)
  }
}

export class myDummySQLCommand implements SqlCommand {
  execute(sql: string): Promise<SqlResult> {
    throw new Error('Method not implemented.')
  }
  addParameterAndReturnSqlToken(val: any): string {
    return this.param(val)
  }
  param(val: any): string {
    if (val === null) return 'null'
    if (val instanceof Date) val = val.toISOString()
    if (typeof val == 'string') {
      return new SqlBuilder().str(val)
    }
    return val.toString()
  }
}

export type SqlDefs<T = unknown> = FieldsMetadata<T> & {
  metadata: EntityMetadata
  where: (item: EntityFilter<T>) => Filter
}
export function SqlFor<T>(repo: Repository<T> | EntityMetadata<T>): SqlDefs<T> {
  let origDefs: EntityMetadata
  let re = repo as Repository<T>
  if (re && re.metadata) origDefs = re.metadata
  else origDefs = repo as EntityMetadata

  let r = {
    metadata: Object.assign(origDefs),
    where: (item) => Filter.fromEntityFilter(origDefs, item),
    [Symbol.iterator]: () => origDefs.fields[Symbol.iterator](),
    find: origDefs.fields.find
  }
  for (const col of origDefs.fields) {
    r[col.key] = new fieldInSql(col)
  }

  return r as SqlDefs<T>
}
class fieldInSql {
  constructor(public metadata: FieldMetadata) {}
  getDbName() {
    return this.metadata.getDbName()
  }

  key = this.metadata.key
  target = this.metadata.target
  valueType = this.metadata.valueType
  caption = this.metadata.caption
  inputType = this.metadata.inputType
  allowNull = this.metadata.allowNull
  isServerExpression = this.metadata.isServerExpression
  get dbReadOnly() {
    return this.metadata.dbReadOnly
  }

  valueConverter = this.metadata.valueConverter
  options = this.metadata.options
}

export interface QueryBuilder {
  select: () => any[] | Promise<any[]>
  from: SqlDefs
  crossJoin?: () => SqlDefs[]
  innerJoin?: () => JoinInfo[] | Promise<JoinInfo[]>
  outerJoin?: () => JoinInfo[] | Promise<JoinInfo[]>
  where?: () => any[] | Promise<any[]>
  orderBy?: (FieldMetadata | SortSegment)[]
  groupBy?: () => any[]
  having?: () => any[]
}
export interface FromAndWhere {
  from: SqlDefs
  crossJoin?: () => SqlDefs[]
  innerJoin?: () => JoinInfo[]
  outerJoin?: () => JoinInfo[]
  where?: () => any[]
}
export interface UpdateInfo {
  set: () => [FieldMetadata, any][]
  where?: () => any[]
  from?: SqlDefs
}
export interface InsertInfo {
  into: SqlDefs
  set: () => [FieldMetadata, any][]
  from: SqlDefs
  where?: () => any[]
}
export interface JoinInfo {
  to: SqlDefs
  on: () => any[] | Promise<any[]>
}

export interface CaseWhenItemHelper {
  when: any[]
  then: any
}

export async function getValueFromResult(r: any, col: FieldMetadata) {
  let result = r[(await col.getDbName()).toLowerCase()]
  if (result === undefined) console.error("couldn't find " + col.key, r)
  return result
}

export class FilterConsumerBridgeToSqlRequest implements FilterConsumer {
  private where = ''
  _addWhere = true
  promises: Promise<void>[] = []
  async resolveWhere() {
    while (this.promises.length > 0) {
      let p = this.promises
      this.promises = []
      for (const pr of p) {
        await pr
      }
    }
    return this.where
  }

  constructor(private r: SqlCommand) {}

  custom(key: string, customItem: any): void {
    throw new Error('Custom filter should be translated before it gets here')
  }
  not(element: Filter) {
    this.promises.push(
      (async () => {
        let f = new FilterConsumerBridgeToSqlRequest(this.r)
        f._addWhere = false
        element.__applyToConsumer(f)
        let where = await f.resolveWhere()
        if (!where) return //since if any member of or is empty, then the entire or is irrelevant

        this.addToWhere('not (' + where + ')')
      })()
    )
  }

  or(orElements: Filter[]) {
    let statement = ''
    this.promises.push(
      (async () => {
        for (const element of orElements) {
          let f = new FilterConsumerBridgeToSqlRequest(this.r)
          f._addWhere = false
          element.__applyToConsumer(f)
          let where = await f.resolveWhere()
          if (where.length > 0) {
            if (statement.length > 0) {
              statement += ' or '
            }
            if (orElements.length > 1) {
              statement += '(' + where + ')'
            } else statement += where
          }
        }
        this.addToWhere('(' + statement + ')')
      })()
    )
  }
  isNull(col: FieldMetadata): void {
    this.promises.push(
      (async () => this.addToWhere((await col.getDbName()) + ' is null'))()
    )
  }
  isNotNull(col: FieldMetadata): void {
    this.promises.push(
      (async () => this.addToWhere((await col.getDbName()) + ' is not null'))()
    )
  }
  isIn(col: FieldMetadata, val: any[]): void {
    this.promises.push(
      (async () => {
        if (val && val.length > 0)
          this.addToWhere(
            (await col.getDbName()) +
              ' in (' +
              val
                .map((x) =>
                  this.r.addParameterAndReturnSqlToken(
                    col.valueConverter.toDb(x)
                  )
                )
                .join(',') +
              ')'
          )
        else this.addToWhere('1 = 0 /*isIn with no values*/')
      })()
    )
  }
  isEqualTo(col: FieldMetadata, val: any): void {
    this.add(col, val, '=')
  }
  isDifferentFrom(col: FieldMetadata, val: any): void {
    this.add(col, val, '<>')
  }
  isGreaterOrEqualTo(col: FieldMetadata, val: any): void {
    this.add(col, val, '>=')
  }
  isGreaterThan(col: FieldMetadata, val: any): void {
    this.add(col, val, '>')
  }
  isLessOrEqualTo(col: FieldMetadata, val: any): void {
    this.add(col, val, '<=')
  }
  isLessThan(col: FieldMetadata, val: any): void {
    this.add(col, val, '<')
  }
  public startsWithCaseInsensitive(col: FieldMetadata, val: any): void {
    this.promises.push(
      (async () => {
        this.addToWhere(
          'lower (' +
            (await col.getDbName()) +
            ") like lower ('" +
            val.replace(/'/g, "''") +
            "%')"
        )
      })()
    )
  }
  public endsWithCaseInsensitive(col: FieldMetadata, val: any): void {
    this.promises.push(
      (async () => {
        this.addToWhere(
          'lower (' +
            (await col.getDbName()) +
            ") like lower ('%" +
            val.replace(/'/g, "''") +
            "')"
        )
      })()
    )
  }
  public containsCaseInsensitive(col: FieldMetadata, val: any): void {
    this.promises.push(
      (async () => {
        this.addToWhere(
          'lower (' +
            (await col.getDbName()) +
            ") like lower ('%" +
            val.replace(/'/g, "''") +
            "%')"
        )
      })()
    )
  }
  public notContainsCaseInsensitive(col: FieldMetadata, val: any): void {
    this.promises.push(
      (async () => {
        this.addToWhere(
          'not lower (' +
            (await col.getDbName()) +
            ") like lower ('%" +
            val.replace(/'/g, "''") +
            "%')"
        )
      })()
    )
  }

  private add(col: FieldMetadata, val: any, operator: string) {
    this.promises.push(
      (async () => {
        let x =
          (await col.getDbName()) +
          ' ' +
          operator +
          ' ' +
          this.r.addParameterAndReturnSqlToken(col.valueConverter.toDb(val))
        this.addToWhere(x)
      })()
    )
  }

  private addToWhere(x: string) {
    if (this.where.length == 0) {
      if (this._addWhere) this.where += ' where '
    } else this.where += ' and '
    this.where += x
  }
  databaseCustom(databaseCustom: {
    buildSql: CustomSqlFilterBuilderFunction
  }): void {
    this.promises.push(
      (async () => {
        if (databaseCustom?.buildSql) {
          let item = new CustomSqlFilterBuilder(this.r, (x) => x)
          await databaseCustom.buildSql(item)
          if (item.sql) {
            this.addToWhere('(' + item.sql + ')')
          }
        }
      })()
    )
  }
}
export function getDb() {
  return remult.dataProvider as SqlDatabase
}
