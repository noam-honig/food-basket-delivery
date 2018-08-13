import * as uuid from 'uuid';
import * as radweb from 'radweb';
import { BoolColumn, DataProviderFactory, EntityOptions, Entity, Column } from "radweb";
import { DataColumnSettings } from 'radweb/utils/dataInterfaces1';
export class IdEntity<idType extends Id> extends radweb.Entity<string>
{
  id: idType;
  constructor(id: idType, factory: () => IdEntity<idType>, source: DataProviderFactory, options?: EntityOptions | string) {
    super(factory, source, options);
    this.id = id;
    this.onSavingRow = () => {
      if (this.isNew() && !this.id.value && !this.disableNewId)
        this.id.setToNewId();
    }
  }
  private disableNewId = false;
  setEmptyIdForNewRow() {
    this.id.value = '';
    this.disableNewId = true;
  }
}
  
  
export   class Id extends radweb.StringColumn {
    setToNewId() {
      this.value = uuid();
    }
  }
  
  export interface HasAsyncGetTheValue {
    getTheValue(): Promise<string>;
  }
  export class DateTimeColumn extends radweb.DateTimeColumn {
    constructor(settingsOrCaption?: DataColumnSettings<string, DateTimeColumn> | string) {
      super(settingsOrCaption);
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
        r = 'ב' + d.toLocaleDateString();
      }
      let t = d.getMinutes().toString();
      if (t.length == 1)
        t = '0' + t;
  
      return r += ' ב' + d.getHours() + ':' + t;
    }
  
  }
  export class changeDate extends DateTimeColumn {
    constructor(caption: string) {
      super({
        caption: caption,
        readonly: true
      });
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
function getItemSql(e: any) {
  let v = e;
  if (e instanceof Entity)
    v = e.__getDbName();
  if (e instanceof Column)
    v = e.__getDbName();
  if (e instanceof Array) {
    v = e.map(x => getItemSql(x)).join(', ');
  }
  return v;
}
export function buildSql(...args: any[]): string {
  let result = '';
  args.forEach(e => {

    result += getItemSql(e);
  });
  return result;
}