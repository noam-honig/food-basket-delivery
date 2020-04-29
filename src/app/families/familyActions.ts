import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere } from "@remult/core";
import { FamiliesComponent } from "./families.component";
import { Families } from "./families";
import { Roles } from "../auth/roles";
import { BasketId, QuantityColumn } from "./BasketType";
import { DistributionCenterId, DistributionCenters } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { Groups } from "../manage/manage.component";
import { FamilyStatusColumn, FamilyStatus } from "./FamilyStatus";
import { FamilySourceId } from "./FamilySources";
import { ActionOnRows, actionDialogNeeds, ActionOnRowsArgs, filterActionOnServer, serverUpdateInfo, pagedRowsIterator } from "./familyActionsWiring";
import { DeliveryStatus } from "./DeliveryStatus";


class NewDelivery extends ActionOnRows<Families> {
    useFamilyBasket = new BoolColumn({ caption: 'השתמש בסוג הסל המוגדר למשפחה', defaultValue: false });
    basketType = new BasketId(this.context);
    quantity = new QuantityColumn();

    distributionCenter = new DistributionCenterId(this.context);
    determineCourier = new BoolColumn('הגדר מתנדב');
    courier = new HelperId(this.context);
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.distCenterAdmin,
            columns: () => [
                this.useFamilyBasket,
                this.basketType,
                this.quantity,
                this.distributionCenter,
                this.determineCourier,
                this.courier
            ],
            validate: async () => {
                let x =await  context.for(DistributionCenters).findId(this.distributionCenter);
                if (!x) {
                    this.distributionCenter.validationError = 'חובה לבחור רשימת חלוקה';
                    throw this.distributionCenter.validationError;
                }
            },
            dialogColumns: (component) => {
                this.basketType.value = '';
                this.quantity.value = 1;
                this.distributionCenter.value = component.dialog.distCenter.value;
                return [
                    [{ column: this.basketType, visible: () => !this.useFamilyBasket.value }, { column: this.quantity, visible: () => !this.useFamilyBasket.value }],
                    this.useFamilyBasket,
                    { column: this.distributionCenter, visible: () => component.dialog.hasManyCenters },
                    this.determineCourier,
                    { column: this.courier, visible: () => this.determineCourier.value }
                ]
            },
            additionalWhere: f => f.status.isEqualTo(FamilyStatus.Active),

            title: 'משלוח חדש',
            forEach: async f => {
                let fd = f.createDelivery(this.distributionCenter.value);
                if (!this.useFamilyBasket.value) {
                    fd.basketType.value = this.basketType.value;
                    fd.quantity.value = this.quantity.value;
                }

                if (this.determineCourier.value) {
                    fd.courier.value = this.courier.value;
                }
                if ((await fd.duplicateCount()) == 0)
                    await fd.save();
            }
        });
    }
}
const addGroupAction = ' להוסיף ';
const replaceGroupAction = ' להחליף ';
class updateGroup extends ActionOnRows<Families> {

    group = new StringColumn({
        caption: 'שיוך לקבוצה',
        dataControlSettings: () => ({
            valueList: this.context.for(Groups).getValueList({ idColumn: x => x.name, captionColumn: x => x.name })
        })
    });
    action = new StringColumn({
        caption: 'פעולה',
        defaultValue: addGroupAction,
        dataControlSettings: () => ({
            valueList: [{ id: addGroupAction, caption: 'הוסף שיוך לקבוצה' }, { id: 'להסיר', caption: 'הסר שיוך לקבוצה' }, { id: replaceGroupAction, caption: 'החלף שיוך לקבוצה' }]
        })
    });
    constructor(context: Context) {
        super(context, Families, {
            columns: () => [this.group, this.action],
            confirmQuestion: () => 'האם ' + this.action.value + ' את השיוך לקבוצה "' + this.group.value,
            title: 'שיוך לקבוצת משפחות',
            allowed: Roles.distCenterAdmin,
            forEach: async f => {
                if (this.action.value == addGroupAction) {
                    if (!f.groups.selected(this.group.value))
                        f.groups.addGroup(this.group.value);
                } else if (this.action.value == replaceGroupAction) {
                    f.groups.value = this.group.value;
                }
                else {
                    if (f.groups.selected(this.group.value))
                        f.groups.removeGroup(this.group.value);
                }
            }

        });
    }
}

class UpdateStatus extends ActionOnRows<Families> {
    status = new FamilyStatusColumn();
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.status],
            title: 'עדכן סטטוס משפחה ',
            forEach: async f => { f.status.value = this.status.value; }
        });
    }
}
class UpdateBasketType extends ActionOnRows<Families> {
    basket = new BasketId(this.context);
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.basket],
            title: 'עדכן סוג סל ברירת מחדל',
            forEach: async f => { f.basketType.value = this.basket.value },
        });
    }
}
class UpdateArea extends ActionOnRows<Families> {
    area = new StringColumn('אזור');
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.area],
            title: 'עדכן אזור למשפחות',
            forEach: async f => { f.area.value = this.area.value },
        });
    }
}

class UpdateQuantity extends ActionOnRows<Families> {
    quantity = new QuantityColumn();
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.quantity],
            title: 'עדכן כמות סלים ברירת מחדל',
            forEach: async f => { f.quantity.value = this.quantity.value },
        });
    }
}
class UpdateFamilySource extends ActionOnRows<Families> {
    familySource = new FamilySourceId(this.context);
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.familySource],
            title: 'עדכן גורם מפנה ',
            forEach: async f => { f.familySource.value = this.familySource.value }
        });
    }
}




export const familyActions = () => [NewDelivery, updateGroup, UpdateArea, UpdateStatus, UpdateBasketType, UpdateQuantity, UpdateFamilySource];
export const familyActionsForDelivery = () => [updateGroup, UpdateArea];