import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, IdEntity, SpecificEntityHelper, FilterBase, EntityWhere, packWhere } from "@remult/core";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { DialogService } from "../select-popup/dialog";
import { PromiseThrottle } from "../import-from-excel/import-from-excel.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";




export interface serverUpdateInfo {
    actionRowsFilterInfo: any;
    count: number;
}
export interface DoWorkOnServerHelper<T extends IdEntity> {
    actionWhere: EntityWhere<T>;
    forEach: (f: T) => Promise<void>;
}


export class ActionOnRows<T extends IdEntity> {
    constructor(protected context: Context,
        private entity: {
            new(...args: any[]): T;
        },
        public args: ActionOnRowsArgs<T>

    ) {
        if (!args.confirmQuestion)
            args.confirmQuestion = () => args.title;
        if (!args.additionalWhere) {
            args.additionalWhere = x => undefined;
        }

    }

    async doWorkOnServer(doWork: (h: DoWorkOnServerHelper<T>) => Promise<number>, args: any[]) {

        let i = 0;
        for (const c of this.args.columns()) {
            c.rawValue = args[i++];
        }
        if (this.args.validate)
            await this.args.validate();
        return await doWork({
            actionWhere: x => {
                if (this.args.additionalWhere)
                    return this.args.additionalWhere(x);
            },
            forEach: this.args.forEach
        });


    }


    gridButton(component: actionDialogNeeds<T>) {
        return {
            name: this.args.title,
            visible: () => this.context.isAllowed(this.args.allowed),
            click: async () => {
                await this.context.openDialog(InputAreaComponent, x => {
                    x.args = {
                        settings: {
                            columnSettings: () => this.args.dialogColumns ? this.args.dialogColumns(component) : this.args.columns()
                        },
                        title: this.args.title,
                        helpText: this.args.help ? this.args.help() : undefined,
                        validate: this.args.validate,
                        ok: async () => {

                            let info = await component.buildActionInfo(this.args.additionalWhere);
                            if (await component.dialog.YesNoPromise(this.args.confirmQuestion() + ' ל-' + info.count + ' ' + component.groupName + '?')) {
                                let args = [];
                                for (const c of this.args.columns()) {
                                    args.push(c.rawValue);
                                }
                                try {
                                    let r = await component.callServer(info, this.args.title, args);
                                    component.dialog.Info(r);
                                }
                                catch (err) {
                                    console.log(err);
                                    component.dialog.Error(err);

                                }
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
    settings:ApplicationSettings,
    afterAction: () => {},
    buildActionInfo: (actionWhere: EntityWhere<T>) => Promise<serverUpdateInfo>,
    callServer: (info: serverUpdateInfo, action: string, columns: any[]) => Promise<string>,
    groupName: string
}


export interface ActionOnRowsArgs<T extends IdEntity> {
    dialogColumns?: (component: actionDialogNeeds<T>) => DataArealColumnSetting<any>[],
    forEach: (f: T) => Promise<void>
    columns: () => Column<any>[],
    validate?: () => Promise<void>
    title: string,
    help?: () => string,
    allowed: Allowed,
    confirmQuestion?: () => string,
    additionalWhere?: (f: T) => FilterBase
}


export async function filterActionOnServer<T extends IdEntity>(actions: {
    new(context: Context): ActionOnRows<T>;
}[], context: Context, doWork: (h: DoWorkOnServerHelper<T>) => Promise<number>, action: string, args: any[]) {
    for (const a of actions) {
        let x = new a(context);
        if (x.args.title == action) {
            if (context.isAllowed(x.args.allowed)) {
                return await x.doWorkOnServer(doWork, args);
            }
            else {
                return "!פעולה לא מורשת";
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



export async function pagedRowsIterator<T extends IdEntity>(context: SpecificEntityHelper<string, T>, args: {

    where: (f: T) => FilterBase,
    forEachRow: (f: T) => Promise<void>,
    count?: number
}) {
    let updated = 0;
    let pageSize = 200;
    if (args.count === undefined) {
        args.count = await context.count(args.where);
    }
    let pt = new PromiseThrottle(10);
    for (let index = (args.count / pageSize); index >= 0; index--) {
        let rows = await context.find({ where: args.where, limit: pageSize, page: index, orderBy: f => [f.id] });
        //console.log(rows.length);
        for (const f of rows) {
            await pt.push(args.forEachRow(f));
            updated++;
        }
    }
    await pt.done();
    return updated;
}
export async function iterateRowsActionOnServer<T extends IdEntity>(
    args: {
        context: SpecificEntityHelper<string, T>,
        h: DoWorkOnServerHelper<T>,
        info: serverUpdateInfo,
        additionalWhere?: EntityWhere<T>

    }) {
    let where = x => new AndFilter(args.h.actionWhere(x), unpackWhere(x, args.info.actionRowsFilterInfo));
    if (args.additionalWhere) {
        let w = where;
        where = x => new AndFilter(w(x), args.additionalWhere(x));
    }
    let count = await args.context.count(where);
    if (count != args.info.count) {
        throw "ארעה שגיאה אנא נסה שוב";
    }
    return await pagedRowsIterator<T>(args.context, {
        where,
        forEachRow: async (f) => await args.h.forEach(f),
        count,

    });
}