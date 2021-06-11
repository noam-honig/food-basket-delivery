import { Context, AndFilter, EntityWhere } from "@remult/core";
import { Roles } from "../auth/roles";
import { DistributionCenters } from "../manage/distribution-centers";
import { HelperId, Helpers, HelpersBase } from "../helpers/helpers";
import { use, Field, FieldType } from "../translate";
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
import { DataAreaFieldsSetting, DataControl, InputField } from "@remult/angular";

import { getControllerDefs, ValueListFieldType } from "@remult/core/src/remult3";


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
    @Field({ translation: l => l.updateFamilyStatus })
    updateFamilyStatus: boolean;
    @Field()
    status: FamilyStatus;

    constructor(context: Context) {
        super(context, {
            dialogColumns: async c => [
                this.$.updateFamilyStatus,
                { field: this.$.status, visible: () => this.updateFamilyStatus }
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
    @Field({ translation: l => l.defaultVolunteer })
    byCurrentCourier: boolean;
    @Field({ translation: l => l.defaultBasketType })
    basketType: boolean;
    @Field({ translation: l => l.defaultQuantity })
    quantity: boolean;
    @Field({ translation: l => l.commentForVolunteer })
    comment: boolean;
    @Field({ translation: l => l.selfPickup })
    selfPickup: boolean;



    constructor(context: Context) {
        super(context, ActiveFamilyDeliveries, {
            help: () => use.language.updateFamilyDefaultsHelp,
            dialogColumns: async (c) => [
                this.$.basketType, this.$.quantity, this.$.byCurrentCourier, this.$.comment, {
                    field: this.$.selfPickup, visible: () => c.settings.usingSelfPickupModule
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
    @Field({ translation: l => l.clearVolunteer })
    clearVoulenteer: boolean;
    @Field()
    courier: HelpersBase;
    @Field({ translation: l => l.setAsDefaultVolunteer })
    updateAlsoAsFixed: boolean;
    usedCouriers: string[] = [];
    constructor(context: Context) {
        super(context, ActiveFamilyDeliveries, {
            help: () => getLang(this.context).updateVolunteerHelp,
            dialogColumns: async () => [
                this.$.clearVoulenteer,
                { field: this.$.courier, visible: () => !this.clearVoulenteer },
                { field: this.$.updateAlsoAsFixed, visible: () => !this.clearVoulenteer && this.context.isAllowed(Roles.admin) }

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

    @Field()
    status: DeliveryStatus;
    @Field({ translation: l => l.internalComment })
    comment: string;
    @Field({ translation: l => l.deleteExistingComment })
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

@FieldType({
    valueConverter: {
        fromJson: x => {
            return Object.assign(new ArchiveHelper(), x)
        }
    }
})
export class ArchiveHelper {
    @Field()
    markOnTheWayAsDelivered: boolean;
    @Field()
    markSelfPickupAsDelivered: boolean;


    get $() { return getControllerDefs(this).fields }
    async initArchiveHelperBasedOnCurrentDeliveryInfo(context: Context, where: EntityWhere<ActiveFamilyDeliveries>, usingSelfPickupModule: boolean) {
        let result: DataAreaFieldsSetting<any>[] = [];
        let repo = context.for(ActiveFamilyDeliveries);

        let onTheWay = await repo.count([d => FamilyDeliveries.onTheWayFilter(d, context), where]);

        if (onTheWay > 0) {
            this.markOnTheWayAsDelivered = true;
            result.push({
                field: this.$.markOnTheWayAsDelivered,
                caption: use.language.markAsDeliveredFor + " " + onTheWay + " " + use.language.onTheWayDeliveries
            });
        }

        if (usingSelfPickupModule) {
            let selfPickup = await repo.count([d => d.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup), where]);

            if (selfPickup > 0) {
                this.markSelfPickupAsDelivered = true;
                result.push({
                    field: this.$.markSelfPickupAsDelivered,
                    caption: use.language.markAsSelfPickupFor + " " + selfPickup + " " + use.language.selfPickupDeliveries
                });
            }
        }

        return result;
    }
    async forEach(f: ActiveFamilyDeliveries) {
        await f.$.courier.load()
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
    @Field()
    archiveHelper:ArchiveHelper = new ArchiveHelper();
    constructor(context: Context) {
        super(context, {
            dialogColumns: async c => {
                return await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(this.context, this.composeWhere(c.userWhere), c.settings.usingSelfPickupModule);
            },

            title: getLang(context).archiveDeliveries,
            help: () => getLang(this.context).archiveDeliveriesHelp,
            forEach: async f => {
                await this.archiveHelper.forEach(f);
                if (f.deliverStatus.IsAResultStatus())
                    f.archive = true;
            },

        });
    }
}

@ServerController({
    allowed: Roles.distCenterAdmin,
    key: 'updateBasketType'
})
export class UpdateBasketType extends ActionOnFamilyDeliveries {
    @Field()
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
    @Field()
    distributionCenter: DistributionCenters;

    constructor(context: Context) {
        super(context, {
            title: getLang(context).updateDistributionList,
            forEach: async f => { f.distributionCenter = this.distributionCenter },
        });
    }
}

@FieldType({
    defaultValue: () => HelperStrategy.familyDefault,
    translation: l => l.volunteer
})
@ValueListFieldType(HelperStrategy)
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
    @Field({ translation: l => l.useBusketTypeFromCurrentDelivery })
    useExistingBasket: boolean = true;
    @Field()
    basketType: BasketType;
    @QuantityColumn()
    quantity: number;
    @Field()
    helperStrategy: HelperStrategy;
    @Field()
    helper: HelpersBase;
    @Field({ translation: l => l.archiveCurrentDelivery })
    autoArchive: boolean = true;
    @Field({ translation: l => l.newDeliveryForAll })
    newDeliveryForAll: boolean;
    @Field()
    selfPickup: SelfPickupStrategy;
    @Field()
    archiveHelper:ArchiveHelper = new ArchiveHelper();

    @Field()
    distributionCenter: DistributionCenters;

    @Field({ translation: l => l.distributionListAsCurrentDelivery })
    useCurrentDistributionCenter: boolean;


    constructor(context: Context) {
        super(context, {
            dialogColumns: async (component) => {
                this.basketType = await BasketType.getDefaultBasketType(this.context);
                this.quantity = 1;
                this.distributionCenter = component.dialog.distCenter;
                this.useCurrentDistributionCenter = component.dialog.distCenter == null;
                return [
                    this.$.useExistingBasket,
                    [
                        { field: this.$.basketType, visible: () => !this.useExistingBasket },
                        { field: this.$.quantity, visible: () => !this.useExistingBasket }
                    ],
                    { field: this.$.useCurrentDistributionCenter, visible: () => component.dialog.distCenter == null && component.dialog.hasManyCenters },
                    { field: this.$.distributionCenter, visible: () => component.dialog.hasManyCenters && !this.useCurrentDistributionCenter },
                    this.helperStrategy,
                    { field: this.$.helper, visible: () => this.helperStrategy == HelperStrategy.selectHelper },
                    ...await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(context, this.composeWhere(component.userWhere), component.settings.usingSelfPickupModule),
                    this.$.autoArchive,
                    this.$.newDeliveryForAll,
                    { field: this.$.selfPickup, visible: () => component.settings.usingSelfPickupModule }
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