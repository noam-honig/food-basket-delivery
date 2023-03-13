import { EntityFilter, FindOptions, getEntityRef, Repository } from 'remult'

export class DataList<T> implements Iterable<T> {
  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]()
  }

  items: T[] = []
  constructor(private repository: Repository<T>,private listRefreshed?:VoidFunction) {}
  removeItem(item: T) {
    let i = this.items.indexOf(item)
    if (i >= 0) this.items.splice(i, 1)
  }

  count(where?: EntityFilter<T>) {
    return this.repository.count(where)
  }
  get(options: FindOptions<T>, andDo: (rows: T[]) => void) {
    const result = this.repository.liveQuery(options).subscribe((args) => {
      this.items = args.applyChanges(this.items)
      andDo(this.items)
      return this.items
    })
    const unSub2 = this.repository.addEventListener({
      deleted: (entity) => {
        this.removeItem(entity)
      },
      saved: (entity, isNew) => {
        const ref = getEntityRef(entity)
        if (
          isNew &&
          this.items.filter(
            (x) => this.repository.getEntityRef(x).getId() == ref.getId()
          ).length > 1
        ) {
          this.items.splice(
            this.items.findIndex(
              (x) => this.repository.getEntityRef(x).getId() === ref.getId()
            ),
            1
          )
          this.listRefreshed&&this.listRefreshed()
        }
      }
    })
    return () => {
      unSub2()
      result()
    }
  }
  add(): T {
    let x = this.repository.create()
    this.items.push(x)
    return x
  }
  async save(x: T): Promise<T> {
    const ref = this.repository.getEntityRef(x)
    const isNew = ref.isNew()
    let r = await ref.save()

    return r
  }
}
