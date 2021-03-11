import { Context, DataArealColumnSetting, Column, Allowed, ServerFunction, BoolColumn, GridButton, StringColumn, AndFilter, unpackWhere, ValueListColumn, DataControlInfo, getColumnsFromObject } from "@remult/core";
import { Families, GroupsColumn } from "./families";
import { Roles } from "../auth/roles";
import { BasketId, QuantityColumn } from "./BasketType";
import { DistributionCenterId, DistributionCenters, allCentersToken } from "../manage/distribution-centers";
import { HelperId } from "../helpers/helpers";
import { Groups } from "../manage/groups";
import { FamilyStatusColumn, FamilyStatus } from "./FamilyStatus";
import { FamilySourceId } from "./FamilySources";
import { ActionOnRows, packetServerUpdateInfo } from "./familyActionsWiring";
import { DeliveryStatus } from "./DeliveryStatus";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "./FamilyDeliveries";
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { ServerController } from "@remult/core";



@ServerController({
    allowed: Roles.admin,
    key: 'NewDelivery'
})
export class NewDelivery extends ActionOnRows<Families> {
    useFamilyBasket = new BoolColumn({ caption: getLang(this.context).useFamilyDefaultBasketType, defaultValue: true });
    basketType = new BasketId(this.context);
    useFamilyQuantity = new BoolColumn({ caption: getLang(this.context).useFamilyQuantity, defaultValue: true });
    useFamilyMembersAsQuantity = new BoolColumn({ caption: getLang(this.context).useFamilyMembersAsQuantity });
    quantity = new QuantityColumn(this.context);

    distributionCenter = new DistributionCenterId(this.context);
    useDefaultVolunteer = new BoolColumn({ caption: getLang(this.context).defaultVolunteer, defaultValue: true });
    courier = new HelperId(this.context);
    selfPickup = new SelfPickupStrategyColumn(false);

    excludeGroups = new GroupsColumn(this.context, {
        caption: getLang(this.context).excludeGroups
    })
    constructor(context: Context) {
        super(context, Families, {
            validate: async () => {
                let x = await context.for(DistributionCenters).findId(this.distributionCenter);
                if (!x && false) {
                    this.distributionCenter.validationError = getLang(this.context).mustSelectDistributionList;
                    throw this.distributionCenter.validationError;
                }
            },
            dialogColumns: async (component) => {
                this.basketType.value = '';
                this.quantity.value = 1;
                this.distributionCenter.value = component.dialog.distCenter.value;
                if (this.distributionCenter.value == allCentersToken)
                    this.distributionCenter.value = '';
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
            icon: 'add_shopping_cart',
            forEach: async f => {
                if (this.excludeGroups.value) {
                    for (let g of this.excludeGroups.listGroups()) {
                        if (f.groups.selected(g.trim())) {
                            return;
                        }

                    }
                }
                let fd = f.createDelivery(this.distributionCenter.value);
                fd._disableMessageToUsers = true;
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
                let count = (await fd.duplicateCount());
                if (count == 0)
                    await fd.save();
            },
            onEnd: async () => {

            }
        });
    }
}
@ServerController({
    allowed: Roles.admin,
    key: 'updateGroup'
})
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
            confirmQuestion: () => this.action.value.caption + ' "' + this.group.value + '"',
            title: getLang(context).assignAFamilyGroup,
            forEach: async f => {
                this.action.value.whatToDo(f.groups, this.group.value);
            }

        });
        this.group.value = '';
    }
}

export class UpdateGroupStrategy {
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

export class UpdateGroupStrategyColumn extends ValueListColumn<UpdateGroupStrategy>
{
    constructor() {
        super(UpdateGroupStrategy, {
            caption: use.language.action,
            defaultValue: UpdateGroupStrategy.add,
            dataControlSettings: () => ({ valueList: this.getOptions() })
        });
    }
}



@ServerController({
    allowed: Roles.admin,
    key: 'UpdateFamilyStatus'
})
export class UpdateStatus extends ActionOnRows<Families> {
    status = new FamilyStatusColumn(this.context);
    archiveFinshedDeliveries = new BoolColumn({ caption: getLang(this.context).archiveFinishedDeliveries, defaultValue: true });
    deletePendingDeliveries = new BoolColumn({ caption: getLang(this.context).deletePendingDeliveries, defaultValue: true });
    comment = new StringColumn(getLang(this.context).internalComment);
    deleteExistingComment = new BoolColumn(getLang(this.context).deleteExistingComment);

