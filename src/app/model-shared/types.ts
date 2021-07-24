
import { Entity, Filter, SortSegment, SqlCommand, SqlResult, AndFilter, Context, ValueConverter, FieldRef, FieldOptions, FieldMetadata, EntityMetadata, EntityRef, Repository, FieldsMetadata, FilterFactories, FilterFactory, ComparisonFilterFactory, ContainsFilterFactory } from 'remult';
import { TranslationOptions, use, Field, FieldType, TranslatedCaption } from '../translate';
import * as moment from 'moment';
import { Sites, getLang } from '../sites/sites';
import { EmailSvc, isDesktop } from '../shared/utils';
import { isDate } from 'util';
import { DataControl } from '@remult/angular';
import { filterHelper } from 'remult/src/filter/filter-interfaces';
import { InputTypes } from 'remult/inputTypes';
import { SqlBuilder } from './SqlBuilder';







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

export function DateTimeColumn<entityType = any>(settings?: FieldOptions<entityType, Date> & TranslatedCaption) {
  return Field<entityType, Date>({
    ...{ displayValue: (e, x) => x ? x.toLocaleString("he-il") : '' },
    ...settings
  })
}
export function ChangeDateColumn<entityType = any>(settings?: FieldOptions<entityType, Date> & TranslatedCaption) {
  return DateTimeColumn<entityType>({
    ...{ allowApiUpdate: false },
    ...settings
  })
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


export function relativeDateName(context: Context, args: { d?: Date, dontShowTimeForOlderDates?: boolean }) {
  let d = args.d;
  if (!d)
    return '';
  return moment(d).locale(getLang(context).languageCodeHe).fromNow();

}

export function logChanges(e: EntityRef<any>, context: Context, args?: {
  excludeColumns?: FieldRef<any, any>[],
  excludeValues?: FieldRef<any, any>[]
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
        cols += c.metadata.key + "|";
        if (!args.excludeValues.includes(c)) {
          vals += c.metadata.key + "=" + c.displayValue;
          if (!e.isNew()) {

            vals += " was (" + c.metadata.valueConverter.toJson(c.originalValue) + ")";
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
    p += "/" + e.repository.metadata.key + "/" + e.getId();
    if (e.isNew()) {
      p += "(new)";
    }
    if (context.user)
      p += ", user=" + context.user.id + " (" + context.user.name + ")";
    p += " :" + vals + "\t cols=" + cols;
    console.log(p)
  }

}
