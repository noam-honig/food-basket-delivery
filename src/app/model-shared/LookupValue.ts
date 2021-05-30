import { Repository } from '@remult/core';


export class LookupValue<T> {
  constructor(protected id: any, private repo: Repository<T>) { }
  get item() { return this.repo.lookupId(this.id); };
  async waitLoad() {
    return this.repo.lookupIdAsync(this.id);
  }
  exists() {
    return !this.repo.getRowHelper(this.item).isNew();
  }

}
