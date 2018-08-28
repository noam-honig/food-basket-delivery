import { Entity, IDataSettings, GridSettings, Column, NumberColumn, DataList } from "radweb";
import { EntitySourceFindOptions, FilterBase, FindOptionsPerEntity } from "radweb/utils/dataInterfaces1";
import { foreachSync } from "./utils";
import { evilStatics } from "../auth/evil-statics";
import { myAuthInfo } from "../auth/my-auth-info";
import { Injectable } from "@angular/core";

@Injectable()
export class Context {
    
    protected _getInfo = () => evilStatics.auth.info;
    protected _dataSource = evilStatics.dataSource;
    constructor() {
        
    }

    get info(): myAuthInfo {
        return this._getInfo();
    }
    private _context: Context;
    setContext(c: Context) {
        this._context = c;
    }
    public for<lookupIdType, T extends Entity<lookupIdType>>(c: { new(...args: any[]): T; }) {
        let e = new c(this._context);
        e.setSource(this._dataSource);
        return new SpecificEntityHelper<lookupIdType,T>(e, this._lookupCache);
    }
    private _lookupCache = new stamEntity();
}

class stamEntity extends Entity<number> {

    id = new NumberColumn();
    constructor() {
        super(() => new stamEntity(), evilStatics.dataSource, "stamEntity");
        this.initColumns();
    }
}
export class SpecificEntityHelper<lookupIdType, T extends Entity<lookupIdType>> {
    constructor(private entity: T, private _lookupCache: Entity<any>) {

    }
    lookupAsync(filter: Column<lookupIdType> | ((entityType: T) => FilterBase)): Promise<T> {
        return this._lookupCache.lookupAsync(this.entity, filter);
    }
    lookup(filter: Column<lookupIdType> | ((entityType: T) => FilterBase)): T {
        return this._lookupCache.lookup(this.entity, filter);
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