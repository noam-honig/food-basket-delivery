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
import { DeliveryStatus } from "../families/DeliveryStatus";
import { Families } from "../families/families";




class ActionOnFamilyDelveries extends ActionOnRows<ActiveFamilyDeliveries> {
    constructor(context: Context, args: ActionOnRowsArgs<ActiveFamilyDeliveries>) {
        super(context, ActiveFamilyDeliveries, args, {
            callServer: async (info, action, args) => await ActionOnFamilyDelveries.DeliveriesActionOnServer(info, action, args)
            , groupName: 'משלוחים',
            beforeEach: async f => {
                f._disableMessageToUsers = true;
            }
        });
    }
    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async DeliveriesActionOnServer(info: serverUpdateInfo, action: string, args: any[], context?: Context) {
        let r = await filterActionOnServer(delvieryActions(), context, info, action, args);
        Families.SendMessageToBrowsers('משלוחים עודכנו', context, '');
        return r;
    }
}
class DeleteDeliveries extends ActionOnFamilyDelveries {

    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'מחיקה ',
            forEach: async f => { f.delete(); }
        });
    }
}

class ArchiveDeliveries extends ActionOnFamilyDelveries {

    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'העברה לארכיב של משלוחים שהסתיימו',
            forEach: async f => { f.archive.value = true; },
            additionalWhere: f => f.deliverStatus.isAResultStatus()
        });
    }
}
class DeliveredForOnTheWay extends ActionOnFamilyDelveries {

    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'עדכן נמסר בהצלחה עבור אלו שבדרך',
            forEach: async f => { f.deliverStatus.value = DeliveryStatus.Success },
            additionalWhere: f => f.onTheWayFilter()
        });
    }
}
class UpdateFamilySource extends ActionOnFamilyDelveries {
    distributionCenter = new DistributionCenterId(this.context);
    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.distributionCenter],
            dialogColumns: c => {
                this.distributionCenter.value = c.dialog.distCenter.value;
                return [this.distributionCenter]
            },
            title: 'עדכן נקודת חלוקה ',
            forEach: async f => { f.distributionCenter.value = this.distributionCenter.value }
        });
    }
}
class CancelAsignment extends ActionOnFamilyDelveries {

    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'בטל שיוך למתנדב',
            forEach: async f => { f.courier.value = ''; },
            additionalWhere: f => f.onTheWayFilter()
        });
    }
}
export const delvieryActions = () => [UpdateFamilySource, DeliveredForOnTheWay, CancelAsignment, ArchiveDeliveries, DeleteDeliveries];