import { Entity, IDataSettings, GridSettings, Column, NumberColumn, DataList } from "radweb";
import { EntitySourceFindOptions, FilterBase, FindOptionsPerEntity } from "radweb/utils/dataInterfaces1";
import { foreachSync } from "./utils";
import { evilStatics } from "../auth/evil-statics";
import { myAuthInfo } from "../auth/my-auth-info";
import { Injectable } from "@angular/core";

export class EntityProvider {
    constructor() {

    }
    private get<T>(c: { new(): T; }): T {
        return new c();
    }
    private _context: Context;
    setContext(c: Context) {
        this._context = c;
    }
    public for<T extends Entity<any>>(c: { new(...args: any[]): T; }) {
        return new SpecificEntityHelper<T>(new c(this._context));
    }
    private _lookupCache = new stamEntity();
    lookupAsync<lookupIdType, T extends Entity<lookupIdType>>(lookupEntity: { new(...args: any[]): T; }, filter: Column<lookupIdType> | ((entityType: T) => FilterBase)): Promise<T> {
        return this._lookupCache.lookupAsync(new lookupEntity(this._context), filter);
    }
    lookup<lookupIdType, T extends Entity<lookupIdType>>(lookupEntity: { new(...args: any[]): T; }, filter: Column<lookupIdType> | ((entityType: T) => FilterBase)): T {
        return this._lookupCache.lookup(new lookupEntity(this._context), filter);
    }

}
@Injectable()
export class Context {
    entityProvider = new EntityProvider();
    protected _getInfo = () => evilStatics.auth.info;
    constructor() {
        this.entityProvider.setContext(this);
    }

    get info(): myAuthInfo {
        return this._getInfo();
    }
}

class stamEntity extends Entity<number> {

    id = new NumberColumn();
    constructor() {
        super(() => new stamEntity(), evilStatics.dataSource, "stamEntity");
        this.initColumns();
    }
}
export class SpecificEntityHelper<T extends Entity<any>> {
    constructor(private entity: T) {

    }

    async foreach(where: (entity: T) => FilterBase, what?: (entity: T) => Promise<void>) {

        let options: EntitySourceFindOptions = {};
        if (where) {
            options.where = where(this.entity);
        }
        let items = await this.entity.source.find(options);
        return foreachSync(items, async item => await what(item));
    }
    async find(options?: FindOptionsPerEntity<T>) {
        let dl = new DataList(this.entity);
        return await dl.get(options);
    }
    async findFirst(where: (entity: T) => FilterBase) {
        let r = await this.entity.source.find({ where: where(this.entity) });
        if (r.length == 0)
            return undefined;
        return r[0];
    }
    create() {
        return this.entity.source.createNewItem();
    }
    gridSettings(settings?: IDataSettings<T>) {
        return new GridSettings(this.entity, settings);
    }
}