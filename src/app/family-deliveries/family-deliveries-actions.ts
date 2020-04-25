import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere } from "@remult/core";
import { Roles } from "../auth/roles";
import { DistributionCenterId } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { Groups } from "../manage/manage.component";
import { translate } from "../translate";
import { ActionOnRows, actionDialogNeeds, ActionOnRowsArgs, filterActionOnServer, serverUpdateInfo, pagedRowsIterator } from "../families/familyActionsWiring";
import { async } from "@angular/core/testing";
import { FamilyDeliveries } from "../families/FamilyDeliveries";



interface ActionOnFamiliesArgs extends ActionOnRowsArgs {
    whatToDoOnFamily: (f: FamilyDeliveries) => Promise<void>
}
class ActionOnFamilyDelveries extends ActionOnRows {
    constructor(context: Context, args: ActionOnFamiliesArgs) {
        super(context, args, {
            callServer: async (info, action, args) => await ActionOnFamilyDelveries.FamilyActionOnServer(info, action, args),
            doWorkOnServer: async (info) => {

                let where = (f: FamilyDeliveries) => new AndFilter(f.distributionCenter.isAllowedForUser(), unpackWhere(f, info.where));
                let count = await context.for(FamilyDeliveries).count(where);
                if (count != info.count) {
                    return "ארעה שגיאה אנא נסה שוב";
                }
                let updated = await pagedRowsIterator(context.for(FamilyDeliveries), where, args.whatToDoOnFamily, count);
                return "עודכנו " + updated + " משפחות";
            }
        });
    }
    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async FamilyActionOnServer(info: serverUpdateInfo, action: string, args: any[], context?: Context) {
        return await filterActionOnServer(delvieryActions(),context,info,action,args);
    }
}
export const delvieryActions  =()=> [];