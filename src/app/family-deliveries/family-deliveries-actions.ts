import { Context, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, ValueListColumn, EntityWhere } from "@remult/core";
import { Roles } from "../auth/roles";
import { DistributionCenterId, DistributionCenters, allCentersToken } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { ActionOnRows, actionDialogNeeds, ActionOnRowsArgs, packetServerUpdateInfo } from "../families/familyActionsWiring";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus, DeliveryStatusColumn } from "../families/DeliveryStatus";
import { Families } from "../families/families";
import { BasketId, QuantityColumn } from "../families/BasketType";
import { FamilyStatus, FamilyStatusColumn } from "../families/FamilyStatus";
import { SelfPickupStrategyColumn, updateGroup, UpdateArea, UpdateStatus, updateGroupForDeliveries, UpdateAreaForDeliveries, UpdateStatusForDeliveries } from "../families/familyActions";
import { getSettings } from "../manage/ApplicationSettings";
import { getColumnsFromObject, ServerController, ServerMethod } from "@remult/core";


export abstract class ActionOnFamilyDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context, args: ActionOnRowsArgs<ActiveFamilyDeliveries>) {
        super(context, FamilyDeliveries, buildArgsForFamilyDeliveries(args));
    }
}
function buildArgsForFamilyDeliveries(args: ActionOnRowsArgs<ActiveFamilyDeliveries>) {
    if (args.orderBy)
        throw "didn't expect order by";
    args.orderBy = x => [{ column: x.createDate, descending: true }]//to handle the case where paging is used, and items are added with different ids
    let originalForEach = args.forEach;
    args.forEach = async fd => {
        fd._disableMessageToUsers = true;
        await originalForEach(fd);
    };
    let originalWhere = args.additionalWhere;
    if (originalWhere) {
        args.additionalWhere = x => new AndFilter(originalWhere(x), x.isAllowedForUser());
    }
    else args.additionalWhere = x => x.isAllowedForUser();
    return args;
}


@ServerController({
    allowed: Roles.admin,
    key: 'deleteDeliveries'
})
export class DeleteDeliveries extends ActionOnFamilyDeliveries {
    updateFamilyStatus = new BoolColumn(getLang(this.context).updateFamilyStatus);
    status = new FamilyStatusColumn(this.context);
    constructor(context: Context) {
        super(context, {
            dialogColumns: async c => [
                this.updateFamilyStatus,
                { column: this.status, visible: () => this.updateFamilyStatus.value }
            ],
            title: getLang(context).deleteDeliveries,
            help: () => getLang(this.context).deleteDeliveriesHelp,
            forEach: async fd => {
                await fd.delete();
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
@ServerController({
    allowed: Roles.admin,
    key: 'UpdateFamilyDefaults'
})
export class UpdateFamilyDefaults extends ActionOnRows<FamilyDeliveries> {
    byCurrentCourier = new BoolColumn(use.language.defaultVolunteer);
    basketType = new BoolColumn(use.language.defaultBasketType);
    quantity = new BoolColumn(use.language.defaultQuantity);
    comment = new BoolColumn(use.language.commentForVolunteer);
    selfPickup = new BoolColumn(use.language.selfPickup);


    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            help: () => use.language.updateFamilyDefaultsHelp,
            dialogColumns: async (c) => [
                this.basketType, this.quantity, this.byCurrentCourier, this.comment, {
                    column: this.selfPickup, visible: () => c.settings.usingSelfPickupModule.value
                }
            ],

            title: getLang(context).updateFamilyDefaults,
            forEach: async fd => {


                let f = await this.context.for(Families).findId(fd.family);
                if (f) {
                    if (this.byCurrentCourier.value) {
                        if (fd.courier.value)
                            f.fixedCourier.value = fd.courier.value;
                    }
                    if (this.basketType.value)
                        f.basketType.value = fd.basketType.value;
                    if (this.quantity.value)
                        f.quantity.value = fd.quantity.value;
                    if (this.comment.value)
                        f.deliveryComments.value = fd.deliveryComments.value;
                    if (this.selfPickup.value)
                        f.defaultSelfPickup.value = fd.deliverStatus.value == DeliveryStatus.SelfPickup || fd.deliverStatus.value == DeliveryStatus.SuccessPickedUp


                    if (f.wasChanged()) {
                        await f.save();
                        f.updateDelivery(fd);
                    }
                }
            },
        });
    }
}
@ServerController({
    allowed: Roles.distCenterAdmin,
    key: 'updateCourier'
})
export class UpdateCourier extends ActionOnRows<FamilyDeliveries> {
    clearVoulenteer = new BoolColumn(getLang(this.context).clearVolunteer);
    courier = new HelperId(this.context, getLang(this.context).volunteer);
    updateAlsoAsFixed = new BoolColumn(getLang(this.context).setAsDefaultVolunteer);
    usedCouriers: string[] = [];
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            help: () => getLang(this.context).updateVolunteerHelp,
            dialogColumns: async () => [
                this.clearVoulenteer,
                { column: this.courier, visible: () => !this.clearVoulenteer.value },
                { column: this.updateAlsoAsFixed, visible: () => !this.clearVoulenteer.value && this.context.isAllowed(Roles.admin) }

            ],
            additionalWhere: fd => fd.deliverStatus.isNotAResultStatus(),
            title: getLang(context).updateVolunteer,
            forEach: async fd => {
                if (this.clearVoulenteer.value) {
                    fd.courier.value = '';
                }
                else {
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
                }
            },

        });
        this.courier.value = '';
    }
}
@ServerController({
    allowed: Roles.distCenterAdmin,
    key: 'updateDeliveriesStatus'
})
export class UpdateDeliveriesStatus extends ActionOnFamilyDeliveries {

