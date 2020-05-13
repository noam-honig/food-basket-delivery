import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, ValueListColumn, DataControlInfo } from "@remult/core";
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
import { ActiveFamilyDeliveries } from "./FamilyDeliveries";


class NewDelivery extends ActionOnRows<Families> {
    useFamilyBasket = new BoolColumn({ caption: 'השתמש בסוג הסל המוגדר למשפחה', defaultValue: false });
    basketType = new BasketId(this.context);
    quantity = new QuantityColumn();

    distributionCenter = new DistributionCenterId(this.context);
    determineCourier = new BoolColumn('הגדר מתנדב');
    courier = new HelperId(this.context);
    selfPickup = new SelfPickupStrategyColumn(false);
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [
                this.useFamilyBasket,
                this.basketType,
                this.quantity,
                this.distributionCenter,
                this.determineCourier,
                this.courier,
                this.selfPickup
            ],
            validate: async () => {
                let x = await context.for(DistributionCenters).findId(this.distributionCenter);
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
                    { column: this.courier, visible: () => this.determineCourier.value },
                    this.selfPickup.getDispaySettings(component.settings.usingSelfPickupModule.value)
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
                this.selfPickup.value.applyTo({ existingDelivery: undefined, newDelivery: fd, family: f });
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
export class updateGroup extends ActionOnRows<Families> {

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
            confirmQuestion: () => 'האם ' + this.action.value + ' את השיוך לקבוצה "' + this.group.value + '"',
            title: 'שיוך לקבוצת משפחות',
            allowed: Roles.admin,
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
        this.group.value='';
    }
}
export class FreezeDeliveriesForFamilies extends ActionOnRows<Families> {

    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [],
            title: 'הקפא משלוחים',
            help: () => `משלוח "קפוא" הינו הינו משלוח אשר לא ישוייך לאף מתנדב עד שאותו המשלוח "יופשר". הקפאה משמשת לעצירה זמנית של משלוחים מסויימים עד לשלב בו אפשר להפשיר אותם ולשלוח.
            ההקפאה תתבצע רק למשלוחים שהם מוכנים למשלוח.
            `,
            forEach: async f => {
                for (const fd of await this.context.for(ActiveFamilyDeliveries).find({ where: fd => fd.family.isEqualTo(f.id).and(fd.readyFilter()) })) {
                    fd.deliverStatus.value = DeliveryStatus.Frozen;
                    await fd.save();
                }

            }

        });
    }
}
export class UnfreezeDeliveriesForFamilies extends ActionOnRows<Families> {

    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [],
            title: 'ביטול הקפאת משלוחים',
            help: () => 'ביטול ההקפאה יחזיר משלוחים קפואים למוכן למשלוח',
            forEach: async f => {
                for (const fd of await this.context.for(ActiveFamilyDeliveries).find({ where: fd => fd.family.isEqualTo(f.id).and(fd.deliverStatus.isEqualTo(DeliveryStatus.Frozen)) })) {
                    fd.deliverStatus.value = DeliveryStatus.ReadyForDelivery;
                    await fd.save();
                }
            }
        });

    }
}

export class UpdateStatus extends ActionOnRows<Families> {
    status = new FamilyStatusColumn();
    archiveFinshedDeliveries = new BoolColumn({ caption: "העבר משלוחים שהסתיימו לארכיון", defaultValue: true });
    deletePendingDeliveries = new BoolColumn({ caption: "מחק משלוחים שטרם נמסרו למשפחות אלו", defaultValue: true });
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [this.status, this.archiveFinshedDeliveries, this.deletePendingDeliveries],
            help: () => 'סטטוס הוצא מהרשימות - נועד כדי לסמן שהמשפחה לא אמורה לקבל מזון - אבל בניגוד לסטטוס למחיקה - אנחנו רוצים לשמור אותה בבסיס הנתונים כדי שאם הרווחה יביאו לנו אותה שוב, נדע להגיד שהם הוצאו מהרשימות. זה מתאים למשפחות שחס וחלילה נפתרו או שפשוט לא רוצים לקבל - או שהכתובת לא קיימת וכו...',
            dialogColumns: () => {
                if (!this.status.value)
                    this.status.value = FamilyStatus.Active;

                return [
                    this.status,
                    { column: this.archiveFinshedDeliveries, visible: () => this.status.value != FamilyStatus.Active },
                    { column: this.deletePendingDeliveries, visible: () => this.status.value != FamilyStatus.Active }
                ]
            },
            title: 'עדכן סטטוס משפחה ',
            forEach: async f => {
                f.status.value = this.status.value;
                if (f.status.value != FamilyStatus.Active && (this.archiveFinshedDeliveries.value || this.deletePendingDeliveries.value)) {
                    for (const fd of await this.context.for(ActiveFamilyDeliveries).find({ where: fd => fd.family.isEqualTo(f.id) })) {
                        if (DeliveryStatus.IsAResultStatus(fd.deliverStatus.value)) {
                            if (this.archiveFinshedDeliveries) {
                                fd.archive.value = true;
                                await fd.save();
                            }
                        }
                        else {
                            if (this.deletePendingDeliveries.value)
                                await fd.delete();
                        }

                    }
                }
            }
        });
    }
}
class UpdateBasketType extends ActionOnRows<Families> {
    basket = new BasketId(this.context);
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [this.basket],
            title: 'עדכן סוג סל ברירת מחדל',
            forEach: async f => { f.basketType.value = this.basket.value },
        });
    }
}

