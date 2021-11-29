import { Remult, Allowed, IdEntity, Filter, EntityFilter, EntityOrderBy, BackendMethod, ProgressListener, EntityBase, getFields, Repository, QueryOptions } from "remult";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { DialogService, extractError } from "../select-popup/dialog";

import { ApplicationSettings } from "../manage/ApplicationSettings";
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { PromiseThrottle } from "../shared/utils";

import { Families } from "./families";
import { DataAreaFieldsSetting, GridButton, openDialog } from "@remult/angular";
import { Roles } from "../auth/roles";






export interface packetServerUpdateInfo {
    packedWhere: any;
    count: number;
}
export interface DoWorkOnServerHelper<T extends IdEntity> {
    actionWhere: EntityFilter<T>;
    forEach: (f: T) => Promise<void>;
    orderBy?: EntityOrderBy<T>
}


export abstract class ActionOnRows<T extends IdEntity>  {
    constructor(protected remult: Remult,
        private entity: {
            new(...args: any[]): T;
        },
        public args: ActionOnRowsArgs<T>,
        public serialHelper?: {
            serializeOnClient: () => Promise<void>,
            deserializeOnServer: () => Promise<void>
        }

    ) {

        if (!args.confirmQuestion)
            args.confirmQuestion = () => args.title;
        if (args.allowed === undefined)
            args.allowed = Roles.admin;

        if (!args.onEnd) {
            args.onEnd = async () => { };
        }
        if (!args.dialogColumns)
            args.dialogColumns = async x => [...getFields(this, this.remult)];
        if (!args.validateInComponent)
            args.validateInComponent = async x => { };
        if (!args.additionalWhere) {
            args.additionalWhere = {};
        }


    }
    get $() { return getFields<this>(this, this.remult) };

    gridButton(component: actionDialogNeeds<T>) {
        return {
            name: this.args.title,
            visible: () => {
                let r = this.remult.isAllowed(this.args.allowed);
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
                            fields: () => cols
                        },
                        title: this.args.title,
                        helpText: this.args.help ? this.args.help() : undefined,
                        validate: async () => {
                            if (this.args.validate)
                                await this.args.validate();

                            await this.args.validateInComponent(component);


                        },
                        ok: async () => {
                            let groupName = this.remult.repo(this.entity).metadata.caption;
                            let where = await this.composeWhere(component.userWhere);
                            let count = await this.remult.repo(this.entity).count(where)
                            if (await component.dialog.YesNoPromise(this.args.confirmQuestion() + " " + use.language.for + " " + count + ' ' + groupName + '?')) {
                                let r = await this.internalForTestingCallTheServer({
                                    count,
                                    where
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
        where: EntityFilter<T>,
        count: number
    }) {
        if (this.serialHelper)
            await this.serialHelper.serializeOnClient();
        let p = new ProgressListener(undefined);
        p.progress = () => { };

        let r = await this.execute({
            count: info.count,
            packedWhere: Filter.entityFilterToJson(this.remult.repo(this.entity).metadata, info.where),
        }, p);

        return r;
    }

    async composeWhere(where: EntityFilter<T> | (() => EntityFilter<T> | Promise<EntityFilter<T>>)): Promise<EntityFilter<T>> {
        return { $and: [await Filter.resolve(this.args.additionalWhere), await Filter.resolve(where)] } as EntityFilter<T>
    }

    @BackendMethod<ActionOnRows<any>>({ allowed: (remult, self) => remult.isAllowed(self.args.allowed), queue: true })
    async execute(info: packetServerUpdateInfo, progress?: ProgressListener) {
        await this.serialHelper?.deserializeOnServer();
        let where: EntityFilter<T> = await this.composeWhere(Filter.entityFilterFromJson(this.remult.repo(this.entity).metadata, info.packedWhere));

        let count = await this.remult.repo(this.entity).count(where);
        if (count != info.count) {
            console.log({ count, packCount: info.count, name: this.remult.repo(this.entity).metadata.caption });
            throw "ארעה שגיאה אנא נסה שוב";
        }
        let i = 0;
        let r = await pagedRowsIterator<T>(this.remult.repo(this.entity), {
            where,
            orderBy: this.args.orderBy,
            forEachRow: async (f) => {
                await this.args.forEach(f);
                if (!f._.wasDeleted())
                    await f.save();
                progress.progress(++i / count);
            }


        });
        let message = this.args.title + ": " + r + " " + this.remult.repo(this.entity).metadata.caption + " " + getLang(this.remult).updated;

        await Families.SendMessageToBrowsers(message, this.remult, '');
        return r;
    }

}

export interface actionDialogNeeds<T extends IdEntity> {
    dialog: DialogService,
    settings: ApplicationSettings,
    afterAction: () => {},
    userWhere: EntityFilter<T> | (() => EntityFilter<T> | Promise<EntityFilter<T>>)

}


export interface ActionOnRowsArgs<T extends IdEntity> {
    allowed?: Allowed,
    dialogColumns?: (component: actionDialogNeeds<T>) => Promise<DataAreaFieldsSetting<any>[]>,
    visible?: (component: actionDialogNeeds<T>) => boolean,
    forEach: (f: T) => Promise<void>,
    onEnd?: () => Promise<void>,
    validateInComponent?: (component: actionDialogNeeds<T>) => Promise<void>,
    validate?: () => Promise<void>,
    title: string,
    icon?: string,
    help?: () => string,
    confirmQuestion?: () => string,
    additionalWhere?: EntityFilter<T> | (() => EntityFilter<T> | Promise<EntityFilter<T>>),
    orderBy?: EntityOrderBy<T>
}


export async function pagedRowsIterator<T extends EntityBase>(remult: Repository<T>, args: {


    forEachRow: (f: T) => Promise<void>,

} & QueryOptions<T>) {
    let updated = 0;
    let pt = new PromiseThrottle(10);
    for await (const f of remult.query({ where: args.where, orderBy: args.orderBy })) {

        await pt.push(args.forEachRow(f));
        updated++;
    }
    await pt.done();
    return updated;
}
