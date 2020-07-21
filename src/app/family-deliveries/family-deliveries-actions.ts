import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, FilterBase, ValueListColumn } from "@remult/core";
import { Roles } from "../auth/roles";
import { DistributionCenterId, DistributionCenters, allCentersToken } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { Groups } from "../manage/manage.component";
import { use, getLang } from "../translate";
import { ActionOnRows, actionDialogNeeds, ActionOnRowsArgs, filterActionOnServer, serverUpdateInfo, pagedRowsIterator } from "../families/familyActionsWiring";
import { async } from "@angular/core/testing";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus, DeliveryStatusColumn } from "../families/DeliveryStatus";
import { Families } from "../families/families";
import { BasketId, QuantityColumn } from "../families/BasketType";
import { FamilyStatus, FamilyStatusColumn } from "../families/FamilyStatus";
import { SelfPickupStrategyColumn, updateGroup, UpdateArea, UpdateStatus, bridge } from "../families/familyActions";
import { AsignFamilyComponent } from "../asign-family/asign-family.component";
import { PromiseThrottle } from "../import-from-excel/import-from-excel.component";





export class DeleteDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {
    updateFamilyStatus = new BoolColumn(getLang(this.context).updateFamilyStatus);
    status = new FamilyStatusColumn(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [this.updateFamilyStatus, this.status],
            dialogColumns: async c => [
                this.updateFamilyStatus,
                { column: this.status, visible: () => this.updateFamilyStatus.value }
            ],
            title: getLang(context).deleteDeliveries,
            help: () => getLang(this.context).deleteDeliveriesHelp,
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
class UpdateFamilyDefaults extends ActionOnRows<FamilyDeliveries> {
    byCurrentCourier = new BoolColumn(use.language.defaultVolunteer);
    basketType = new BoolColumn(use.language.defaultBasketType);
    quantity = new BoolColumn(use.language.defaultQuantity);
    comment = new BoolColumn(use.language.commentForVolunteer);
    selfPickup = new BoolColumn(use.language.selfPickup);


    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            help: () => use.language.updateFamilyDefaultsHelp,
            columns: () => [this.basketType, this.quantity, this.byCurrentCourier, this.comment],
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
export class UpdateCourier extends ActionOnRows<FamilyDeliveries> {
    clearVoulenteer = new BoolColumn(getLang(this.context).clearVolunteer);
    courier = new HelperId(this.context, getLang(this.context).volunteer);
    updateAlsoAsFixed = new BoolColumn(getLang(this.context).setAsDefaultVolunteer);
    usedCouriers: string[] = [];
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            help: () => getLang(this.context).updateVolunteerHelp,
            columns: () => [this.clearVoulenteer, this.courier, this.updateAlsoAsFixed],
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
export class UpdateDeliveriesStatus extends ActionOnRows<ActiveFamilyDeliveries> {

    status = new DeliveryStatusColumn(this.context);
    comment = new StringColumn(getLang(this.context).internalComment);
    deleteExistingComment = new BoolColumn(getLang(this.context).deleteExistingComment);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.status, this.comment, this.deleteExistingComment],
            title: getLang(context).updateDeliveriesStatus,
            help: () => getLang(this.context).updateDeliveriesStatusHelp,
            validate: async () => {
                if (this.status.value == undefined)
                    throw getLang(this.context).statusNotSelected;

            },
            validateInComponent: async c => {
                let info = await c.buildActionInfo(undefined);
                let deliveriesWithResultStatus = await this.context.for(ActiveFamilyDeliveries).count(x => x.deliverStatus.isAResultStatus().and(info.where(x)))
                if (deliveriesWithResultStatus > 0 && (this.status.value == DeliveryStatus.ReadyForDelivery || this.status.value == DeliveryStatus.SelfPickup)) {
                    if (await c.dialog.YesNoPromise(
                        getLang(this.context).thereAre + " " + deliveriesWithResultStatus + " " + getLang(this.context).deliveriesWithResultStatusSettingsTheirStatusWillOverrideThatStatusAndItWillNotBeSavedInHistory_toCreateANewDeliveryAbortThisActionAndChooseTheNewDeliveryOption_Abort)

                    )
                        throw getLang(this.context).updateCanceled;
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

class ArchiveHelper {
    markOnTheWayAsDelivered = new BoolColumn();
    markSelfPickupAsDelivered = new BoolColumn();
    constructor(private context: Context) { }
    getColumns() {
        return [this.markOnTheWayAsDelivered, this.markSelfPickupAsDelivered];
    }
    async getDialogColumns(c: actionDialogNeeds<ActiveFamilyDeliveries>) {
        let result = [];
        let filter = await c.buildActionInfo(undefined);
        let onTheWay = await this.context.for(ActiveFamilyDeliveries).count(d => d.onTheWayFilter().and(filter.where(d)));
        this.markOnTheWayAsDelivered.value = onTheWay > 0;
        if (onTheWay > 0) {

            this.markOnTheWayAsDelivered.defs.caption = use.language.markAsDeliveredFor + " " + onTheWay + " " + use.language.onTheWayDeliveries;
            result.push(this.markOnTheWayAsDelivered);
        }

        if (c.settings.usingSelfPickupModule) {
            let selfPickup = await this.context.for(ActiveFamilyDeliveries).count(d => d.deliverStatus.isEqualTo(DeliveryStatus.SelfPickup).and(filter.where(d)));
            this.markSelfPickupAsDelivered.value = selfPickup > 0;
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

class ArchiveDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {
    archiveHelper = new ArchiveHelper(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => this.archiveHelper.getColumns(),
            dialogColumns: async c => {
                return await this.archiveHelper.getDialogColumns(c);
            },

            title: getLang(context).archiveDeliveries,
            help: () => getLang(this.context).archiveDeliveriesHelp,
            forEach: async f => {
                await this.archiveHelper.forEach(f);
                if (DeliveryStatus.IsAResultStatus(f.deliverStatus.value))
                    f.archive.value = true;
            },

        });
    }
}

class UpdateBasketType extends ActionOnRows<ActiveFamilyDeliveries> {
    basketType = new BasketId(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.basketType],
            title: getLang(context).updateBasketType,
            forEach: async f => { f.basketType.value = this.basketType.value },

        });
    }
}
class UpdateQuantity extends ActionOnRows<ActiveFamilyDeliveries> {
    quantity = new QuantityColumn(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.distCenterAdmin,
            columns: () => [this.quantity],
            title: getLang(context).updateBasketQuantity,
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
            title: getLang(context).updateDistributionList,
            forEach: async f => { f.distributionCenter.value = this.distributionCenter.value },

        });
    }
}

export class NewDelivery extends ActionOnRows<ActiveFamilyDeliveries> {
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
                this.useCurrentDistributionCenter,
                ...this.archiveHelper.getColumns()
            ],
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
                    ...await this.archiveHelper.getDialogColumns(component),
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
            icon:'add_shopping_cart',
            help: () => getLang(this.context).newDeliveryForDeliveriesHelp + ' ' + this.newDeliveryForAll.defs.caption,
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

                this.archiveHelper.forEach(existingDelivery);
                if (this.autoArchive) {
                    if (DeliveryStatus.IsAResultStatus(existingDelivery.deliverStatus.value))
                        existingDelivery.archive.value = true;
                }
                if (existingDelivery.wasChanged())
                    await existingDelivery.save();

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



export const delvieryActions = () => [
    NewDelivery,
    ArchiveDeliveries,
    UpdateDeliveriesStatus,
    UpdateBasketType,
    UpdateQuantity,
    UpdateDistributionCenter,
    UpdateCourier,
    UpdateFamilyDefaults,
    DeleteDeliveries,
    bridge(updateGroup), bridge(UpdateArea), bridge(UpdateStatus)
];