    constructor(context: Context) {
        super(context, Families, {
            help: () => getLang(this.context).updateStatusHelp,
            dialogColumns: async () => {
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
                    for await (const fd of this.context.for(ActiveFamilyDeliveries).iterate({ where: fd => fd.family.isEqualTo(f.id) })) {
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
@ServerController({
    allowed: Roles.admin,
    key: 'UpdateFamilyBasketType'
})
export class UpdateBasketType extends ActionOnRows<Families> {
    basket = new BasketId(this.context);
    constructor(context: Context) {
        super(context, Families, {
            title: getLang(context).updateDefaultBasket,
            forEach: async f => { f.basketType.value = this.basket.value },
        });
    }
}

@ServerController({
    allowed: Roles.admin,
    key: 'UpdateSelfPickup'
})
export class UpdateSelfPickup extends ActionOnRows<Families> {
    selfPickup = new BoolColumn(getLang(this.context).selfPickup);
    updateExistingDeliveries = new BoolColumn(getLang(this.context).updateExistingDeliveries);

    constructor(context: Context) {
        super(context, Families, {
            visible: c => c.settings.usingSelfPickupModule.value,
            title: getLang(context).updateDefaultSelfPickup,
            forEach: async f => {
                {
                    f.defaultSelfPickup.value = this.selfPickup.value;
                    if (this.updateExistingDeliveries.value) {
                        for await (const fd of this.context.for(ActiveFamilyDeliveries).iterate({ where: fd => fd.family.isEqualTo(f.id).and(fd.deliverStatus.isNotAResultStatus()) })) {
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
@ServerController({
    allowed: Roles.admin,
    key: 'UpdateArea'
})
export class UpdateArea extends ActionOnRows<Families> {
    area = new StringColumn(getLang(this.context).region);
    constructor(context: Context) {
        super(context, Families, {
            title: getLang(context).updateArea,
            forEach: async f => { f.area.value = this.area.value.trim() },
        });
    }
}
@ServerController({
    allowed: Roles.admin,
    key: 'UpdateDefaultQuantity'
})
export class UpdateQuantity extends ActionOnRows<Families> {
    quantity = new QuantityColumn(this.context);
    constructor(context: Context) {
        super(context, Families, {
            title: getLang(context).updateDefaultQuantity,
            forEach: async f => { f.quantity.value = this.quantity.value },
        });
    }
}
@ServerController({
    allowed: Roles.admin,
    key: 'UpdateFamilySource'
})
export class UpdateFamilySource extends ActionOnRows<Families> {
    familySource = new FamilySourceId(this.context);
    constructor(context: Context) {
        super(context, Families, {
            title: getLang(context).updateFamilySource,
            forEach: async f => { f.familySource.value = this.familySource.value }
        });
    }
}
@ServerController({
    allowed: Roles.admin,
    key: 'UpdateDefaultVolunteer'
})
export class UpdateDefaultVolunteer extends ActionOnRows<Families> {
    clearVoulenteer = new BoolColumn(getLang(this.context).clearVolunteer);
    courier = new HelperId(this.context, getLang(this.context).volunteer);
    constructor(context: Context) {
        super(context, Families, {
            dialogColumns: async () => [
                this.clearVoulenteer,
                { column: this.courier, visible: () => !this.clearVoulenteer.value }
            ],

            title: getLang(context).updateDefaultVolunteer,
            forEach: async fd => {
                if (this.clearVoulenteer.value) {
                    fd.fixedCourier.value = '';
                }
                else {
                    fd.fixedCourier.value = this.courier.value;
                }
            },

        });
        this.courier.value = '';
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
        } as DataControlInfo
    }
}



export abstract class bridgeFamilyDeliveriesToFamilies extends ActionOnRows<ActiveFamilyDeliveries>{
    processedFamilies = new Map<string, boolean>();
    __columns = getColumnsFromObject(this.orig);

    constructor(context: Context, public orig: ActionOnRows<Families>) {
        super(context, FamilyDeliveries, {
            forEach: async fd => {
                if (this.processedFamilies.get(fd.family.value))
                    return;
                this.processedFamilies.set(fd.family.value, true);
                let f = await context.for(Families).findFirst(x => new AndFilter(orig.args.additionalWhere(x), x.id.isEqualTo(fd.family.value)))
                if (f) {
                    await orig.args.forEach(f);
                    await f.save();
                }
            },
            title: orig.args.title,
            confirmQuestion: orig.args.confirmQuestion,
            dialogColumns: x => orig.args.dialogColumns({
                afterAction: x.afterAction,
                userWhere: () => { throw 'err' },
                dialog: x.dialog,
                settings: x.settings
            }),
            help: orig.args.help,
            onEnd: orig.args.onEnd,
            validate: orig.args.validate,
            additionalWhere: undefined,
            validateInComponent: x => orig.args.validateInComponent({
                afterAction: x.afterAction,
                userWhere: () => { throw 'err' },
                dialog: x.dialog,
                settings: x.settings
            })
        });
    }
}
@ServerController({
    allowed: Roles.admin,
    key: 'updateGroupForDeliveries'
})
export class updateGroupForDeliveries extends bridgeFamilyDeliveriesToFamilies {
    constructor(context: Context) {
        super(context, new updateGroup(context))
    }
}
@ServerController({
    allowed: Roles.admin,
    key: 'UpdateAreaForDeliveries'
})
export class UpdateAreaForDeliveries extends bridgeFamilyDeliveriesToFamilies {
    constructor(context: Context) {
        super(context, new UpdateArea(context))
    }
}
@ServerController({
    allowed: Roles.admin,
    key: 'UpdateStatusForDeliveries'
})
export class UpdateStatusForDeliveries extends bridgeFamilyDeliveriesToFamilies {
    constructor(context: Context) {
        super(context, new UpdateStatus(context))
    }
}

