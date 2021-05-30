import { Context, Column, Allowed, ServerFunction, AndFilter, unpackWhere, IdEntity, Filter, EntityWhere, EntityOrderBy, ServerMethod, ServerProgress, filterOf, EntityWhereItem, EntityBase, getControllerDefs, Repository, IterateOptions } from "@remult/core";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { DialogService, extractError } from "../select-popup/dialog";

import { ApplicationSettings } from "../manage/ApplicationSettings";
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { PromiseThrottle } from "../shared/utils";
import { controllerAllowed } from "@remult/core";
import { Families } from "./families";
import { DataArealColumnSetting, GridButton, openDialog } from "../../../../radweb/projects/angular";






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
            args.dialogColumns = async x => [...getControllerDefs(this).columns];
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
                await openDialog(InputAreaComponent, x => {
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
                            let groupName = this.context.for(this.entity).defs.caption;
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
            packedWhere: this.context.for(this.entity).packWhere(info.where)
        });

        return r;
    }

    composeWhere(where: EntityWhere<T>) {
        if (this.args.additionalWhere) {
            return x => new AndFilter(this.context.for(this.entity).translateWhereToFilter(where), this.args.additionalWhere(x));
        }
        return where;

    }

    @ServerMethod({ allowed: undefined, queue: true })
    async execute(info: packetServerUpdateInfo, progress?: ServerProgress) {
        let where = this.composeWhere(x => this.context.for(this.entity).unpackWhere(info.packedWhere));

        let count = await this.context.for(this.entity).count(where);
        if (count != info.count) {
            throw "ארעה שגיאה אנא נסה שוב";
        }
        let i = 0;
        let r = await pagedRowsIterator<T>(this.context.for(this.entity), {
            where,
            orderBy: this.args.orderBy,
            forEachRow: async (f) => {
                await this.args.forEach(f);
                if (f.wasChanged())
                    await f.save();
                progress.progress(++i / count);
            }


        });
        let message = this.args.title + ": " + r + " " + this.context.for(this.entity).defs.caption + " " + getLang(this.context).updated;

        await Families.SendMessageToBrowsers(message, this.context, '');
        return r;
    }

}

export interface actionDialogNeeds<T extends IdEntity> {
    dialog: DialogService,
    settings: ApplicationSettings,
    afterAction: () => {},
    userWhere: EntityWhereItem<T>

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
    additionalWhere?: (f: filterOf<T>) => Filter,
    orderBy?: EntityOrderBy<T>
}


export async function pagedRowsIterator<T extends EntityBase>(context: Repository<T>, args: {


    forEachRow: (f: T) => Promise<void>,

} & IterateOptions<T>) {
    let updated = 0;
    let pt = new PromiseThrottle(10);
    for await (const f of context.iterate({ where: args.where, orderBy: args.orderBy })) {

        await pt.push(args.forEachRow(f));
        updated++;
    }
    await pt.done();
    return updated;
}
