import { Entity } from "radweb";
import { FilterBase, EntitySourceFindOptions } from "radweb";

export async function foreachSync<T>(array: T[], action: (item: T) => Promise<void>) {
  for (let i = 0; i < array.length; i++) {
    await action(array[i]);
  }
}
export async function foreachEntityItem<T extends Entity<any>>(entity: T, where: (entity: T) => FilterBase, what?: (entity: T) => Promise<void>) {
  let options: EntitySourceFindOptions = {};
  if (where) {
    options.where = where(entity);
  }
  let items = await entity.source.find(options);
  return foreachSync(items, async item => await what(item));
}