import { EntityFilter, FindOptions, Repository } from 'remult/src/remult3'

export class DataList<T> implements Iterable<T> {
  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]()
  }

  items: T[] = []
  constructor(private repository: Repository<T>) {
    repository.addEventListener({
      deleted: (entity) => {
        this.removeItem(entity)
      }
    })
  }
  removeItem(item: T) {
    let i = this.items.indexOf(item)
    if (i >= 0) this.items.splice(i, 1)
  }

  count(where?: EntityFilter<T>) {
    return this.repository.count(where)
  }
  get(options: FindOptions<T>, andDo: (rows: T[]) => void) {
    const result = this.repository.liveQuery(options).subscribe((args) => {
      let r = args.items
      this.items = r
      andDo(r)
      return r
    })
    return () => {
      result()
    }
  }
  add(): T {
    let x = this.repository.create()
    this.items.push(x)
    return x
  }
}