class UpdateSelfPickup extends ActionOnRows<Families> {
    selfPickup = new BoolColumn("באים לקחת");
    updateExistingDeliveries = new BoolColumn("שנה גם עבור משלוחים שטרם נמסרו");
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [this.selfPickup, this.updateExistingDeliveries],
            title: 'עדכן באים לקחת ברירת מחדל',
            forEach: async f => {
                {
                    f.defaultSelfPickup.value = this.selfPickup.value;
                    if (this.updateExistingDeliveries.value) {
                        for (const fd of await this.context.for(ActiveFamilyDeliveries).find({ where: fd => fd.family.isEqualTo(f.id).and(fd.deliverStatus.isNotAResultStatus()) })) {
                            if (this.selfPickup.value) {
                                if (fd.deliverStatus.value == DeliveryStatus.ReadyForDelivery)
                                    fd.deliverStatus.value = DeliveryStatus.SelfPickup;

                            }
                            else
                                if (fd.deliverStatus.value == DeliveryStatus.SelfPickup)
                                    fd.deliverStatus.value = DeliveryStatus.ReadyForDelivery;
                            if (fd.wasChanged())
                                await fd.save();
                        }
                    }
                }
            },
        });
        this.updateExistingDeliveries.value = true;
    }
}

export class UpdateArea extends ActionOnRows<Families> {
    area = new StringColumn('אזור');
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
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
            allowed: Roles.admin,
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
            allowed: Roles.admin,
            columns: () => [this.familySource],
            title: 'עדכן גורם מפנה ',
            forEach: async f => { f.familySource.value = this.familySource.value }
        });
    }
}

export class SelfPickupStrategy {
    static familyDefault = new SelfPickupStrategy(0, "באים לקחת בהתאם להגדרת הברירת מחדל למשפחה", x => {
        x.newDelivery.deliverStatus.value = x.family.defaultSelfPickup.value ? DeliveryStatus.SelfPickup : DeliveryStatus.ReadyForDelivery;
    });
    static byCurrentDelivery = new SelfPickupStrategy(1, "באים לקחת בהתאם להגדרת המשלוח הנוכחי", x => {
        x.newDelivery.deliverStatus.value =
            x.existingDelivery.deliverStatus.value == DeliveryStatus.SuccessPickedUp || x.existingDelivery.deliverStatus.value == DeliveryStatus.SelfPickup
                ? DeliveryStatus.SelfPickup
                : DeliveryStatus.ReadyForDelivery;
    });
    static yes = new SelfPickupStrategy(2, "יבואו לקחת את המשלוח ואינם צריכים משלוח", x => {
        x.newDelivery.deliverStatus.value = DeliveryStatus.SelfPickup
    });
    static no = new SelfPickupStrategy(3, "משלוח עד הבית", x => {
        x.newDelivery.deliverStatus.value = DeliveryStatus.ReadyForDelivery
    });

    constructor(public id: number, public caption: string, public applyTo: (args: { existingDelivery: ActiveFamilyDeliveries, newDelivery: ActiveFamilyDeliveries, family: Families }) => void) {

    }
}
export class SelfPickupStrategyColumn extends ValueListColumn<SelfPickupStrategy>{
    constructor(private showByCurrentDeliery = true) {
        super(SelfPickupStrategy, { caption: 'הגדרת באים לקחת' })
    }
    getDispaySettings(allowSelfPickup: boolean) {
        this.value = allowSelfPickup ? this.showByCurrentDeliery ? SelfPickupStrategy.byCurrentDelivery : SelfPickupStrategy.familyDefault : SelfPickupStrategy.no;
        return {
            column: this,
            valueList: this.getOptions().filter(x => this.showByCurrentDeliery || x.id != SelfPickupStrategy.byCurrentDelivery.id),
            visible: () => allowSelfPickup
        } as DataControlInfo<any>
    }
}



export const familyActions = () => [NewDelivery, updateGroup, UpdateArea, UpdateStatus, UpdateSelfPickup, UpdateBasketType, UpdateQuantity, UpdateFamilySource, FreezeDeliveriesForFamilies, UnfreezeDeliveriesForFamilies];
export const familyActionsForDelivery = () => [updateGroup, UpdateArea, UpdateStatus];