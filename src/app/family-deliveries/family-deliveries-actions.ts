import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, FilterBase, ValueListColumn } from "@remult/core";
import { Roles } from "../auth/roles";
import { DistributionCenterId, DistributionCenters, allCentersToken } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { Groups } from "../manage/manage.component";
import { translate } from "../translate";
import { ActionOnRows, actionDialogNeeds, ActionOnRowsArgs, filterActionOnServer, serverUpdateInfo, pagedRowsIterator } from "../families/familyActionsWiring";
import { async } from "@angular/core/testing";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus, DeliveryStatusColumn } from "../families/DeliveryStatus";
import { Families } from "../families/families";
import { BasketId, QuantityColumn } from "../families/BasketType";
import { FamilyStatus, FamilyStatusColumn } from "../families/FamilyStatus";
import { SelfPickupStrategyColumn } from "../families/familyActions";
import { AsignFamilyComponent } from "../asign-family/asign-family.component";





class DeleteDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {
    updateFamilyStatus = new BoolColumn("עדכן גם את סטטוס המשפחות");
    status = new FamilyStatusColumn();
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [this.updateFamilyStatus, this.status],
            dialogColumns: c => [
                this.updateFamilyStatus,
                { column: this.status, visible: () => this.updateFamilyStatus.value }
            ],
            title: 'מחק משלוחים',
            help: () => 'שים לב - מחיקת המשלוח לא תוציא את המשפחה מהרשימות - כדי להוציא את המשפחה מהרשימות יש לבצע עדכון לסטטוס המשפחה. המחיקה תתבצע רק עבור משלוחים שטרם נמסרו',
            forEach: async fd => {
                fd.delete();
                if (this.updateFamilyStatus.value) {
                    let f = await this.context.for(Families).findId(fd.family);
                    f.status.value = this.status.value;
                    await f.save();
                }
            },
            additionalWhere: f => f.deliverStatus.isNotAResultStatus()
        });
    }
}
class UpdateFixedCourier extends ActionOnRows<FamilyDeliveries> {
    byCurrentCourier = new BoolColumn('עדכן את המתנדב מהמשלוח הנוכחי');
    courier = new HelperId(this.context, 'מתנדב ברירת מחדל למשפחה');
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [this.courier, this.byCurrentCourier],
            dialogColumns: () => {
                this.courier.value = '';
                return [
                    this.byCurrentCourier,
                    { column: this.courier, visible: () => !this.byCurrentCourier.value }
                ]
            },
            title: 'עדכן מתנדב ברירת מחדל למשפחה',
            forEach: async fd => {


                let f = await this.context.for(Families).findId(fd.family);
                if (f) {
                    if (this.byCurrentCourier.value) {
                        if (fd.courier.value)
                            f.fixedCourier.value = fd.courier.value;
                    }
                    else
                        f.fixedCourier.value = this.courier.value;
                    if (f.wasChanged()) {
                        await f.save();
                        f.updateDelivery(fd);
                    }
                }
            },
        });
    }
}
export class UpdateCourier extends ActionOnRows<FamilyDeliveries> {

    courier = new HelperId(this.context, 'מתנדב');
    updateAlsoAsFixed = new BoolColumn('עדכן גם כמתנדב ברירת מחדל');
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [this.courier, this.updateAlsoAsFixed],


            title: 'עדכן מתנדב למשלוחים',
            forEach: async fd => {
                fd.courier.value = this.courier.value;
                if (this.updateAlsoAsFixed.value) {
                    let f = await this.context.for(Families).findId(fd.family);
                    if (f) {
                        f.fixedCourier.value = this.courier.value;
                        if (f.wasChanged()) {
                            await f.save();
                            f.updateDelivery(fd);
                        }
                    }
                }
            },
            onEnd: async () => {
                if (this.courier.value)
                    await AsignFamilyComponent.RefreshRoute(this.courier.value, true);
            }
        });
    }
}
export class UpdateDeliveriesStatus extends ActionOnRows<ActiveFamilyDeliveries> {

