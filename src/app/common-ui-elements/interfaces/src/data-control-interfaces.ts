import {
  FieldRef,
  FieldMetadata,
  Entity,
  ValueListItem,
  Remult,
  ValueListInfo
} from 'remult'

import { InputField } from './column-collection'

export type DataControlInfo<rowType = unknown> =
  | DataControlSettings<rowType>
  | FieldRef
export interface DataControlSettings<
  entityType = unknown,
  valueType = unknown
> {
  field?: FieldMetadata | FieldRef
  getValue?: (row: entityType, val: FieldRef<entityType, valueType>) => any
  readonly?: ValueOrEntityExpression<boolean, entityType>
  cssClass?: string | ((row: entityType) => string)

  caption?: string
  visible?: (row: entityType, val: FieldRef<entityType, valueType>) => boolean

  click?: (row: entityType, val: FieldRef<entityType, valueType>) => void
  valueChange?: (row: entityType, val: FieldRef<entityType, valueType>) => void
  allowClick?: (
    row: entityType,
    val: FieldRef<entityType, valueType>
  ) => boolean
  clickIcon?: string

  valueList?:
    | ValueListItem[]
    | string[]
    | any[]
    | Promise<ValueListItem[]>
    | ((remult: Remult) => Promise<ValueListItem[]>)
    | ((remult: Remult) => ValueListItem[])
  inputType?: string //used: password,date,tel,text,checkbox,number
  hideDataOnInput?: boolean //consider also setting the width of the data on input - for datas with long input
  useContainsFilter?: boolean
  storeColumnInfoKey?: string
  width?: string
  customComponent?: {
    component: any
    args?: any
  }
}

export interface CustomDataComponent<argsType = unknown> {
  args: CustomComponentArgs<argsType>
}
export declare type CustomComponentArgs<argsType = unknown> = {
  fieldRef: FieldRef
  settings: DataControlSettings
  args?: argsType
}

export const configDataControlField = Symbol('configDataControlField')

export function getFieldDefinition(col: FieldMetadata | FieldRef) {
  if (!col) return undefined
  let r = col as FieldMetadata
  let c = col as FieldRef
  if (c.metadata) r = c.metadata
  return r
}
export function decorateDataSettings(
  colInput: FieldMetadata | FieldRef,
  x: DataControlSettings
) {
  if (colInput instanceof InputField) {
    //@ts-ignore
    for (const key in colInput.dataControl) {
      if (Object.prototype.hasOwnProperty.call(colInput.dataControl, key)) {
        //@ts-ignore
        const element = colInput.dataControl[key]
        //@ts-ignore
        if (x[key] === undefined)
          //@ts-ignore
          x[key] = element
      }
    }
  }

  let col = getFieldDefinition(colInput)!
  if (col.target) {
    let settingsOnColumnLevel = Reflect.getMetadata(
      configDataControlField,
      col.target,
      col.key
    )
    if (settingsOnColumnLevel) {
      for (const key in settingsOnColumnLevel) {
        if (Object.prototype.hasOwnProperty.call(settingsOnColumnLevel, key)) {
          const element = settingsOnColumnLevel[key]
          //@ts-ignore
          if (x[key] === undefined)
            //@ts-ignore
            x[key] = element
        }
      }
    }
  }
  if (col.valueType) {
    let settingsOnColumnLevel = Reflect.getMetadata(
      configDataControlField,
      col.valueType
    )
    if (settingsOnColumnLevel) {
      for (const key in settingsOnColumnLevel) {
        if (Object.prototype.hasOwnProperty.call(settingsOnColumnLevel, key)) {
          const element = settingsOnColumnLevel[key]
          //@ts-ignore
          if (x[key] === undefined)
            //@ts-ignore
            x[key] = element
        }
      }
    }
  }
  if (
    x.valueList === undefined &&
    col &&
    col.valueConverter instanceof ValueListInfo
  )
    x.valueList = col.valueConverter.getValues()

  if (!x.caption && col.caption) x.caption = col.caption

  if (!x.inputType && col.inputType) x.inputType = col.inputType

  if (x.readonly == undefined) {
    if (col.dbReadOnly) x.readonly = true

    if (typeof col.options?.allowApiUpdate === 'boolean')
      x.readonly = !col.options.allowApiUpdate
  }
}

export declare type ValueOrEntityExpression<valueType, entityType> =
  | valueType
  | ((e: entityType) => valueType)

export function DataControl<entityType = unknown, colType = unknown>(
  settings: DataControlSettings<entityType, colType>
) {
  return (target: any, key?: string) => {
    Reflect.defineMetadata(configDataControlField, settings, target, key!)
    if (key === undefined) return target
  }
}
