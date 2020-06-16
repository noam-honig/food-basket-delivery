import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, ValueListColumn, DataControlInfo } from "@remult/core";
import { FamiliesComponent } from "./families.component";
import { Families, GroupsColumn } from "./families";
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
import { use, getLang } from "../translate";
import { settings } from "cluster";
import { PromiseThrottle } from "../import-from-excel/import-from-excel.component";
import { AsignFamilyComponent } from "../asign-family/asign-family.component";

class NewDelivery extends ActionOnRows<Families> {
    useFamilyBasket = new BoolColumn({ caption: getLang(this.context).useFamilyDefaultBasketType, defaultValue: true });
    basketType = new BasketId(this.context);
    useFamilyQuantity = new BoolColumn({ caption: getLang(this.context).useFamilyQuantity, defaultValue: true });
    useFamilyMembersAsQuantity = new BoolColumn({ caption: getLang(this.context).useFamilyMembersAsQuantity });
    quantity = new QuantityColumn(this.context);

    distributionCenter = new DistributionCenterId(this.context);
    useDefaultVolunteer = new BoolColumn({ caption: getLang(this.context).defaultVolunteer, defaultValue: true });
    courier = new HelperId(this.context);
    selfPickup = new SelfPickupStrategyColumn(false);
    usedCouriers: string[] = [];
    excludeGroups = new GroupsColumn(this.context, {
        caption: getLang(this.context).excludeGroups
    })
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [
                this.useFamilyBasket,
                this.basketType,
                this.useFamilyQuantity,
                this.useFamilyMembersAsQuantity,
                this.quantity,
                this.distributionCenter,
                this.useDefaultVolunteer,
                this.courier,
                this.selfPickup,
                this.excludeGroups
            ],
            validate: async (c) => {
                let x = await context.for(DistributionCenters).findId(this.distributionCenter);
                if (!x&&false) {
                    this.distributionCenter.validationError = getLang(this.context).mustSelectDistributionList;
                    throw this.distributionCenter.validationError;
                }
            },
            dialogColumns: (component) => {
                this.basketType.value = '';
                this.quantity.value = 1;
                this.distributionCenter.value = component.dialog.distCenter.value;
                return [
                    this.useFamilyBasket,
                    { column: this.basketType, visible: () => !this.useFamilyBasket.value },
                    this.useFamilyQuantity,
                    { column: this.useFamilyMembersAsQuantity, visible: () => !this.useFamilyQuantity.value },
                    { column: this.quantity, visible: () => !this.useFamilyQuantity.value && !this.useFamilyMembersAsQuantity.value },
                    { column: this.distributionCenter, visible: () => component.dialog.hasManyCenters },
                    this.useDefaultVolunteer,
                    { column: this.courier, visible: () => !this.useDefaultVolunteer.value },
                    this.selfPickup.getDispaySettings(component.settings.usingSelfPickupModule.value),
                    this.excludeGroups
                ]
            },
            additionalWhere: f => f.status.isEqualTo(FamilyStatus.Active),


            title: getLang(context).newDelivery,
            forEach: async f => {
                if (this.excludeGroups.value) {
                    for (let g of this.excludeGroups.listGroups()) {
                        if (f.groups.selected(g.trim())) {
                            return;
                        }

                    }
                }
                let fd = f.createDelivery(this.distributionCenter.value);
                if (!this.useFamilyBasket.value) {
                    fd.basketType.value = this.basketType.value;
                }
                if (!this.useFamilyQuantity.value) {
                    if (this.useFamilyMembersAsQuantity.value)
                        fd.quantity.value = f.familyMembers.value;
                    else
                        fd.quantity.value = this.quantity.value;
                }
                this.selfPickup.value.applyTo({ existingDelivery: undefined, newDelivery: fd, family: f });
                if (!this.useDefaultVolunteer.value) {
                    fd.courier.value = this.courier.value;
                }
                if ((await fd.duplicateCount()) == 0)
                    await fd.save();
                if (fd.courier.value && !this.usedCouriers.includes(fd.courier.value)) {
                    this.usedCouriers.push(fd.courier.value);
                }
            },
            onEnd: async () => {
                let t = new PromiseThrottle(10);
                for (const c of this.usedCouriers) {
                    await t.push(AsignFamilyComponent.RefreshRoute(c, undefined, this.context));
                }
                await t.done();
            }
        });
    }
}
export class updateGroup extends ActionOnRows<Families> {

    group = new StringColumn({
        caption: getLang(this.context).familyGroup,
        dataControlSettings: () => ({
            valueList: this.context.for(Groups).getValueList({ idColumn: x => x.name, captionColumn: x => x.name })
        })
    });
    action = new UpdateGroupStrategyColumn();
    constructor(context: Context) {
        super(context, Families, {
            columns: () => [this.group, this.action],
            confirmQuestion: () => this.action.value.caption + ' "' + this.group.value + '"',
            title: getLang(context).assignAFamilyGroup,
            allowed: Roles.admin,
            forEach: async f => {
                this.action.value.whatToDo(f.groups, this.group.value);
            }

        });
        this.group.value = '';
    }
}
class UpdateGroupStrategy {
    static add = new UpdateGroupStrategy(0, use.language.addGroupAssignmentVerb, (col, val) => {
        if (!col.selected(val))
            col.addGroup(val);
    });
    static remove = new UpdateGroupStrategy(1, use.language.removeGroupAssignmentVerb, (col, val) => {
        if (col.selected(val))
            col.removeGroup(val);
    });
    static replace = new UpdateGroupStrategy(2, use.language.replaceGroupAssignmentVerb, (col, val) => {
        col.value = val;
    });

