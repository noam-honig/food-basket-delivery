import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, IdEntity, SpecificEntityHelper, FilterBase, EntityWhere, packWhere, EntityOrderBy } from "@remult/core";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { DialogService, extractError } from "../select-popup/dialog";

import { ApplicationSettings } from "../manage/ApplicationSettings";
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { PromiseThrottle } from "../shared/utils";




export interface serverUpdateInfo<T extends IdEntity> {
    where: EntityWhere<T>;
    count: number;
}
export interface packetServerUpdateInfo {
    packedWhere: any;
    count: number;
}
export interface DoWorkOnServerHelper<T extends IdEntity> {
    actionWhere: EntityWhere<T>;
    forEach: (f: T) => Promise<void>;
    orderBy?: EntityOrderBy<T>
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

        if (!args.onEnd) {
            args.onEnd = async () => { };
        }
        if (!args.dialogColumns)
            args.dialogColumns = async x => args.columns();
        if (!args.validateInComponent)
            args.validateInComponent = async x => { };
        if (!args.additionalWhere) {
            args.additionalWhere = x => { return undefined; };
        }


    }

    async doWorkOnServer(doWork: (h: DoWorkOnServerHelper<T>) => Promise<number>, args: any[]) {

        let i = 0;
        for (const c of this.args.columns()) {
            c.rawValue = args[i++];
        }
        if (this.args.validate)
            await this.args.validate();
        let r = await doWork({
            actionWhere: x => {
                if (this.args.additionalWhere)
                    return this.args.additionalWhere(x);
            },
            forEach: this.args.forEach
        });
        if (this.args.onEnd)
            await this.args.onEnd();
        return r;


    }


    gridButton(component: actionDialogNeeds<T>) {
        return {
            name: this.args.title,
            visible: () => {
                let r = this.context.isAllowed(this.args.allowed);
                if (!r)
                    return false;
                if (this.args.visible) {
                    r = this.args.visible(component);
                }
                return r;
            },
            icon: this.args.icon,
            click: async () => {

                let cols = await this.args.dialogColumns(component);
                await this.context.openDialog(InputAreaComponent, x => {
                    x.args = {
                        settings: {
                            columnSettings: () => cols
                        },
                        title: this.args.title,
                        helpText: this.args.help ? this.args.help() : undefined,
                        validate: async () => {
                            if (this.args.validate)
                                await this.args.validate();

                            await this.args.validateInComponent(component);


                        },
                        ok: async () => {
                            let info = await component.buildActionInfo(this.args.additionalWhere);
                            if (await component.dialog.YesNoPromise(this.args.confirmQuestion() + " " + use.language.for + " " + info.count + ' ' + component.groupName + '?')) {
                                let r = await this.internalForTestingCallTheServer(component, info);
                                component.dialog.Info(r);


                                component.afterAction();
                            }
                        }
                        , cancel: () => { }

                    }
                });

            }
        } as GridButton;
    }

    async internalForTestingCallTheServer(component: actionDialogNeeds<T>, info: serverUpdateInfo<T>) {
        let args = [];
        for (const c of this.args.columns()) {
            args.push(c.rawValue);
        }

        let r = await component.callServer({
            count: info.count,
            packedWhere: packWhere(this.context.for(this.entity).create(), info.where)
        }, this.args.title, args);
        return r;
    }
}

export interface actionDialogNeeds<T extends IdEntity> {
    dialog: DialogService,
    settings: ApplicationSettings,
    afterAction: () => {},
    buildActionInfo: (actionWhere: EntityWhere<T>) => Promise<serverUpdateInfo<T>>,
    callServer: (info: packetServerUpdateInfo, action: string, columns: any[]) => Promise<string>,
    groupName: string
}


export interface ActionOnRowsArgs<T extends IdEntity> {
    dialogColumns?: (component: actionDialogNeeds<T>) => Promise<DataArealColumnSetting<any>[]>,
    visible?: (component: actionDialogNeeds<T>) => boolean,
    forEach: (f: T) => Promise<void>,
    onEnd?: () => Promise<void>,
    columns: () => Column[],
    validateInComponent?: (component: actionDialogNeeds<T>) => Promise<void>,
    validate?: () => Promise<void>,
    title: string,
    icon?: string,
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
                return getLang(context).notAthorized;
            }
        }
    }
    throw getLang(context).actionNotFound;
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
    orderBy?: EntityOrderBy<T>,
    count?: number
}) {
    let updated = 0;
    let pt = new PromiseThrottle(10);
    for await (const f of context.iterate({ where: args.where, orderBy: args.orderBy })) {
        await pt.push(args.forEachRow(f));
        updated++;
    }
    await pt.done();
    return updated;
}
export async function iterateRowsActionOnServer<T extends IdEntity>(
    args: {
        context: SpecificEntityHelper<string, T>,
        h: DoWorkOnServerHelper<T>,
        info: packetServerUpdateInfo,
        additionalWhere?: EntityWhere<T>

    }) {
    let where = x => new AndFilter(args.h.actionWhere(x), unpackWhere(x, args.info.packedWhere));
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
        orderBy: args.h.orderBy,
        forEachRow: async (f) => await args.h.forEach(f),
        count,

    });
}