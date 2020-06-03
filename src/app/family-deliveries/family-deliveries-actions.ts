import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, FilterBase, ValueListColumn } from "@remult/core";
import { Roles } from "../auth/roles";
import { DistributionCenterId, DistributionCenters, allCentersToken } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { Groups } from "../manage/manage.component";
import { translate, use, getLang } from "../translate";
import { ActionOnRows, actionDialogNeeds, ActionOnRowsArgs, filterActionOnServer, serverUpdateInfo, pagedRowsIterator } from "../families/familyActionsWiring";
import { async } from "@angular/core/testing";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus, DeliveryStatusColumn } from "../families/DeliveryStatus";
import { Families } from "../families/families";
import { BasketId, QuantityColumn } from "../families/BasketType";
import { FamilyStatus, FamilyStatusColumn } from "../families/FamilyStatus";
import { SelfPickupStrategyColumn } from "../families/familyActions";
import { AsignFamilyComponent } from "../asign-family/asign-family.component";
import { PromiseThrottle } from "../import-from-excel/import-from-excel.component";





class DeleteDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {
    updateFamilyStatus = new BoolColumn(getLang(this.context).updateFamilyStatus);
    status = new FamilyStatusColumn(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [this.updateFamilyStatus, this.status],
            dialogColumns: c => [
                this.updateFamilyStatus,
                { column: this.status, visible: () => this.updateFamilyStatus.value }
            ],
            title: getLang(context).deleteDeliveries,
            help: () => translate(getLang(this.context).deleteDeliveriesHelp),
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
    byCurrentCourier = new BoolColumn(use.language.updateCourierByCurrentCourier);
    courier = new HelperId(this.context, translate(use.language.defaultVolunteer));
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
            title: translate(getLang(context).updateDefaultVolunteer),
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
    clearVoulenteer = new BoolColumn(getLang(this.context).clearVolunteer);
    courier = new HelperId(this.context, getLang(this.context).volunteer);
    updateAlsoAsFixed = new BoolColumn(getLang(this.context).setAsDefaultVolunteer);
    usedCouriers: string[] = [];
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            help: () => getLang(this.context).updateVolunteerHelp,
            columns: () => [this.clearVoulenteer, this.courier, this.updateAlsoAsFixed],
            dialogColumns: () => [
                this.clearVoulenteer,
                { column: this.courier, visible: () => !this.clearVoulenteer.value },
                { column: this.updateAlsoAsFixed, visible: () => !this.clearVoulenteer.value }

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
            onEnd: async () => {
                if (this.courier.value)
                    await AsignFamilyComponent.RefreshRoute(this.courier.value, true);
            }
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
            allowed: Roles.admin,
            columns: () => [this.status, this.comment, this.deleteExistingComment],
            title: getLang(context).updateDeliveriesStatus,
            help: () => getLang(this.context).updateDeliveriesStatusHelp,
            validate: async () => {
                if (this.status.value == undefined)
                    throw getLang(this.context).statusNotSelected;

            },
            validateInComponent: async c => {
                if (this.status.value == DeliveryStatus.ReadyForDelivery || this.status.value == DeliveryStatus.SelfPickup) {
                    if (await c.dialog.YesNoPromise(getLang(this.context).youveSelectedToUpdateStatus + " " + this.status.value.caption + " " + getLang(this.context).youveProbablyMeantNewDelivery))
                        throw getLang(this.context).updateCanceled;
                    if (await c.dialog.YesNoPromise(getLang(this.context).updateDeliveredStatusesTo + " " + this.status.value.caption + getLang(this.context).willNotSaveHistoryDoYouWantToStop))
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



class ArchiveDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {

    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
            columns: () => [],
            title: getLang(context).archiveDeliveries,
            help: () => getLang(this.context).archiveDeliveriesHelp,
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
            title: getLang(context).updateBasketType,
            forEach: async f => { f.basketType.value = this.basketType.value },

        });
    }
}
class UpdateQuantity extends ActionOnRows<ActiveFamilyDeliveries> {
    quantity = new QuantityColumn(this.context);
    constructor(context: Context) {
        super(context, FamilyDeliveries, {
            allowed: Roles.admin,
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

    distributionCenter = new DistributionCenterId(this.context);
    useCurrentDistributionCenter = new BoolColumn(getLang(this.context).distributionListAsCurrentDelivery);
    usedCouriers: string[] = [];
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
                        throw getLang(this.context).pleaseSelectDistributionList;
                }
            },
            additionalWhere: f => {
                if (this.newDeliveryForAll)
                    return undefined;
                f.deliverStatus.isAResultStatus();
            },
            title: getLang(context).newDelivery,
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
                if (newDelivery.courier.value && !this.usedCouriers.includes(newDelivery.courier.value)) {
                    this.usedCouriers.push(newDelivery.courier.value);
                }
                if ((await newDelivery.duplicateCount()) == 0)
                    await newDelivery.save();
                if (this.autoArchive) {
                    if (DeliveryStatus.IsAResultStatus(existingDelivery.deliverStatus.value))
                        existingDelivery.archive.value = true;
                    await existingDelivery.save();
                }
            },
            onEnd: async () => {
                let t = new PromiseThrottle(10);
                for (const c of this.usedCouriers) {
                    await t.push(AsignFamilyComponent.RefreshRoute(c, true, this.context));
                }
                await t.done();
            }

        });
    }
}
class HelperStrategy {
    static familyDefault = new HelperStrategy(0, translate(use.language.volunteerByFamilyDefault), x => { });
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
    UpdateFixedCourier,
    DeleteDeliveries
];