    status = new DeliveryStatusColumn();
    comment = new StringColumn('הערה פנימית למשלוח - לא תופיע למתנדב');
    deleteExistingComment = new BoolColumn("מחק הערה קודמת");
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [this.status, this.comment, this.deleteExistingComment],
            title: 'עדכן סטטוס למשלוחים',
            help: () => `סטטוס "מוקפא" הינו הינו משלוח אשר לא ישוייך לאף מתנדב עד שאותו המשלוח "יופשר". הקפאה משמשת לעצירה זמנית של משלוחים מסויימים עד לשלב בו אפשר להפשיר אותם ולשלוח.
            ההקפאה תתבצע רק למשלוחים שהם מוכנים למשלוח.
            `,
            validate: async () => {
                if (this.status.value == undefined)
                    throw "לא נבחר סטטוס";

            },
            validateInComponent: async c => {
                if (this.status.value == DeliveryStatus.ReadyForDelivery || this.status.value == DeliveryStatus.SelfPickup) {
                    if (await c.dialog.YesNoPromise("עדכון משלוחים שהסתיימו לסטטוס " + this.status.value.caption + " לא ישמור בהיסטוריה את הסטטוס של המשלוחים שהסתיימו - האם להפסיק את העדכון?"))
                        throw "העדכון הופסק";
                }
            },
            forEach: async f => {
                if (!(this.status.value == DeliveryStatus.Frozen && f.deliverStatus.value != DeliveryStatus.ReadyForDelivery)) {
                    f.deliverStatus.value = this.status.value;
                    if (this.deleteExistingComment) {
                        f.internalDeliveryComment.value = '';
                    }
                    if (this.comment.value) {
                        if (f.internalDeliveryComment.value)
                            f.internalDeliveryComment.value += ", ";
                        f.internalDeliveryComment.value += this.comment.value;
                    }

                }
            }

        });

    }
}



class ArchiveDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [],
            title: 'העברה לארכיב',
            help: () => 'העברה לארכיב תעשה רק למשלוחים שנמסרו או נתקלו בבעיה. ניתן לראות את הארכיב בכל עת במסך היסטורית משלוחים',
            forEach: async f => { f.archive.value = true; },
            additionalWhere: f => f.deliverStatus.isAResultStatus()
        });
    }
}

class UpdateBasketType extends ActionOnRows<ActiveFamilyDeliveries> {
    basketType = new BasketId(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
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
            allowed: Roles.admin,
            columns: () => [this.quantity],
            title: 'עדכן כמות סלים',
            forEach: async f => { f.quantity.value = this.quantity.value },
        });
    }
}

export class UpdateDistributionCenter extends ActionOnRows<ActiveFamilyDeliveries> {
    distributionCenter = new DistributionCenterId(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [this.distributionCenter],
            title: 'עדכן רשימת חלוקה',
            forEach: async f => { f.distributionCenter.value = this.distributionCenter.value },

        });
    }
}

export class NewDelivery extends ActionOnRows<ActiveFamilyDeliveries> {
    useExistingBasket = new BoolColumn({ caption: 'השתמש בסוג הסל המוגדר במשלוח הנוכחי', defaultValue: true });
    basketType = new BasketId(this.context);
    quantity = new QuantityColumn();
    helperStrategy = new HelperStrategyColumn();
    helper = new HelperId(this.context);
    autoArchive = new BoolColumn({ caption: 'העבר את המשלוח שהסתיים לארכיון', defaultValue: true });
    newDeliveryForAll = new BoolColumn('משלוח חדש לכל המשלוחים ולא רק לאלו שהסתיימו בהצלחה');
    selfPickup = new SelfPickupStrategyColumn(true);

