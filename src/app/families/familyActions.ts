import { Remult, AndFilter, getFields, SqlDatabase } from "remult";
import { Families } from "./families";

import { BasketType } from "./BasketType";
import { DistributionCenters } from "../manage/distribution-centers";
import { HelpersBase } from "../helpers/helpers";

import { FamilyStatus } from "./FamilyStatus";

import { ActionOnRows, packetServerUpdateInfo } from "./familyActionsWiring";
import { DeliveryStatus } from "./DeliveryStatus";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "./FamilyDeliveries";
import { use, Field, ValueListFieldType, QuantityColumn } from "../translate";
import { getLang } from '../sites/sites';
import { Controller } from "remult";

import { DataControl, getValueList } from "@remult/angular";
import { Groups, GroupsValue } from "../manage/groups";
import { FamilySources } from "./FamilySources";
import { ValueListValueConverter } from "remult/valueConverters";

import { getControllerRef } from "remult/src/remult3";

@ValueListFieldType(SelfPickupStrategy, {
    translation: l => l.selfPickupStrategy
})
export class SelfPickupStrategy {
    static familyDefault = new SelfPickupStrategy(0, use.language.selfPickupStrategy_familyDefault, x => {
        x.newDelivery.deliverStatus = x.family.defaultSelfPickup ? DeliveryStatus.SelfPickup : DeliveryStatus.ReadyForDelivery;
    });
    static byCurrentDelivery = new SelfPickupStrategy(1, use.language.selfpickupStrategy_byCurrentDelivery, x => {
        x.newDelivery.deliverStatus =
            x.existingDelivery.deliverStatus == DeliveryStatus.SuccessPickedUp || x.existingDelivery.deliverStatus == DeliveryStatus.SelfPickup
                ? DeliveryStatus.SelfPickup
                : DeliveryStatus.ReadyForDelivery;
    });
    static yes = new SelfPickupStrategy(2, use.language.selfPickupStrategy_yes, x => {
        x.newDelivery.deliverStatus = DeliveryStatus.SelfPickup
    });
    static no = new SelfPickupStrategy(3, use.language.selfpickupStrategy_no, x => {
        x.newDelivery.deliverStatus = DeliveryStatus.ReadyForDelivery
    });

    constructor(public id: number, public caption: string, public applyTo: (args: { existingDelivery: ActiveFamilyDeliveries, newDelivery: ActiveFamilyDeliveries, family: Families }) => void) {

    }
}


@Controller('NewDelivery')
export class NewDelivery extends ActionOnRows<Families> {
    @Field({ translation: l => l.useFamilyDefaultBasketType })
    useFamilyBasket: boolean = true;
    @Field()
    basketType: BasketType;
    @Field({ translation: l => l.useFamilyQuantity })
    useFamilyQuantity: boolean = true;
    @Field({ translation: l => l.useFamilyMembersAsQuantity })
    useFamilyMembersAsQuantity: boolean;
    @QuantityColumn()
    quantity: number;
    @Field({ translation: l => l.useFamilyDistributionList })
    useFamilyDistributionList: boolean = true;
    @Field()
    distributionCenter: DistributionCenters;
    @Field({ translation: l => l.defaultVolunteer })
    useDefaultVolunteer: boolean = true;
    @Field()
    courier: HelpersBase;
    @Field()
    @DataControl({ valueList: new ValueListValueConverter(SelfPickupStrategy).getOptions().filter(x => x != SelfPickupStrategy.byCurrentDelivery) })
    selfPickup: SelfPickupStrategy = SelfPickupStrategy.familyDefault;
    @Field({
        translation: l => l.excludeGroups
    })

