import {
  Entity,
  SortSegment,
  SqlCommand,
  SqlResult,
  Remult,
  ValueConverter,
  FieldRef,
  FieldOptions,
  EntityRef,
  EntityRefForEntityBase
} from 'remult'
import {
  TranslationOptions,
  use,
  Field,
  FieldType,
  TranslatedCaption,
  Fields
} from '../translate'

import { Sites, getLang } from '../sites/sites'
import { EmailSvc, isDesktop } from '../shared/utils'
import { isDate } from 'util'
import { DataControl } from '../common-ui-elements/interfaces'

import { SqlBuilder } from './SqlBuilder'

@FieldType<Email>({
  valueConverter: {
    toJson: (x) => (x ? x.address : ''),
    fromJson: (x) => (x ? new Email(x) : null),
    displayValue: (x) => x.address
  },
  translation: (l) => l.email
})
@DataControl<any, Email>({
  click: (x, col) => window.open('mailto:' + col.displayValue),
  allowClick: (x, col) => !!col.displayValue,
  clickIcon: 'email',
  inputType: 'email',
  width: '250'
})
export class Email {
  async Send(subject: string, message: string) {
    await EmailSvc.sendMail(subject, message, this.address)
  }
  constructor(public readonly address: string) {}
}

export function DateTimeColumn<entityType = unknown>(
  settings?: FieldOptions<entityType, Date> & TranslatedCaption,
  ...options: (
    | FieldOptions<entityType, Date>
    | ((options: FieldOptions<entityType, Date>) => void)
  )[]
) {
  return Fields.date<entityType>(
    {
      ...{ displayValue: (e, x) => (x ? x.toLocaleString('he-il') : '') },
      ...settings
    },
    ...options
  )
}
export function ChangeDateColumn<entityType = unknown>(
  settings?: FieldOptions<entityType, Date> & TranslatedCaption,
  ...options: (
    | FieldOptions<entityType, Date>
    | ((options: FieldOptions<entityType, Date>) => void)
  )[]
) {
  return (a, b) => {
    DataControl({ readonly: true })(a, b)
    return DateTimeColumn<entityType>(
      {
        ...{ allowApiUpdate: false },
        ...settings
      },
      ...options
    )(a, b)
  }
}

export class myThrottle {
  constructor(private ms: number) {}
  lastRun: number = 0

  runNext: () => void

  do(what: () => void) {
    let current = new Date().valueOf()
    if (this.lastRun + this.ms < current) {
      this.lastRun = current
      what()
    } else {
      if (!this.runNext) {
        this.runNext = what
        setTimeout(() => {
          let x = this.runNext
          this.runNext = undefined
          this.lastRun = new Date().valueOf()
          x()
        }, this.lastRun + this.ms - current)
      } else this.runNext = what
    }
  }
}
export class delayWhileTyping {
  lastTimer: any
  constructor(private ms: number) {}

  do(what: () => void) {
    clearTimeout(this.lastTimer)
    this.lastTimer = setTimeout(() => {
      what()
    }, this.ms)
  }
}

class a {
  b: string
}

export function relativeDateName(args: {
  d?: Date
  dontShowTimeForOlderDates?: boolean
}) {
  let d = args.d
  if (!d) return ''

  return getRelativeTimeString(d, getLang().languageCodeHe)
}
function getRelativeTimeString(date, lang = 'he') {
  const timeMs = date.getTime()
  const deltaSeconds = Math.round((timeMs - Date.now()) / 1000)

  const cutoffs = [
    60,
    3600,
    86400,
    86400 * 7,
    86400 * 30,
    86400 * 365,
    Infinity
  ]
  const units: Intl.RelativeTimeFormatUnit[] = [
    'second',
    'minute',
    'hour',
    'day',
    'week',
    'month',
    'year'
  ]
  const unitIndex = cutoffs.findIndex(
    (cutoff) => cutoff > Math.abs(deltaSeconds)
  )
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1

  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex])
}

export function logChanges(
  e: EntityRefForEntityBase<unknown>,
  remult: Remult,
  args?: {
    excludeColumns?: FieldRef[]
    excludeValues?: FieldRef[]
  }
) {
  if (!args) {
    args = {}
  }
  if (!args.excludeColumns) args.excludeColumns = []
  if (!args.excludeValues) args.excludeValues = []

  let cols = ''
  let vals = ''
  for (const c of e.fields) {
    if (c.valueChanged()) {
      if (!args.excludeColumns.includes(c)) {
        cols += c.metadata.key + '|'
        if (!args.excludeValues.includes(c)) {
          vals += c.metadata.key + '=' + c.displayValue
          if (!e.isNew()) {
            vals +=
              ' was (' + c.metadata.valueConverter.toJson(c.originalValue) + ')'
          }
          vals += '|'
        }
      }
    }
  }

  if (cols) {
    var p = ''
    try {
      p = Sites.getOrganizationFromContext()
    } catch {}
    p += '/' + e.repository.metadata.key + '/' + e.getId()
    if (e.isNew()) {
      p += '(new)'
    }
    if (remult.user)
      p += ', user=' + remult.user.id + ' (' + remult.user.name + ')'
    p += ' :' + vals + '\t cols=' + cols
    console.log(p)
  }
}
