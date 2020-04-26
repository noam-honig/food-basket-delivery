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
import { BasketId, QuantityColumn } from "../families/BasketType";




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
            forEach: async f => { f.delete(); },
            additionalWhere:f=>f.deliverStatus.isActiveDelivery()
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
class NewDelivery extends ActionOnFamilyDelveries {
    useExistingBasket = new BoolColumn({ caption: 'השתמש בסוג הסל המוגדר במשלוח הנוכחי', defaultValue: true });
    basketType = new BasketId(this.context);
    quantity = new QuantityColumn();

    distributionCenter = new DistributionCenterId(this.context);
    
    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [
                this.useExistingBasket,
                this.basketType,
                this.quantity,
                this.distributionCenter,
            ],
            dialogColumns: (component) => {
                this.basketType.value = '';
                this.quantity.value = 1;
                this.distributionCenter.value = component.dialog.distCenter.value;
                return [
                    this.useExistingBasket,
                    [{ column: this.basketType, visible: () => !this.useExistingBasket.value }, { column: this.quantity, visible: () => !this.useExistingBasket.value }],
                    { column: this.distributionCenter, visible: () => component.dialog.hasManyCenters }
                ]
            },
            additionalWhere:f=>f.deliverStatus.isAResultStatus(),
            title: 'משלוח חדש על בסיס משלוח זה',
            forEach: async existingDelivery => {
                let f = await this.context.for(Families).findId(existingDelivery.family);
                let newDelivery = f.createDelivery(existingDelivery.distributionCenter.value);
                newDelivery.copyFrom(existingDelivery);
                if (!this.useExistingBasket.value) {
                    newDelivery.basketType.value = this.basketType.value;
                    newDelivery.quantity.value = this.quantity.value;
                }
                if ((await newDelivery.duplicateCount()) == 0)
                    await newDelivery.save();
            }
        });
    }
}
export const delvieryActions = () => [NewDelivery, DeliveredForOnTheWay, CancelAsignment, ArchiveDeliveries, DeleteDeliveries];