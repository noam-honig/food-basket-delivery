import { Context, AndFilter, EntityWhere, Column, EntityWhereItem, Storable, getControllerDefs } from "@remult/core";
import { Roles } from "../auth/roles";
import { DistributionCenters } from "../manage/distribution-centers";
import { HelperId, Helpers, HelpersBase } from "../helpers/helpers";
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { ActionOnRows, ActionOnRowsArgs } from "../families/familyActionsWiring";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { Families } from "../families/families";
import { BasketType, defaultBasketType, QuantityColumn } from "../families/BasketType";
import { FamilyStatus } from "../families/FamilyStatus";
import { SelfPickupStrategy } from "../families/familyActions";
import { getSettings } from "../manage/ApplicationSettings";
import { ServerController } from "@remult/core";
import { DataControl, InputControl } from "../../../../radweb/projects/angular";
import { ValueListValueConverter } from "../../../../radweb/projects/core/src/column";


export abstract class ActionOnFamilyDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context, args: ActionOnRowsArgs<ActiveFamilyDeliveries>) {
        super(context, ActiveFamilyDeliveries, buildArgsForFamilyDeliveries(args, context));
    }
}
function buildArgsForFamilyDeliveries(args: ActionOnRowsArgs<ActiveFamilyDeliveries>, context: Context) {
    if (args.orderBy)
        throw "didn't expect order by";
    args.orderBy = x => [x.createDate.descending(), x.id]//to handle the case where paging is used, and items are added with different ids
    let originalForEach = args.forEach;
    args.forEach = async fd => {
        fd._disableMessageToUsers = true;
        await originalForEach(fd);
    };
    let originalWhere = args.additionalWhere;
    if (originalWhere) {
        args.additionalWhere = x => new AndFilter(originalWhere(x), FamilyDeliveries.isAllowedForUser(x, context));
    }
    else args.additionalWhere = x => FamilyDeliveries.isAllowedForUser(x, context);
    return args;
}


@ServerController({
    allowed: Roles.admin,
    key: 'deleteDeliveries'
})
export class DeleteDeliveries extends ActionOnFamilyDeliveries {
    @Column({ caption: use.language.updateFamilyStatus })
    updateFamilyStatus: boolean;
    @Column()
    status: FamilyStatus;
    get $() { return getControllerDefs(this).columns };
    constructor(context: Context) {
        super(context, {
            dialogColumns: async c => [
                this.$.updateFamilyStatus,
                { column: this.$.status, visible: () => this.updateFamilyStatus }
            ],
            title: getLang(context).deleteDeliveries,
            help: () => getLang(this.context).deleteDeliveriesHelp,
            forEach: async fd => {
                await fd.delete();
                if (this.updateFamilyStatus) {
                    let f = await this.context.for(Families).findId(fd.family);
                    f.status = this.status;
                    await f.save();
                }
            },
            additionalWhere: f => DeliveryStatus.isNotAResultStatus(f.deliverStatus)
        });
    }
}
@ServerController({
    allowed: Roles.admin,
    key: 'UpdateFamilyDefaults'
})
export class UpdateFamilyDefaults extends ActionOnRows<ActiveFamilyDeliveries> {
    @Column({ caption: use.language.defaultVolunteer })
    byCurrentCourier: boolean;
    @Column({ caption: use.language.defaultBasketType })
    basketType: boolean;
    @Column({ caption: use.language.defaultQuantity })
    quantity: boolean;
    @Column({ caption: use.language.commentForVolunteer })
    comment: boolean;
    @Column({ caption: use.language.selfPickup })
    selfPickup: boolean;

    get $() { return getControllerDefs(this).columns };