    excludeGroups: GroupsValue;
    constructor(remult: Remult) {
        super(remult, Families, {
            validate: async () => {

                if (!this.useFamilyDistributionList && !this.distributionCenter) {
                    this.$.distributionCenter.error = getLang(this.remult).mustSelectDistributionList;
                    throw this.$.distributionCenter.error;
                }
            },
            dialogColumns: async (component) => {
                this.basketType = await this.remult.defaultBasketType();
                this.quantity = 1;
                this.distributionCenter = component.dialog.distCenter;
                if (!this.distributionCenter)
                    this.distributionCenter = await remult.defaultDistributionCenter();
                return [
                    this.$.useFamilyBasket,
                    { field: this.$.basketType, visible: () => !this.useFamilyBasket },
                    this.$.useFamilyQuantity,
                    { field: this.$.useFamilyMembersAsQuantity, visible: () => !this.useFamilyQuantity },
                    { field: this.$.quantity, visible: () => !this.useFamilyQuantity && !this.useFamilyMembersAsQuantity },
                    { field: this.$.useFamilyDistributionList, visible: () => component.dialog.hasManyCenters },
                    { field: this.$.distributionCenter, visible: () => component.dialog.hasManyCenters && !this.useFamilyDistributionList },
                    this.$.useDefaultVolunteer,
                    { field: this.$.courier, visible: () => !this.useDefaultVolunteer },
                    {
                        field: this.$.selfPickup,
                        visible: () => component.settings.usingSelfPickupModule
                    },
                    this.$.excludeGroups
                ]
            },
            additionalWhere: f => f.status.isEqualTo(FamilyStatus.Active),


            title: getLang(remult).newDelivery,
            icon: 'add_shopping_cart',
            forEach: async f => {

                for (let g of this.excludeGroups.listGroups()) {
                    if (f.groups.selected(g.trim())) {
                        return;
                    }

                }

                let fd = f.createDelivery(this.useFamilyDistributionList ? null : this.distributionCenter);
                fd._disableMessageToUsers = true;
                if (!this.useFamilyBasket) {
                    fd.basketType = this.basketType;
                }
                if (!this.useFamilyQuantity) {
                    if (this.useFamilyMembersAsQuantity)
                        fd.quantity = f.familyMembers;
                    else
                        fd.quantity = this.quantity;
                }
                this.selfPickup.applyTo({ existingDelivery: undefined, newDelivery: fd, family: f });
                if (!this.useDefaultVolunteer) {
                    fd.courier = this.courier;
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
@ValueListFieldType(UpdateGroupStrategy, {
    translation: l => l.action
})
export class UpdateGroupStrategy {
    static add = new UpdateGroupStrategy(0, use.language.addGroupAssignmentVerb, (col, val, set) => {
        if (!col.selected(val))
            set(col.addGroup(val));
    });
    static remove = new UpdateGroupStrategy(1, use.language.removeGroupAssignmentVerb, (col, val, set) => {
        if (col.selected(val))
            set(col.removeGroup(val));
    });
    static replace = new UpdateGroupStrategy(2, use.language.replaceGroupAssignmentVerb, (col, val, set) => {
        set(new GroupsValue(val));
    });

    constructor(public id: number, public caption: string, public whatToDo: (col: GroupsValue, val: string, set: (newVal: GroupsValue) => void) => void) {

    }
}

@Controller('updateGroup')
export class updateGroup extends ActionOnRows<Families> {

    @Field({
        translation: l => l.familyGroup
    })
    @DataControl({
        valueList: async remult => (await getValueList<Groups>(remult.repo(Groups), { idField: x => x.fields.name, captionField: x => x.fields.name })).map(({ id, caption }) => ({ id, caption }))
    })
    group: string;
    @Field()
    action: UpdateGroupStrategy = UpdateGroupStrategy.add;
    constructor(remult: Remult) {
        super(remult, Families, {
            confirmQuestion: () => this.action.caption + ' "' + this.group + '"',
            title: getLang(remult).assignAFamilyGroup,
            forEach: async f => {
                this.action.whatToDo(f.groups, this.group, x => f.groups = x);
            }

        });
        this.group = '';
    }
}




@Controller('UpdateFamilyStatus')
export class UpdateStatus extends ActionOnRows<Families> {
    @Field()
    status: FamilyStatus = FamilyStatus.Active;
    @Field({ translation: l => l.archiveFinishedDeliveries })
    archiveFinshedDeliveries: boolean = true;
    @Field({ translation: l => l.deletePendingDeliveries })
    deletePendingDeliveries: boolean = true;
    @Field({ translation: l => l.internalComment })
    comment: string;
    @Field({ translation: l => l.deleteExistingComment })
    deleteExistingComment: boolean;

    constructor(remult: Remult) {
        super(remult, Families, {
            help: () => getLang(this.remult).updateStatusHelp,
            dialogColumns: async () => {
                if (!this.status)
                    this.status = FamilyStatus.Active;

                return [
                    this.$.status,
                    this.$.comment,
                    this.$.deleteExistingComment,
                    { field: this.$.archiveFinshedDeliveries, visible: () => this.status != FamilyStatus.Active },
                    { field: this.$.deletePendingDeliveries, visible: () => this.status != FamilyStatus.Active },

                ]
            },
            title: getLang(remult).updateFamilyStatus,
            forEach: async f => {
                f.status = this.status;
                if (this.deleteExistingComment) {
                    f.internalComment = '';
                }
                if (this.comment) {
                    if (f.internalComment)
                        f.internalComment += ", ";
                    f.internalComment += this.comment;
                }
                if (f.status != FamilyStatus.Active && (this.archiveFinshedDeliveries || this.deletePendingDeliveries)) {
                    for await (const fd of this.remult.repo(ActiveFamilyDeliveries).iterate({ where: fd => fd.family.isEqualTo(f.id) })) {
                        if (fd.deliverStatus.IsAResultStatus()) {
                            if (this.archiveFinshedDeliveries) {
                                fd.archive = true;
                                await fd.save();
                            }
                        }
                        else {
                            if (this.deletePendingDeliveries)
                                await fd.delete();
                        }

                    }
                }
            }
        });
    }
}
@Controller('UpdateFamilyBasketType')
export class UpdateBasketType extends ActionOnRows<Families> {
    @Field()
    basket: BasketType;

    constructor(remult: Remult) {
        super(remult, Families, {
            title: getLang(remult).updateDefaultBasket,
            forEach: async f => { f.basketType = this.basket },
        });
    }
}

@Controller('UpdateSelfPickup')
export class UpdateSelfPickup extends ActionOnRows<Families> {
    @Field({ translation: l => l.selfPickup })
    selfPickup: boolean;
    @Field({ translation: l => l.updateExistingDeliveries })
    updateExistingDeliveries: boolean;


    constructor(remult: Remult) {
        super(remult, Families, {
            visible: c => c.settings.usingSelfPickupModule,
            title: getLang(remult).updateDefaultSelfPickup,
            forEach: async f => {
                {
                    f.defaultSelfPickup = this.selfPickup;
                    if (this.updateExistingDeliveries) {
                        for await (const fd of this.remult.repo(ActiveFamilyDeliveries).iterate({ where: fd => fd.family.isEqualTo(f.id).and(DeliveryStatus.isNotAResultStatus(fd.deliverStatus)) })) {
                            if (this.selfPickup) {
                                if (fd.deliverStatus == DeliveryStatus.ReadyForDelivery)
                                    fd.deliverStatus = DeliveryStatus.SelfPickup;

                            }
                            else
                                if (fd.deliverStatus == DeliveryStatus.SelfPickup)
                                    fd.deliverStatus = DeliveryStatus.ReadyForDelivery;
                            if (fd.wasChanged())
                                await fd.save();
                        }
                    }
                }
            },
        });
        this.updateExistingDeliveries = true;
    }
}
@Controller('UpdateArea')
export class UpdateArea extends ActionOnRows<Families> {
    @Field({ translation: l => l.region })
    area: string;

    constructor(remult: Remult) {
        super(remult, Families, {
            title: getLang(remult).updateArea,
            forEach: async f => { f.area = this.area.trim() },
        });
    }
}
@Controller('UpdateDefaultQuantity')
export class UpdateQuantity extends ActionOnRows<Families> {
    @QuantityColumn()
    quantity: number;

    constructor(remult: Remult) {
        super(remult, Families, {
            title: getLang(remult).updateDefaultQuantity,
            forEach: async f => { f.quantity = this.quantity },
        });
    }
}
@Controller('UpdateFamilySource')
export class UpdateFamilySource extends ActionOnRows<Families> {
    @Field()
    familySource: FamilySources;

    constructor(remult: Remult) {
        super(remult, Families, {
            title: getLang(remult).updateFamilySource,
            forEach: async f => { f.familySource = this.familySource }
        });
    }
}
@Controller('UpdateDefaultVolunteer')
export class UpdateDefaultVolunteer extends ActionOnRows<Families> {
    @Field({ translation: l => l.clearVolunteer })
    clearVoulenteer: boolean;
    @Field()
    courier: HelpersBase;
    constructor(remult: Remult) {
        super(remult, Families, {
            dialogColumns: async () => [
                this.$.clearVoulenteer,
                { field: this.$.courier, visible: () => !this.clearVoulenteer }
            ],

            title: getLang(remult).updateDefaultVolunteer,
            forEach: async fd => {
                if (this.clearVoulenteer) {
                    fd.fixedCourier = null;
                }
                else {
                    fd.fixedCourier = this.courier;
                }
            },

        });
        this.courier = null;
    }
}
@Controller('UpdateDefaultDistributionList')
export class UpdateDefaultDistributionList extends ActionOnRows<Families> {
    @Field({ translation: l => l.defaultDistributionCenter })
    distributionCenter: DistributionCenters;
    constructor(remult: Remult) {
        super(remult, Families, {
            dialogColumns: async (x) => {
                if (x.dialog.distCenter)
                    this.distributionCenter = x.dialog.distCenter;
                return [
                    { field: this.$.distributionCenter }
                ]
            },

            title: getLang(remult).updateDefaultDistributionCenter,
            forEach: async fd => {

                fd.defaultDistributionCenter = this.distributionCenter;

            },

        });
    }
}





export abstract class bridgeFamilyDeliveriesToFamilies extends ActionOnRows<ActiveFamilyDeliveries>{
    processedFamilies = new Map<string, boolean>();

    @Field()
    familyActionInfo: any;
    constructor(remult: Remult, public orig: ActionOnRows<Families>) {
        super(remult, ActiveFamilyDeliveries, {
            forEach: async fd => {
                if (this.processedFamilies.get(fd.family))
                    return;
                this.processedFamilies.set(fd.family, true);
                let f = await remult.repo(Families).findFirst(x => new AndFilter(orig.args.additionalWhere(x), x.id.isEqualTo(fd.family)))
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
        }, {
            serializeOnClient: async () => this.familyActionInfo = getControllerRef(orig).toApiJson(),
            deserializeOnServer: async () => await getControllerRef(orig)._updateEntityBasedOnApi(this.familyActionInfo)
        });
    }
}
@Controller('updateGroupForDeliveries')
export class updateGroupForDeliveries extends bridgeFamilyDeliveriesToFamilies {
    constructor(remult: Remult) {
        super(remult, new updateGroup(remult))
    }
}
@Controller('UpdateAreaForDeliveries')
export class UpdateAreaForDeliveries extends bridgeFamilyDeliveriesToFamilies {
    constructor(remult: Remult) {
        super(remult, new UpdateArea(remult))
    }
}
@Controller('UpdateStatusForDeliveries')
export class UpdateStatusForDeliveries extends bridgeFamilyDeliveriesToFamilies {
    constructor(remult: Remult) {
        super(remult, new UpdateStatus(remult))
    }
}

