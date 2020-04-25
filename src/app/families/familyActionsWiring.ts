import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, IdEntity, SpecificEntityHelper, FilterBase, EntityWhere, packWhere } from "@remult/core";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { translate } from "../translate";
import { DialogService } from "../select-popup/dialog";
import { PromiseThrottle } from "../import-from-excel/import-from-excel.component";



export interface serverUpdateInfo {
    where: any;
    count: number;
}


export class ActionOnRows<T extends IdEntity> {
    constructor(protected context: Context,
        private entity: {
            new(...args: any[]): T;
        },
        public args: ActionOnRowsArgs<T>,
        public worker: {
            callServer: (info: serverUpdateInfo, action: string, columns: any[]) => Promise<string>,
            groupName: string,
            additionalWhere?: EntityWhere<T>
        }
    ) {
        if (!args.confirmQuestion)
            args.confirmQuestion = () => args.title;
    }

    async doWorkOnServer(info: serverUpdateInfo, args: any[]) {
        let i = 0;
        for (const c of this.args.columns()) {
            c.rawValue = args[i++];
        }
        let where = this.complementWhere((f: T) => unpackWhere(f, info.where));

        let count = await this.context.for(this.entity).count(where);
        if (count != info.count) {
            return "ארעה שגיאה אנא נסה שוב";
        }
        let updated = await pagedRowsIterator<T>(this.context.for(this.entity), where, this.args.whatToDoOnFamily, count);
        return "עודכנו " + updated + " " + this.worker.groupName;
    }
    complementWhere(where: EntityWhere<T>) {
        if (this.args.additionalWhere) {
            let originalWhere = where;
            where = f => new AndFilter(originalWhere(f), this.args.additionalWhere(f));
        }
        if (this.worker.additionalWhere) {
            let originalWhere = where;
            where = f => new AndFilter(originalWhere(f), this.worker.additionalWhere(f));
        }
        return where;
    }

    gridButton(component: actionDialogNeeds<T>) {
        return {
            name: this.args.title + ' ל' + this.worker.groupName,
            visible: () => this.context.isAllowed(this.args.allowed),
            click: async () => {
                await this.context.openDialog(InputAreaComponent, x => {
                    x.args = {
                        settings: {
                            columnSettings: () => this.args.dialogColumns ? this.args.dialogColumns(component) : this.args.columns()
                        },
                        title: this.args.title + ' ' + this.worker.groupName,
                        ok: async () => {
                            let where = this.complementWhere(component.where);
                            let count = await this.context.for(this.entity).count(where);
                            if (await component.dialog.YesNoPromise(this.args.confirmQuestion() + ' ל-' + count + ' ' + this.worker.groupName + '?')) {
                                let args = [];
                                for (const c of this.args.columns()) {
                                    args.push(c.rawValue);
                                }
                                component.dialog.Info(await this.worker.callServer({
                                    count,
                                    where: packWhere(this.context.for(this.entity).create(), where)
                                }, this.args.title, args));
                                component.afterAction();
                            }
                        }
                        , cancel: () => { }

                    }
                });

            }
        } as GridButton;
    }
}
export interface actionDialogNeeds<T extends IdEntity> {
    dialog: DialogService,
    afterAction: () => {},
    where: EntityWhere<T>
}

export interface ActionOnRowsArgs<T extends IdEntity> {
    dialogColumns?: (component: actionDialogNeeds<T>) => DataArealColumnSetting<any>[],
    whatToDoOnFamily: (f: T) => Promise<void>
    columns: () => Column<any>[],
    title: string,
    allowed: Allowed,
    confirmQuestion?: () => string,
    additionalWhere?: (f: T) => FilterBase
}


export async function filterActionOnServer(actions: {
    new(context: Context): ActionOnRows<any>;
}[], context: Context, info: serverUpdateInfo, action: string, args: any[]) {
    for (const a of actions) {
        let x = new a(context);
        if (x.args.title == action) {
            if (context.isAllowed(x.args.allowed)) {
                return await x.doWorkOnServer(info, args);
            }
            else {
                throw "פעולה לא מורשת";
            }
        }
    }
    throw "פעולה לא נמצאה בשרת";
}

export function buildGridButtonFromActions<T extends IdEntity>(actions: {
    new(context: Context): ActionOnRows<T>
}[], context: Context, component: actionDialogNeeds<T>) {
    let r = [];
    for (const a of actions) {
        r.push(new a(context).gridButton(component));
    }
    return r;
}

export async function pagedRowsIterator<T extends IdEntity>(context: SpecificEntityHelper<string, T>, where: (f: T) => FilterBase, what: (f: T) => void, count?: number) {
    let updated = 0;
    let pageSize = 200;
    if (count === undefined) {
        count = await context.count(where);
    }
    let pt = new PromiseThrottle(10);
    for (let index = (count / pageSize); index >= 0; index--) {
        let rows = await context.find({ where, limit: pageSize, page: index, orderBy: f => [f.id] });
        //console.log(rows.length);
        for (const f of await rows) {
            what(f);
            await pt.push(f.save());
            updated++;
        }
    }
    await pt.done();
    return updated;
}
