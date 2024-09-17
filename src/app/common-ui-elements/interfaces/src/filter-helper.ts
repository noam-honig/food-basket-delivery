import {
  FieldRef,
  EntityFilter,
  FindOptions,
  Repository,
  getEntityRef
} from 'remult'
import { FieldMetadata } from 'remult'

import { getEntitySettings } from 'remult/internals'
import { getFieldDefinition } from './data-control-interfaces'

export class FilterHelper<rowType> {
  filterRow!: rowType
  filterColumns: FieldMetadata[] = []
  forceEqual: FieldMetadata[] = []
  constructor(
    private reloadData: () => void,
    private repository: Repository<rowType>
  ) {}
  isFiltered(columnInput: FieldMetadata | FieldRef) {
    return this.filterColumns.indexOf(getFieldDefinition(columnInput)!) >= 0
  }
  filterColumn(
    columnInput: FieldMetadata | FieldRef,
    clearFilter: boolean,
    useContainsFilter: boolean
  ) {
    let column = getFieldDefinition(columnInput)
    if (!column) return
    if (clearFilter) {
      this.filterColumns.splice(this.filterColumns.indexOf(column, 1), 1)
      this.forceEqual.splice(this.forceEqual.indexOf(column, 1), 1)
    } else if (this.filterColumns.indexOf(column) < 0) {
      this.filterColumns.push(column)
      if (useContainsFilter === false) this.forceEqual.push(column)
    }
    this.reloadData()
  }
  addToFindOptions(opt: FindOptions<rowType>) {
    this.filterColumns.forEach((c) => {
      //@ts-ignore
      let val = this.filterRow[c.key]
      let f: any = val
      if (
        c.valueType != Number &&
        c.valueType != Date &&
        c.valueType != Boolean &&
        getEntitySettings(c.valueType, false) == undefined &&
        !this.forceEqual.find((x) => c.key == x.key)
      )
        f = {
          $contains: getEntityRef(this.filterRow).fields.find(c.key).inputValue
        }
      else if (c.valueType == Date) {
        if (val) {
          let v = <Date>val
          v = new Date(v.getFullYear(), v.getMonth(), v.getDate())

          f = {
            $gte: v,
            $lt: new Date(v.getFullYear(), v.getMonth(), v.getDate() + 1)
          }
        }
      }
      let w = { [c.key]: f } as EntityFilter<any>
      if (opt.where) {
        let x = opt.where
        opt.where = { $and: [x, w] } as EntityFilter<any>
      } else opt.where = w
    })
  }
}
