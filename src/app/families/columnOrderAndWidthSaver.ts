import {
  DataControlSettings,
  getFieldDefinition,
  GridSettings
} from '../common-ui-elements/interfaces'
import { sortColumns } from '../shared/utils'

const storageEntryName = 'grid-state'
export class columnOrderAndWidthSaver {
  suspend = false
  constructor(private grid: GridSettings) {}
  getStorage() {
    let state = localStorage.getItem(storageEntryName)
    if (state) {
      let st = JSON.parse(state)
      if (st) return st
    }
    return {}
  }
  load(key: string) {
    let items: storedColumn[] = this.getStorage()[key]
    if (items) {
      let cols = items
        .map((x) => {
          let r: DataControlSettings
          r = this.grid.columns.items.find((c) => c.caption == x.caption)
          if (!r)
            r = this.grid.columns.items.find(
              (c) => c.field && getFieldDefinition(c.field).key == x.key
            )
          if (x.width && r) r.width = x.width
          return r
        })
        .filter((x) => x !== undefined)
      if (cols.length > 0) sortColumns(this.grid, cols)
    }
    this.grid.columns.onColListChange(() => {
      if (this.suspend) return
      let x: storedColumn[] = []
      for (
        let index = 0;
        index <= this.grid.columns.numOfColumnsInGrid;
        index++
      ) {
        const element = this.grid.columns.items[index]
        if (element)
          x.push({
            caption: element.caption,
            key:
              element.storeColumnInfoKey ||
              getFieldDefinition(element.field)?.key,
            width: element.width
          })
      }
      let s = this.getStorage()
      s[key] = x
      localStorage.setItem(storageEntryName, JSON.stringify(s))
    })
  }
}
export interface storedColumn {
  key?: string
  caption?: string
  width: string
}