    status = new DeliveryStatusColumn(this.context);
    comment = new StringColumn(getLang(this.context).internalComment);
    deleteExistingComment = new BoolColumn(getLang(this.context).deleteExistingComment);

    constructor(context: Context) {
        super(context, {
            title: getLang(context).updateDeliveriesStatus,
            help: () => getSettings(context).isSytemForMlt() ? '' : getLang(this.context).updateDeliveriesStatusHelp,
            validate: async () => {
                if (this.status.value == undefined)
                    throw getLang(this.context).statusNotSelected;

            },
            validateInComponent: async c => {
                let deliveriesWithResultStatus = await this.context.for(ActiveFamilyDeliveries).count(x => x.deliverStatus.isAResultStatus().and(this.composeWhere(c.userWhere)(x)))
                if (deliveriesWithResultStatus > 0 && (this.status.value == DeliveryStatus.ReadyForDelivery || this.status.value == DeliveryStatus.SelfPickup)) {
                    if (await c.dialog.YesNoPromise(
                        getLang(this.context).thereAre + " " + deliveriesWithResultStatus + " " + getLang(this.context).deliveriesWithResultStatusSettingsTheirStatusWillOverrideThatStatusAndItWillNotBeSavedInHistory_toCreateANewDeliveryAbortThisActionAndChooseTheNewDeliveryOption_Abort)

                    )
                        throw getLang(this.context).updateCanceled;
                }
            },
            forEach: async f => {
                if (getSettings(context).isSytemForMlt() || !(this.status.value == DeliveryStatus.Frozen && f.deliverStatus.value != DeliveryStatus.ReadyForDelivery)) {
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

export class ArchiveHelper {
    showDelivered = false;
    markOnTheWayAsDelivered = new BoolColumn({ key: 'markOnTheWayAsDelivered', dataControlSettings: () => ({ visible: () => this.showDelivered }) });
    showSelfPickup = false;
    markSelfPickupAsDelivered = new BoolColumn({ key: 'markSelfPickupAsDelivered', dataControlSettings: () => ({ visible: () => this.showSelfPickup }) });
    constructor(private context: Context) { }
    getColumns() {
        return [this.markOnTheWayAsDelivered, this.markSelfPickupAsDelivered];
    }
    async initArchiveHelperBasedOnCurrentDeliveryInfo(where: EntityWhere<ActiveFamilyDeliveries>, usingSelfPickupModule: boolean) {
        let result = [];

        let onTheWay = await this.context.for(ActiveFamilyDeliveries).count(d => d.onTheWayFilter().and(where(d)));
        this.showDelivered = this.markOnTheWayAsDelivered.value = onTheWay > 0;

        if (onTheWay > 0) {

            this.markOnTheWayAsDelivered.defs.caption = use.language.markAsDeliveredFor + " " + onTheWay + " " + use.language.onTheWayDeliveries;
            result.push(this.markOnTheWayAsDelivered);
        }

        if (usingSelfPickupModule) {
            let selfPickup = await this.context.for(ActiveFamilyDeliveries).count(d => d.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup).and(where(d)));
            this.showSelfPickup = this.markSelfPickupAsDelivered.value = selfPickup > 0;
            if (selfPickup > 0) {
                this.markSelfPickupAsDelivered.defs.caption = use.language.markAsSelfPickupFor + " " + selfPickup + " " + use.language.selfPickupDeliveries;
                result.push(this.markSelfPickupAsDelivered);
            }
        }

        return result;
    }
    async forEach(f: ActiveFamilyDeliveries) {
        if (f.deliverStatus.value == DeliveryStatus.ReadyForDelivery && f.courier.value != '' && this.markOnTheWayAsDelivered.value)
            f.deliverStatus.value = DeliveryStatus.Success;
        if (f.deliverStatus.value == DeliveryStatus.SelfPickup && this.markSelfPickupAsDelivered.value)
            f.deliverStatus.value = DeliveryStatus.SuccessPickedUp;
    }

}

@ServerController({
    allowed: Roles.admin,
    key: 'archiveDeliveries'
})
export class ArchiveDeliveries extends ActionOnFamilyDeliveries {
    archiveHelper = new ArchiveHelper(this.context);
    constructor(context: Context) {
        super(context, {
            dialogColumns: async c => {
                return await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(this.composeWhere(c.userWhere), c.settings.usingSelfPickupModule.value);
            },

            title: getLang(context).archiveDeliveries,
            help: () => getLang(this.context).archiveDeliveriesHelp,
            forEach: async f => {
                await this.archiveHelper.forEach(f);
                if (DeliveryStatus.IsAResultStatus(f.deliverStatus.value))
                    f.archive.value = true;
            },

        });
        getColumnsFromObject(this).push(...getColumnsFromObject(this.archiveHelper));
    }
}

@ServerController({
    allowed: Roles.distCenterAdmin,
    key: 'updateBasketType'
})
export class UpdateBasketType extends ActionOnFamilyDeliveries {
    basketType = new BasketId(this.context);
    constructor(context: Context) {
        super(context, {
            title: getLang(context).updateBasketType,
            forEach: async f => { f.basketType.value = this.basketType.value },

        });
    }
}
@ServerController({
    allowed: Roles.distCenterAdmin,
    key: 'updateQuantity'
})
export class UpdateQuantity extends ActionOnFamilyDeliveries {
    quantity = new QuantityColumn(this.context);
    constructor(context: Context) {
        super(context, {
            title: getLang(context).updateBasketQuantity,
            forEach: async f => { f.quantity.value = this.quantity.value },
        });
    }
}

@ServerController({
    allowed: Roles.admin,
    key: 'updateDistributionCenter'
})
export class UpdateDistributionCenter extends ActionOnFamilyDeliveries {
    distributionCenter = new DistributionCenterId(this.context);
    constructor(context: Context) {
        super(context, {
            title: getLang(context).updateDistributionList,
            forEach: async f => { f.distributionCenter.value = this.distributionCenter.value },

        });
    }
}

@ServerController({
    allowed: Roles.admin,
    key: 'newDeliveryForDeliveries'
})
export class NewDelivery extends ActionOnFamilyDeliveries {
    useExistingBasket = new BoolColumn({ caption: getLang(this.context).useBusketTypeFromCurrentDelivery, defaultValue: true });
    basketType = new BasketId(this.context);
    quantity = new QuantityColumn(this.context);
    helperStrategy = new HelperStrategyColumn();
    helper = new HelperId(this.context);
    autoArchive = new BoolColumn({ caption: getLang(this.context).archiveCurrentDelivery, defaultValue: true });
    newDeliveryForAll = new BoolColumn(getLang(this.context).newDeliveryForAll);
    selfPickup = new SelfPickupStrategyColumn(true);
    archiveHelper = new ArchiveHelper(this.context);

    distributionCenter = new DistributionCenterId(this.context);
    useCurrentDistributionCenter = new BoolColumn(getLang(this.context).distributionListAsCurrentDelivery);
    constructor(context: Context) {
        super(context, {
            dialogColumns: async (component) => {
                this.basketType.value = '';
                this.quantity.value = 1;
                this.distributionCenter.value = component.dialog.distCenter.value;
                this.useCurrentDistributionCenter.value = component.dialog.distCenter.value == allCentersToken;
                return [
                    this.useExistingBasket,
                    [{ column: this.basketType, visible: () => !this.useExistingBasket.value }, { column: this.quantity, visible: () => !this.useExistingBasket.value }],
                    { column: this.useCurrentDistributionCenter, visible: () => component.dialog.distCenter.value == allCentersToken && component.dialog.hasManyCenters },
                    { column: this.distributionCenter, visible: () => component.dialog.hasManyCenters && !this.useCurrentDistributionCenter.value },
                    this.helperStrategy,
                    { column: this.helper, visible: () => this.helperStrategy.value == HelperStrategy.selectHelper },
                    ...await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(this.composeWhere(component.userWhere), component.settings.usingSelfPickupModule.value),
                    this.autoArchive,
                    this.newDeliveryForAll,
                    this.selfPickup.getDispaySettings(component.settings.usingSelfPickupModule.value)
                ]
            },
            validate: async () => {
                if (!this.useCurrentDistributionCenter.value) {
                    let dc = await this.context.for(DistributionCenters).findId(this.distributionCenter.value);
                    if (!dc)
                        throw getLang(this.context).pleaseSelectDistributionList;
                }
            },
            additionalWhere: f => {
                if (this.newDeliveryForAll)
                    return undefined;
                f.deliverStatus.isAResultStatus();
            },
            title: getLang(context).newDelivery,
            icon: 'add_shopping_cart',
            help: () => getLang(this.context).newDeliveryForDeliveriesHelp + ' ' + this.newDeliveryForAll.defs.caption,
            forEach: async existingDelivery => {
                this.archiveHelper.forEach(existingDelivery);
                if (this.autoArchive) {
                    if (DeliveryStatus.IsAResultStatus(existingDelivery.deliverStatus.value))
                        existingDelivery.archive.value = true;
                }
                if (existingDelivery.wasChanged())
                    await existingDelivery.save();

                let f = await this.context.for(Families).findId(existingDelivery.family);
                if (!f || f.status.value != FamilyStatus.Active)
                    return;
                let newDelivery = f.createDelivery(existingDelivery.distributionCenter.value);
                newDelivery._disableMessageToUsers = true;
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

            }


        });
    }
}
class HelperStrategy {
    static familyDefault = new HelperStrategy(0, use.language.volunteerByFamilyDefault, x => { });
    static currentHelper = new HelperStrategy(1, use.language.volunteerByCrrentDelivery, x => {
        x.newDelivery.courier.value = x.existingDelivery.courier.value;
    });
    static noHelper = new HelperStrategy(2, use.language.noVolunteer, x => {
        x.newDelivery.courier.value = '';
    });
    static selectHelper = new HelperStrategy(3, use.language.selectVolunteer, x => {
        x.newDelivery.courier.value = x.helper;
    });
    constructor(public id: number, public caption: string, public applyTo: (args: { existingDelivery: ActiveFamilyDeliveries, newDelivery: ActiveFamilyDeliveries, helper: string }) => void) {

    }
}
class HelperStrategyColumn extends ValueListColumn<HelperStrategy>{
    constructor() {
        super(HelperStrategy, {
            caption: use.language.volunteer,
            defaultValue: HelperStrategy.familyDefault,
            dataControlSettings: () => ({
                valueList: this.getOptions()
            })
        })
    }
}
