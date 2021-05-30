
import { DataControlSettings, getColumnDefinition, GridSettings } from '../../../../radweb/projects/angular';
import { sortColumns } from '../shared/utils';

const storageEntryName = 'grid-state';
export class columnOrderAndWidthSaver {
    suspend = false;
    constructor(private grid: GridSettings<any>) {
    }
    getStorage() {
        let state = localStorage.getItem(storageEntryName);
        if (state) {
            let st = JSON.parse(state);
            if (st)
                return st;
        }
        return {};
    }
    load(key: string) {
        let items: storedColumn[] = this.getStorage()[key];
        if (items) {
            let cols = items.map(x => {
                let r: DataControlSettings;
                if (x.key) {
                    r = this.grid.columns.items.find(c => c.column && getColumnDefinition( c.column).key == x.key);
                } else {
                    r = this.grid.columns.items.find(c => !c.column && c.caption == x.caption);
                }
                if (x.width)
                    r.width = x.width;
                return r;
            }).filter(x => x !== undefined);
            sortColumns(this.grid, cols);
        }
        this.grid.columns.onColListChange(() => {
            if (this.suspend)
                return;
            let x: storedColumn[] = [];
            for (let index = 0; index < this.grid.columns.numOfColumnsInGrid; index++) {
                const element = this.grid.columns.items[index];
                if (element)
                    if (element.column) {
                        x.push({ key: getColumnDefinition( element.column).key, width: element.width });
                    }
                    else
                        x.push({ caption: element.caption, width: element.width });
            }
            let s = this.getStorage();
            s[key] = x;
            localStorage.setItem(storageEntryName, JSON.stringify(s));
        });
    }
}
export interface storedColumn {
    key?: string;
    caption?: string;
    width: string;
}
