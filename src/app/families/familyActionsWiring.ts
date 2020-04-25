import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, IdEntity, SpecificEntityHelper, FilterBase } from "@remult/core";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { translate } from "../translate";
import { DialogService } from "../select-popup/dialog";
import { PromiseThrottle } from "../import-from-excel/import-from-excel.component";



export interface serverUpdateInfo {
    where: any;
    count: number;
}


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

export async function pagedRowsIterator<T extends IdEntity>(context: SpecificEntityHelper<string,T>, where: (f: T) => FilterBase, what: (f: T) => void, count?: number) {
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
  