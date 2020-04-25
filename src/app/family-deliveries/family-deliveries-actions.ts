import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, FilterBase } from "@remult/core";
import { Roles } from "../auth/roles";
import { DistributionCenterId } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { Groups } from "../manage/manage.component";
import { translate } from "../translate";
import { ActionOnRows, actionDialogNeeds, ActionOnRowsArgs, filterActionOnServer, serverUpdateInfo, pagedRowsIterator } from "../families/familyActionsWiring";
import { async } from "@angular/core/testing";
import { ActiveFamilyDeliveries } from "../families/FamilyDeliveries";




class ActionOnFamilyDelveries extends ActionOnRows<ActiveFamilyDeliveries> {
    constructor(context: Context, args: ActionOnRowsArgs<ActiveFamilyDeliveries>) {
        super(context, ActiveFamilyDeliveries, args, {
            callServer: async (info, action, args) => await ActionOnFamilyDelveries.DeliveriesActionOnServer(info, action, args)
            , groupName: 'משלוחים'
        });
    }
    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async DeliveriesActionOnServer(info: serverUpdateInfo, action: string, args: any[], context?: Context) {
        return await filterActionOnServer(delvieryActions(), context, info, action, args);
    }
}
class DeleteDeliveries extends ActionOnFamilyDelveries {

    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'מחיקה ',
            whatToDoOnFamily: async f => { f.delete(); }
        });
    }
}

class ArchiveDeliveries extends ActionOnFamilyDelveries {

    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'העברה לארכיב של משלוחים שהסתיימו',
            whatToDoOnFamily: async f => { f.archive.value = true; },
            additionalWhere: f => f.deliverStatus.isAResultStatus()
        });
    }
}
export const delvieryActions = () => [ArchiveDeliveries, DeleteDeliveries];