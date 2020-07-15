import { DataControlInfo, DataControlSettings, Column } from "@remult/core";

export async function foreachSync<T>(array: T[], action: (item: T) => Promise<void>) {
  for (let i = 0; i < array.length; i++) {
    await action(array[i]);
  }
}

export function sortColumns(list: any, columns: DataControlInfo<any>[]) {
  if (list.origList && list.origList.length > 0)
    list.resetColumns();
  list.columns.items.sort((a, b) => a.caption > b.caption ? 1 : a.caption < b.caption ? -1 : 0);
  list.columns.numOfColumnsInGrid = columns.length;
  for (let index = 0; index < columns.length; index++) {
    const origItem = columns[index];
    let item: DataControlSettings<any>;
    if (origItem instanceof Column) {
      item = list.columns.items.find(x => x.column == origItem);
    }
    else item = origItem;
    let origIndex = list.columns.items.indexOf(item);
    list.columns.moveCol(item, -origIndex + index);
  }


}

