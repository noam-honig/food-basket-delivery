import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, FilterBase } from "@remult/core";
import { Roles } from "../auth/roles";
import { DistributionCenterId } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { Groups } from "../manage/manage.component";
import { translate } from "../translate";
import { ActionOnRows, actionDialogNeeds, ActionOnRowsArgs, filterActionOnServer, serverUpdateInfo, pagedRowsIterator } from "../families/familyActionsWiring";
import { async } from "@angular/core/testing";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { Families } from "../families/families";
import { BasketId, QuantityColumn } from "../families/BasketType";





class DeleteDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'מחק משלוחים',
            help: 'המחיקה תתבצע רק עבור משלוחים שטרם נמסרו',
            forEach: async f => { f.delete(); },
            additionalWhere: f => f.deliverStatus.isNotAResultStatus()
        });
    }
}
class FreezeDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'הקפא משלוחים',
            help: 'ההקפאה תתבצע רק למשלוחים שהם מוכנים למשלוח',
            forEach: async f => { f.deliverStatus.value = DeliveryStatus.Frozen; },
            additionalWhere: f => f.readyFilter()
        });
    }
}
class UnfreezeDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'ביטול הקפאת משלוחים',
            help: 'ביטול ההקפאה יחזיר משלוחים קפואים למוכן למשלוח',
            forEach: async f => { f.deliverStatus.value = DeliveryStatus.ReadyForDelivery; },
            additionalWhere: f => f.deliverStatus.isEqualTo(DeliveryStatus.Frozen)
        });
    }
}

class ArchiveDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'העברה לארכיב',
            help: 'העברה לארכיב תעשה רק למשלוחים שנמסרו או נתקלו בבעיה. ניתן לראות את הארכיב בכל עת במסך היסטורית משלוחים',
            forEach: async f => { f.archive.value = true; },
            additionalWhere: f => f.deliverStatus.isAResultStatus()
        });
    }
}
class DeliveredForOnTheWay extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'עדכן נמסר בהצלחה',
            help: 'פעולה זו תעדכן נמסר בהצלחה עבור משלוחים שבדרך',
            forEach: async f => { f.deliverStatus.value = DeliveryStatus.Success },
            additionalWhere: f => f.onTheWayFilter()
        });
    }
}

class UpdateBasketType extends ActionOnRows<ActiveFamilyDeliveries> {
    basketType = new BasketId(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.basketType],
            title: 'עדכן סוג סל',
            forEach: async f => { f.basketType.value = this.basketType.value },

        });
    }
}
class UpdateQuantity extends ActionOnRows<ActiveFamilyDeliveries> {
    quantity = new QuantityColumn();
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.quantity],
            title: 'עדכן כמות סלים',
            forEach: async f => { f.quantity.value = this.quantity.value },
        });
    }
}

class UpdateDistributionCenter extends ActionOnRows<ActiveFamilyDeliveries> {
    distributionCenter = new DistributionCenterId(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.distributionCenter],
            title: 'עדכן רשימת חלוקה',
            forEach: async f => { f.distributionCenter.value = this.distributionCenter.value },

        });
    }
}

class CancelAsignment extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [],
            title: 'בטל שיוך למתנדב',
            help: 'פעולה זו תבטל את השיוך בין מתנדבים למשפחות, ותחזיר משלוחים המסומנים כ"בדרך" ל"טרם שויכו"',
            forEach: async f => { f.courier.value = ''; },
            additionalWhere: f => f.onTheWayFilter()
        });
    }
}
class NewDelivery extends ActionOnRows<ActiveFamilyDeliveries> {
    useExistingBasket = new BoolColumn({ caption: 'השתמש בסוג הסל המוגדר במשלוח הנוכחי', defaultValue: true });
    basketType = new BasketId(this.context);
    quantity = new QuantityColumn();

    distributionCenter = new DistributionCenterId(this.context);

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
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
            additionalWhere: f => f.deliverStatus.isAResultStatus(),
            title: 'משלוח חדש',
            help: 'משלוח חדש יוגדר עבור כל המשלוחים המסומנים שהם בסטטוס נמסר בהצלחה, או בעיה כלשהי',
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
export const delvieryActions = () => [UpdateBasketType, UpdateQuantity, DeliveredForOnTheWay, UpdateDistributionCenter, CancelAsignment, FreezeDeliveries, UnfreezeDeliveries, ArchiveDeliveries, DeleteDeliveries, NewDelivery];