    constructor(context: Context) {
        super(context, ActiveFamilyDeliveries, {
            help: () => use.language.updateFamilyDefaultsHelp,
            dialogColumns: async (c) => [
                this.$.basketType, this.$.quantity, this.$.byCurrentCourier, this.$.comment, {
                    column: this.$.selfPickup, visible: () => c.settings.usingSelfPickupModule
                }
            ],

            title: getLang(context).updateFamilyDefaults,
            forEach: async fd => {


                let f = await this.context.for(Families).findId(fd.family);
                if (f) {
                    if (this.byCurrentCourier) {
                        if (fd.courier)
                            f.fixedCourier = fd.courier;
                    }
                    if (this.basketType)
                        f.basketType = fd.basketType;
                    if (this.quantity)
                        f.quantity = fd.quantity;
                    if (this.comment)
                        f.deliveryComments = fd.deliveryComments;
                    if (this.selfPickup)
                        f.defaultSelfPickup = fd.deliverStatus == DeliveryStatus.SelfPickup || fd.deliverStatus == DeliveryStatus.SuccessPickedUp


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
export class UpdateCourier extends ActionOnRows<ActiveFamilyDeliveries> {
    @Column({ caption: use.language.clearVolunteer })
    clearVoulenteer: boolean;
    @Column()
    courier: HelpersBase;
    @Column({ caption: use.language.setAsDefaultVolunteer })
    updateAlsoAsFixed: boolean;
    get $() { return getControllerDefs(this).columns };
    usedCouriers: string[] = [];
    constructor(context: Context) {
        super(context, ActiveFamilyDeliveries, {
            help: () => getLang(this.context).updateVolunteerHelp,
            dialogColumns: async () => [
                this.$.clearVoulenteer,
                { column: this.$.courier, visible: () => !this.clearVoulenteer },
                { column: this.$.updateAlsoAsFixed, visible: () => !this.clearVoulenteer && this.context.isAllowed(Roles.admin) }

            ],
            additionalWhere: fd => DeliveryStatus.isNotAResultStatus(fd.deliverStatus),
            title: getLang(context).updateVolunteer,
            forEach: async fd => {
                if (this.clearVoulenteer) {
                    fd.courier = null;
                }
                else {
                    fd.courier = this.courier;
                    if (this.updateAlsoAsFixed) {
                        let f = await this.context.for(Families).findId(fd.family);
                        if (f) {
                            f.fixedCourier = this.courier;
                            if (f.wasChanged()) {
                                await f.save();
                                f.updateDelivery(fd);
                            }
                        }
                    }
                }
            },

        });
        this.courier = null;
    }
}
@ServerController({
    allowed: Roles.distCenterAdmin,
    key: 'updateDeliveriesStatus'
})
export class UpdateDeliveriesStatus extends ActionOnFamilyDeliveries {

    @Column()
    status: DeliveryStatus;
    @Column({ caption: use.language.internalComment })
    comment: string;
    @Column({ caption: use.language.deleteExistingComment })
    deleteExistingComment: boolean;


    constructor(context: Context) {
        super(context, {
            title: getLang(context).updateDeliveriesStatus,
            help: () => getSettings(context).isSytemForMlt() ? '' : getLang(this.context).updateDeliveriesStatusHelp,
            validate: async () => {
                if (this.status == undefined)
                    throw getLang(this.context).statusNotSelected;

            },
            validateInComponent: async c => {
                let deliveriesWithResultStatus = await this.context.for(ActiveFamilyDeliveries).count([x => DeliveryStatus.isAResultStatus(x.deliverStatus), c.userWhere, this.args.additionalWhere])
                if (deliveriesWithResultStatus > 0 && (this.status == DeliveryStatus.ReadyForDelivery || this.status == DeliveryStatus.SelfPickup)) {
                    if (await c.dialog.YesNoPromise(
                        getLang(this.context).thereAre + " " + deliveriesWithResultStatus + " " + getLang(this.context).deliveriesWithResultStatusSettingsTheirStatusWillOverrideThatStatusAndItWillNotBeSavedInHistory_toCreateANewDeliveryAbortThisActionAndChooseTheNewDeliveryOption_Abort)

                    )
                        throw getLang(this.context).updateCanceled;
                }
            },
            forEach: async f => {
                if (getSettings(context).isSytemForMlt() || !(this.status == DeliveryStatus.Frozen && f.deliverStatus != DeliveryStatus.ReadyForDelivery)) {
                    f.deliverStatus = this.status;
                    if (this.deleteExistingComment) {
                        f.internalDeliveryComment = '';
                    }
                    if (this.comment) {
                        if (f.internalDeliveryComment)
                            f.internalDeliveryComment += ", ";
                        f.internalDeliveryComment += this.comment;
                    }

                }
            }

        });

    }
}

export class ArchiveHelper {
    showDelivered = false;
    markOnTheWayAsDelivered = new InputControl<boolean>({ dataType: Boolean, key: 'markOnTheWayAsDelivered', visible: () => this.showDelivered });
    showSelfPickup = false;
    markSelfPickupAsDelivered = new InputControl<boolean>({ dataType: Boolean, key: 'markSelfPickupAsDelivered', visible: () => this.showSelfPickup });

    constructor(private context: Context) { }
    getColumns() {
        return [this.markOnTheWayAsDelivered, this.markSelfPickupAsDelivered];
    }
    async initArchiveHelperBasedOnCurrentDeliveryInfo(where: EntityWhere<ActiveFamilyDeliveries>, usingSelfPickupModule: boolean) {
        let result = [];
        let repo = this.context.for(ActiveFamilyDeliveries);

        let onTheWay = await repo.count(d => FamilyDeliveries.onTheWayFilter(d, this.context).and(repo.translateWhereToFilter(where)));
        this.showDelivered = this.markOnTheWayAsDelivered.value = onTheWay > 0;

        if (onTheWay > 0) {

            this.markOnTheWayAsDelivered.defs.caption = use.language.markAsDeliveredFor + " " + onTheWay + " " + use.language.onTheWayDeliveries;
            result.push(this.markOnTheWayAsDelivered);
        }

        if (usingSelfPickupModule) {
            let selfPickup = await repo.count(d => d.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup).and(repo.translateWhereToFilter(where)));
            this.showSelfPickup = this.markSelfPickupAsDelivered.value = selfPickup > 0;
            if (selfPickup > 0) {
                this.markSelfPickupAsDelivered.defs.caption = use.language.markAsSelfPickupFor + " " + selfPickup + " " + use.language.selfPickupDeliveries;
                result.push(this.markSelfPickupAsDelivered);
            }
        }

        return result;
    }
    async forEach(f: ActiveFamilyDeliveries) {
        if (f.deliverStatus == DeliveryStatus.ReadyForDelivery && f.courier && this.markOnTheWayAsDelivered)
            f.deliverStatus = DeliveryStatus.Success;
        if (f.deliverStatus == DeliveryStatus.SelfPickup && this.markSelfPickupAsDelivered)
            f.deliverStatus = DeliveryStatus.SuccessPickedUp;
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
                return await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(this.composeWhere(c.userWhere), c.settings.usingSelfPickupModule);
            },

            title: getLang(context).archiveDeliveries,
            help: () => getLang(this.context).archiveDeliveriesHelp,
            forEach: async f => {
                await this.archiveHelper.forEach(f);
                if (f.deliverStatus.IsAResultStatus())
                    f.archive = true;
            },

        });
        //   getColumnsFromObject(this).push(...getColumnsFromObject(this.archiveHelper));
    }
}

@ServerController({
    allowed: Roles.distCenterAdmin,
    key: 'updateBasketType'
})
export class UpdateBasketType extends ActionOnFamilyDeliveries {
    @Column()
    basketType: BasketType;

    constructor(context: Context) {
        super(context, {
            title: getLang(context).updateBasketType,
            forEach: async f => { f.basketType = this.basketType },

        });
    }
}
@ServerController({
    allowed: Roles.distCenterAdmin,
    key: 'updateQuantity'
})
export class UpdateQuantity extends ActionOnFamilyDeliveries {
    @QuantityColumn()
    quantity: number;

    constructor(context: Context) {
        super(context, {
            title: getLang(context).updateBasketQuantity,
            forEach: async f => { f.quantity = this.quantity },
        });
    }
}

@ServerController({
    allowed: Roles.admin,
    key: 'updateDistributionCenter'
})
export class UpdateDistributionCenter extends ActionOnFamilyDeliveries {
    @Column()
    distributionCenter: DistributionCenters;

    constructor(context: Context) {
        super(context, {
            title: getLang(context).updateDistributionList,
            forEach: async f => { f.distributionCenter = this.distributionCenter },
        });
    }
}

@Storable({
    valueConverter: () => new ValueListValueConverter(HelperStrategy),
    defaultValue: () => HelperStrategy.familyDefault,
    caption: use.language.volunteer
})
class HelperStrategy {
    static familyDefault = new HelperStrategy(0, use.language.volunteerByFamilyDefault, x => { });
    static currentHelper = new HelperStrategy(1, use.language.volunteerByCrrentDelivery, x => {
        x.newDelivery.courier = x.existingDelivery.courier;
    });
    static noHelper = new HelperStrategy(2, use.language.noVolunteer, x => {
        x.newDelivery.courier = null;
    });
    static selectHelper = new HelperStrategy(3, use.language.selectVolunteer, x => {
        x.newDelivery.courier = x.helper;
    });
    constructor(public id: number, public caption: string, public applyTo: (args: { existingDelivery: ActiveFamilyDeliveries, newDelivery: ActiveFamilyDeliveries, helper: HelpersBase, context: Context }) => void) {

    }
}

@ServerController({
    allowed: Roles.admin,
    key: 'newDeliveryForDeliveries'
})
export class NewDelivery extends ActionOnFamilyDeliveries {
    @Column({ caption: use.language.useBusketTypeFromCurrentDelivery })
    useExistingBasket: boolean = true;
    @Column()
    basketType: BasketType;
    @QuantityColumn()
    quantity: number;
    @Column()
    helperStrategy: HelperStrategy;
    @Column()
    helper: HelpersBase;
    @Column({ caption: use.language.archiveCurrentDelivery })
    autoArchive: boolean = true;
    @Column({ caption: use.language.newDeliveryForAll })
    newDeliveryForAll: boolean;
    @Column()
    selfPickup: SelfPickupStrategy;

    archiveHelper = new ArchiveHelper(this.context);

    @Column()
    distributionCenter: DistributionCenters;

    @Column({ caption: use.language.distributionListAsCurrentDelivery })
    useCurrentDistributionCenter: boolean;
    get $() {
        return getControllerDefs(this).columns;
    }

    constructor(context: Context) {
        super(context, {
            dialogColumns: async (component) => {
                this.basketType = context.get(defaultBasketType);
                this.quantity = 1;
                this.distributionCenter = component.dialog.distCenter;
                this.useCurrentDistributionCenter = component.dialog.distCenter == null;
                return [
                    this.useExistingBasket,
                    [{ column: this.basketType, visible: () => !this.useExistingBasket }, { column: this.quantity, visible: () => !this.useExistingBasket }],
                    { column: this.useCurrentDistributionCenter, visible: () => component.dialog.distCenter == null && component.dialog.hasManyCenters },
                    { column: this.distributionCenter, visible: () => component.dialog.hasManyCenters && !this.useCurrentDistributionCenter },
                    this.helperStrategy,
                    { column: this.helper, visible: () => this.helperStrategy == HelperStrategy.selectHelper },
                    ...await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(this.composeWhere(component.userWhere), component.settings.usingSelfPickupModule),
                    this.autoArchive,
                    this.newDeliveryForAll,
                    {
                        column: this.selfPickup, visible: () => component.settings.usingSelfPickupModule
                    }
                ]
            },
            validate: async () => {
                if (!this.useCurrentDistributionCenter) {
                    
                    if (!this.distributionCenter)
                        throw getLang(this.context).pleaseSelectDistributionList;
                }
            },
            additionalWhere: f => {
                if (this.newDeliveryForAll)
                    return undefined;
                DeliveryStatus.isAResultStatus(f.deliverStatus);
            },
            title: getLang(context).newDelivery,
            icon: 'add_shopping_cart',
            help: () => getLang(this.context).newDeliveryForDeliveriesHelp + ' ' + this.$.newDeliveryForAll.defs.caption,
            forEach: async existingDelivery => {
                this.archiveHelper.forEach(existingDelivery);
                if (this.autoArchive) {
                    if (existingDelivery.deliverStatus.IsAResultStatus())
                        existingDelivery.archive = true;
                }
                if (existingDelivery.wasChanged())
                    await existingDelivery.save();

                let f = await this.context.for(Families).findId(existingDelivery.family);
                if (!f || f.status != FamilyStatus.Active)
                    return;
                let newDelivery = f.createDelivery(existingDelivery.distributionCenter);
                newDelivery._disableMessageToUsers = true;
                newDelivery.copyFrom(existingDelivery);
                if (!this.useExistingBasket) {
                    newDelivery.basketType = this.basketType;
                    newDelivery.quantity = this.quantity;
                }
                newDelivery.distributionCenter = this.distributionCenter;
                if (this.useCurrentDistributionCenter)
                    newDelivery.distributionCenter = existingDelivery.distributionCenter;
                this.helperStrategy.applyTo({ existingDelivery, newDelivery, helper: this.helper, context });
                this.selfPickup.applyTo({ existingDelivery, newDelivery, family: f });

                if ((await newDelivery.duplicateCount()) == 0)
                    await newDelivery.save();

            }


        });
    }
}