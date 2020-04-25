import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere } from "@remult/core";
import { FamiliesComponent } from "./families.component";
import { Families, iterateFamilies } from "./families";
import { Roles } from "../auth/roles";
import { BasketId } from "./BasketType";
import { DistributionCenterId } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { Groups } from "../manage/manage.component";
import { translate } from "../translate";
import { FamilyStatusColumn } from "./FamilyStatus";
import { FamilySourceId } from "./FamilySources";
import { serverUpdateInfo } from "./familyActions";
import { DialogService } from "../select-popup/dialog";






export class ActionOnRows {
    constructor(protected context: Context,
        public args: ActionOnRowsArgs,
        public worker: {
            callServer: (info: serverUpdateInfo, action: string, columns: any[]) => Promise<string>,
            doWorkOnServer: (info: serverUpdateInfo) => Promise<string>
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
        return await this.worker.doWorkOnServer(info);

    }
    gridButton(component: actionDialogNeeds) {
        return {
            name: this.args.title + ' למשפחות המסומנות',
            visible: () => this.context.isAllowed(this.args.allowed),
            click: async () => {
                await this.context.openDialog(InputAreaComponent, x => {
                    x.args = {
                        settings: {
                            columnSettings: () => this.args.dialogColumns ? this.args.dialogColumns(component) : this.args.columns()
                        },
                        title: this.args.title + ' ל-' + component.totalRows() + ' המשפחות המסומנות',
                        ok: async () => {
                            if (await component.dialog.YesNoPromise(this.args.confirmQuestion() + ' ל-' + component.totalRows() + translate(' משפחות?'))) {
                                let args = [];
                                for (const c of this.args.columns()) {
                                    args.push(c.rawValue);
                                }
                                component.dialog.Info(await this.worker.callServer(component.packWhere(), this.args.title, args));
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
export interface actionDialogNeeds {
    dialog: DialogService,
    totalRows: () => number,
    afterAction: () => {},
    packWhere: () => any
}

export interface ActionOnRowsArgs {
    dialogColumns?: (component: actionDialogNeeds) => DataArealColumnSetting<any>[],
    columns: () => Column<any>[],
    title: string,
    allowed: Allowed,
    confirmQuestion?: () => string
}


export async function filterActionOnServer(actions: {
    new(context: Context): ActionOnRows;
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

export function buildGridButtonFromActions(actions: {
    new(context: Context): ActionOnRows
}[],context:Context, component: actionDialogNeeds) {
    let r = [];
    for (const a of actions) {
        r.push(new a(context).gridButton(component));
    }
    return r;
}