    distributionCenter = new DistributionCenterId(this.context);
    useCurrentDistributionCenter = new BoolColumn('רשימת חלוקה כמו במשלוח הנוכחי');

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [
                this.useExistingBasket,
                this.basketType,
                this.quantity,
                this.helperStrategy,
                this.helper,
                this.distributionCenter,
                this.autoArchive,
                this.newDeliveryForAll,
                this.selfPickup,
                this.useCurrentDistributionCenter
            ],
            dialogColumns: (component) => {
                this.basketType.value = '';
                this.quantity.value = 1;
                this.distributionCenter.value = component.dialog.distCenter.value;
                this.useCurrentDistributionCenter.value = component.dialog.distCenter.value == allCentersToken;
                return [
                    this.useExistingBasket,
                    [{ column: this.basketType, visible: () => !this.useExistingBasket.value }, { column: this.quantity, visible: () => !this.useExistingBasket.value }],
                    { column: this.useCurrentDistributionCenter, visible: () => component.dialog.distCenter.value == allCentersToken },
                    { column: this.distributionCenter, visible: () => component.dialog.hasManyCenters && !this.useCurrentDistributionCenter.value },
                    this.helperStrategy,
                    { column: this.helper, visible: () => this.helperStrategy.value == HelperStrategy.selectHelper },
                    this.autoArchive,
                    this.newDeliveryForAll,
                    this.selfPickup.getDispaySettings(component.settings.usingSelfPickupModule.value)
                ]
            },
            validate: async () => {
                if (!this.useCurrentDistributionCenter.value) {
                    let dc = await this.context.for(DistributionCenters).findId(this.distributionCenter.value);
                    if (!dc)
                        throw 'חובה לבחור רשימת חלוקה';
                }
            },
            additionalWhere: f => {
                if (this.newDeliveryForAll)
                    return undefined;
                f.deliverStatus.isAResultStatus();
            },
            title: 'משלוח חדש',
            help: () => 'משלוח חדש יוגדר עבור כל המשלוחים המסומנים שהם בסטטוס נמסר בהצלחה, או בעיה כלשהי, אלא אם תבחרו לסמן את השדה ' + this.newDeliveryForAll.defs.caption,
            forEach: async existingDelivery => {
                let f = await this.context.for(Families).findId(existingDelivery.family);
                if (!f || f.status.value != FamilyStatus.Active)
                    return;
                let newDelivery = f.createDelivery(existingDelivery.distributionCenter.value);
                newDelivery.copyFrom(existingDelivery);
                if (!this.useExistingBasket.value) {
                    newDelivery.basketType.value = this.basketType.value;
                    newDelivery.quantity.value = this.quantity.value;
                }
                newDelivery.distributionCenter.value = this.distributionCenter.value;
                if (this.useCurrentDistributionCenter.value)
                    newDelivery.distributionCenter.value = existingDelivery.distributionCenter.value;
                this.helperStrategy.value.applyTo({ existingDelivery, newDelivery, helper: this.helper.value });
                this.selfPickup.value.applyTo({ existingDelivery, newDelivery, family: f });

                if ((await newDelivery.duplicateCount()) == 0)
                    await newDelivery.save();
                if (this.autoArchive) {
                    if (DeliveryStatus.IsAResultStatus(existingDelivery.deliverStatus.value))
                        existingDelivery.archive.value = true;
                    await existingDelivery.save();
                }
            }
        });
    }
}
class HelperStrategy {
    static familyDefault = new HelperStrategy(0, 'הגדר מתנדב לפי מתנדב ברירת מחדל המוגדר למשפחה', x => { });
    static currentHelper = new HelperStrategy(1, 'הגדר מתנדב לפי המתנדב במשלוח הנוכחי', x => {
        x.newDelivery.courier.value = x.existingDelivery.courier.value;
    });
    static noHelper = new HelperStrategy(2, 'ללא מתנדב', x => {
        x.newDelivery.courier.value = '';
    });
    static selectHelper = new HelperStrategy(3, 'בחר מתנדב', x => {
        x.newDelivery.courier.value = x.helper;
    });
    constructor(public id: number, public caption: string, public applyTo: (args: { existingDelivery: ActiveFamilyDeliveries, newDelivery: ActiveFamilyDeliveries, helper: string }) => void) {

    }
}
class HelperStrategyColumn extends ValueListColumn<HelperStrategy>{
    constructor() {
        super(HelperStrategy, {
            caption: 'הגדרת מתנדב',
            defaultValue: HelperStrategy.familyDefault,
            dataControlSettings: () => ({
                valueList: this.getOptions()
            })
        })
    }
}



export const delvieryActions = () => [
    NewDelivery,
    ArchiveDeliveries,
    UpdateDeliveriesStatus,
    UpdateBasketType,
    UpdateQuantity,
    UpdateDistributionCenter,
    UpdateCourier,
    UpdateFixedCourier,
    DeleteDeliveries
];
