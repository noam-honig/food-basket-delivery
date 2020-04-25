import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere } from "@remult/core";
import { FamiliesComponent } from "./families.component";
import { Families } from "./families";
import { Roles } from "../auth/roles";
import { BasketId } from "./BasketType";
import { DistributionCenterId } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { Groups } from "../manage/manage.component";
import { FamilyStatusColumn } from "./FamilyStatus";
import { FamilySourceId } from "./FamilySources";
import { ActionOnRows, actionDialogNeeds, ActionOnRowsArgs, filterActionOnServer, serverUpdateInfo, pagedRowsIterator } from "./familyActionsWiring";



class ActionOnFamilies extends ActionOnRows<Families> {
    constructor(context: Context, args: ActionOnRowsArgs<Families>) {
        super(context,Families, args, {
            callServer: async (info, action, args) => await ActionOnFamilies.FamilyActionOnServer(info, action, args),
            groupName: 'משפחות'
        });
    }
    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async FamilyActionOnServer(info: serverUpdateInfo, action: string, args: any[], context?: Context) {
        return await filterActionOnServer(familyActions(), context, info, action, args);
    }
}
class NewDelivery extends ActionOnFamilies {
    useFamilyBasket = new BoolColumn({ caption: 'השתמש בסוג הסל המוגדר למשפחה', defaultValue: false });
    basketType = new BasketId(this.context);

    distributionCenter = new DistributionCenterId(this.context);
    determineCourier = new BoolColumn('הגדר מתנדב');
    courier = new HelperId(this.context, () => this.distributionCenter.value);
    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [
                this.useFamilyBasket,
                this.basketType,
                this.distributionCenter,
                this.determineCourier,
                this.courier
            ],
            dialogColumns: (component) => {
                this.basketType.value = '';
                this.distributionCenter.value = component.dialog.distCenter.value;
                return [
                    { column: this.basketType, visible: () => !this.useFamilyBasket.value },
                    this.useFamilyBasket,
                    { column: this.distributionCenter, visible: () => component.dialog.hasManyCenters },
                    this.determineCourier,
                    { column: this.courier, visible: () => this.determineCourier.value }
                ]
            },
            title: 'משלוח חדש',
            whatToDoOnFamily: async f => {
                let fd = f.createDelivery();
                if (!this.useFamilyBasket.value) {
                    fd.basketType.value = this.basketType.value;
                }
                fd.distributionCenter.value = this.distributionCenter.value;
                if (this.determineCourier.value) {
                    fd.courier.value = this.courier.value;
                }
                await fd.save();
            }
        });
    }
}
const addGroupAction = ' להוסיף ';
const replaceGroupAction = ' להחליף ';
class updateGroup extends ActionOnFamilies {

    group = new StringColumn({
        caption: 'שיוך לקבוצת חלוקה',
        dataControlSettings: () => ({
            valueList: this.context.for(Groups).getValueList({ idColumn: x => x.name, captionColumn: x => x.name })
        })
    });
    action = new StringColumn({
        caption: 'פעולה',
        defaultValue: addGroupAction,
        dataControlSettings: () => ({
            valueList: [{ id: addGroupAction, caption: 'הוסף שיוך לקבוצת חלוקה' }, { id: 'להסיר', caption: 'הסר שיוך לקבוצת חלוקה' }, { id: replaceGroupAction, caption: 'החלף שיוך לקבוצת חלוקה' }]
        })
    });
    constructor(context: Context) {
        super(context, {
            columns: () => [this.group, this.action],
            confirmQuestion: () => 'האם ' + this.action.value + ' את השיוך לקבוצה "' + this.group.value,
            title: 'שיוך לקבוצת חלוקה',
            allowed: Roles.distCenterAdmin,
            whatToDoOnFamily: async f => {
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

class UpdateStatus extends ActionOnFamilies {
    status = new FamilyStatusColumn();
    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.status],
            title: 'עדכן סטטוס משפחה ',
            whatToDoOnFamily: async f => { f.status.value = this.status.value; }
        });
    }
}
class UpdateBasketType extends ActionOnFamilies {
    basket = new BasketId(this.context);
    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.basket],
            title: 'עדכן סוג סל ברירת מחדל',
            whatToDoOnFamily: async f => { f.basketType.value = this.basket.value },
        });
    }
}
class UpdateFamilySource extends ActionOnFamilies {
    familySource = new FamilySourceId(this.context);
    constructor(context: Context) {
        super(context, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.familySource],
            title: 'עדכן גורם מפנה ',
            whatToDoOnFamily: async f => { f.familySource.value = this.familySource.value }
        });
    }
}




export const familyActions = () => [NewDelivery, updateGroup, UpdateStatus, UpdateBasketType, UpdateFamilySource];