    constructor(public id: number, public caption: string, public whatToDo: (col: GroupsColumn, val: string) => void) {

    }
}
class UpdateGroupStrategyColumn extends ValueListColumn<UpdateGroupStrategy>
{
    constructor() {
        super(UpdateGroupStrategy, {
            caption: use.language.action,
            defaultValue: UpdateGroupStrategy.add,
            dataControlSettings: () => ({ valueList: this.getOptions() })
        });
    }
}
export class FreezeDeliveriesForFamilies extends ActionOnRows<Families> {

    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [],
            title: getLang(context).freezeDeliveries,
            help: () => getLang(context).freezeDeliveriesHelp,
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
            title: getLang(context).unfreezeDeliveries,
            help: () => getLang(this.context).unfreezeDeliveriesHelp,
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
    status = new FamilyStatusColumn(this.context);
    archiveFinshedDeliveries = new BoolColumn({ caption: getLang(this.context).archiveFinishedDeliveries, defaultValue: true });
    deletePendingDeliveries = new BoolColumn({ caption: getLang(this.context).deletePendingDeliveries, defaultValue: true });
    comment = new StringColumn(getLang(this.context).internalComment);
    deleteExistingComment = new BoolColumn(getLang(this.context).deleteExistingComment);
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [this.status, this.archiveFinshedDeliveries, this.deletePendingDeliveries, this.comment, this.deletePendingDeliveries],
            help: () => getLang(this.context).updateStatusHelp,
            dialogColumns: () => {
                if (!this.status.value)
                    this.status.value = FamilyStatus.Active;

                return [
                    this.status,
                    this.comment,
                    this.deleteExistingComment,
                    { column: this.archiveFinshedDeliveries, visible: () => this.status.value != FamilyStatus.Active },
                    { column: this.deletePendingDeliveries, visible: () => this.status.value != FamilyStatus.Active },

                ]
            },
            title: getLang(context).updateFamilyStatus,
            forEach: async f => {
                f.status.value = this.status.value;
                if (this.deleteExistingComment) {
                    f.internalComment.value = '';
                }
                if (this.comment.value) {
                    if (f.internalComment.value)
                        f.internalComment.value += ", ";
                    f.internalComment.value += this.comment.value;
                }
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
            title: getLang(context).updateDefaultBasket,
            forEach: async f => { f.basketType.value = this.basket.value },
        });
    }
}

class UpdateSelfPickup extends ActionOnRows<Families> {
    selfPickup = new BoolColumn(getLang(this.context).selfPickup);
    updateExistingDeliveries = new BoolColumn(getLang(this.context).updateExistingDeliveries);
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [this.selfPickup, this.updateExistingDeliveries],
            title: getLang(context).updateDefaultSelfPickup,
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
    area = new StringColumn(getLang(this.context).region);
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [this.area],
            title: getLang(context).updateArea,
            forEach: async f => { f.area.value = this.area.value },
        });
    }
}

class UpdateQuantity extends ActionOnRows<Families> {
    quantity = new QuantityColumn(this.context);
    constructor(context: Context) {
        super(context, Families, {
            allowed: Roles.admin,
            columns: () => [this.quantity],
            title: getLang(context).updateDefaultQuantity,
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
            title: getLang(context).updateFamilySource,
            forEach: async f => { f.familySource.value = this.familySource.value }
        });
    }
}

export class SelfPickupStrategy {
    static familyDefault = new SelfPickupStrategy(0, use.language.selfPickupStrategy_familyDefault, x => {
        x.newDelivery.deliverStatus.value = x.family.defaultSelfPickup.value ? DeliveryStatus.SelfPickup : DeliveryStatus.ReadyForDelivery;
    });
    static byCurrentDelivery = new SelfPickupStrategy(1, use.language.selfpickupStrategy_byCurrentDelivery, x => {
        x.newDelivery.deliverStatus.value =
            x.existingDelivery.deliverStatus.value == DeliveryStatus.SuccessPickedUp || x.existingDelivery.deliverStatus.value == DeliveryStatus.SelfPickup
                ? DeliveryStatus.SelfPickup
                : DeliveryStatus.ReadyForDelivery;
    });
    static yes = new SelfPickupStrategy(2, use.language.selfPickupStrategy_yes, x => {
        x.newDelivery.deliverStatus.value = DeliveryStatus.SelfPickup
    });
    static no = new SelfPickupStrategy(3, use.language.selfpickupStrategy_no, x => {
        x.newDelivery.deliverStatus.value = DeliveryStatus.ReadyForDelivery
    });

    constructor(public id: number, public caption: string, public applyTo: (args: { existingDelivery: ActiveFamilyDeliveries, newDelivery: ActiveFamilyDeliveries, family: Families }) => void) {

    }
}
export class SelfPickupStrategyColumn extends ValueListColumn<SelfPickupStrategy>{
    constructor(private showByCurrentDeliery = true) {
        super(SelfPickupStrategy, { caption: use.language.selfPickupStrategy })
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