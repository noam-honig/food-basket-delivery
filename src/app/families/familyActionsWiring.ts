import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, IdEntity, SpecificEntityHelper, Filter, EntityWhere, packWhere, EntityOrderBy } from "@remult/core";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { DialogService, extractError } from "../select-popup/dialog";

import { ApplicationSettings } from "../manage/ApplicationSettings";
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { PromiseThrottle } from "../shared/utils";
import { controllerAllowed, ControllerBase, controllerColumns, ServerMethod, ServerMethod2 } from "../dev/server-method";
import { Families } from "./families";





export interface packetServerUpdateInfo {
    packedWhere: any;
    count: number;
}
export interface DoWorkOnServerHelper<T extends IdEntity> {
    actionWhere: EntityWhere<T>;
    forEach: (f: T) => Promise<void>;
    orderBy?: EntityOrderBy<T>
}


export abstract class ActionOnRows<T extends IdEntity>  {
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
            args.dialogColumns = async x => controllerColumns(this);
        if (!args.validateInComponent)
            args.validateInComponent = async x => { };
        if (!args.additionalWhere) {
            args.additionalWhere = x => { return undefined; };
        }


    }


    gridButton(component: actionDialogNeeds<T>) {
        return {
            name: this.args.title,
            visible: () => {
                let r = controllerAllowed(this, this.context);
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
                            let groupName = this.context.for(this.entity).create().defs.caption;
                            let count = await this.context.for(this.entity).count(this.composeWhere(component.userWhere))
                            if (await component.dialog.YesNoPromise(this.args.confirmQuestion() + " " + use.language.for + " " + count + ' ' + groupName + '?')) {
                                let r = await this.internalForTestingCallTheServer({
                                    count,
                                    where: component.userWhere
                                });



                                component.afterAction();
                            }
                        }
                        , cancel: () => { }

                    }
                });

            }
        } as GridButton;
    }

    async internalForTestingCallTheServer(info: {
        where: EntityWhere<T>,
        count: number
    }) {

        let r = await this.execute({
            count: info.count,
            packedWhere: packWhere(this.context.for(this.entity).create(), info.where)
        });

        return r;
    }

    composeWhere(where: EntityWhere<T>) {
        if (this.args.additionalWhere) {
            return x => new AndFilter(where(x), this.args.additionalWhere(x));
        }
        return where;

    }

    @ServerMethod2()
    async execute(info: packetServerUpdateInfo) {
        let where = this.composeWhere(x => unpackWhere(x, info.packedWhere));

        let count = await this.context.for(this.entity).count(where);
        if (count != info.count) {
            throw "ארעה שגיאה אנא נסה שוב";
        }
        let r = await pagedRowsIterator<T>(this.context.for(this.entity), {
            where,
            orderBy: this.args.orderBy,
            forEachRow: async (f) => {
                await this.args.forEach(f);
                if (f.wasChanged())
                    await f.save();
            }


        });
        let message = this.args.title + ": " + r + " " + this.context.for(this.entity).create().defs.caption + " " + getLang(this.context).updated;

        await Families.SendMessageToBrowsers(message, this.context, '');
        return r;
    }

}

export interface actionDialogNeeds<T extends IdEntity> {
    dialog: DialogService,
    settings: ApplicationSettings,
    afterAction: () => {},
    userWhere: EntityWhere<T>

}


export interface ActionOnRowsArgs<T extends IdEntity> {
    dialogColumns?: (component: actionDialogNeeds<T>) => Promise<DataArealColumnSetting<any>[]>,
    visible?: (component: actionDialogNeeds<T>) => boolean,
    forEach: (f: T) => Promise<void>,
    onEnd?: () => Promise<void>,
    validateInComponent?: (component: actionDialogNeeds<T>) => Promise<void>,
    validate?: () => Promise<void>,
    title: string,
    icon?: string,
    help?: () => string,
    confirmQuestion?: () => string,
    additionalWhere?: (f: T) => Filter,
    orderBy?: EntityOrderBy<T>
}


export async function pagedRowsIterator<T extends IdEntity>(context: SpecificEntityHelper<string, T>, args: {

    where: (f: T) => Filter,
    forEachRow: (f: T) => Promise<void>,
    orderBy?: EntityOrderBy<T>
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
