import { EntityFilter, Filter, remult } from 'remult'
import { Roles } from '../auth/roles'
import { DistributionCenters } from '../manage/distribution-centers'
import { HelpersBase } from '../helpers/helpers'
import { use, Field, FieldType, Fields, ValueListFieldType } from '../translate'
import { getLang } from '../sites/sites'
import { ActionOnRows, ActionOnRowsArgs } from '../families/familyActionsWiring'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { Families } from '../families/families'
import { BasketType } from '../families/BasketType'
import { FamilyStatus } from '../families/FamilyStatus'
import { SelfPickupStrategy } from '../families/familyActions'
import { getSettings } from '../manage/ApplicationSettings'
import { Controller } from 'remult'
import {
  DataAreaFieldsSetting,
  DataControl,
  getEntityValueList,
  InputField
} from '../common-ui-elements/interfaces'

import { getFields } from 'remult'

export abstract class ActionOnFamilyDeliveries extends ActionOnRows<ActiveFamilyDeliveries> {
  constructor(args: ActionOnRowsArgs<ActiveFamilyDeliveries>) {
    super(ActiveFamilyDeliveries, buildArgsForFamilyDeliveries(args))
  }
}
function buildArgsForFamilyDeliveries(
  args: ActionOnRowsArgs<ActiveFamilyDeliveries>
) {
  if (args.orderBy) throw "didn't expect order by"
  args.orderBy = {
    createDate: 'desc',
    id: 'asc'
  } //to handle the case where paging is used, and items are added with different ids
  let originalForEach = args.forEach
  args.forEach = async (fd) => {
    fd._disableMessageToUsers = true
    await originalForEach(fd)
  }
  let originalWhere = args.additionalWhere
  args.additionalWhere = async () => ({
    $and: [
      FamilyDeliveries.isAllowedForUser(),
      await Filter.resolve(originalWhere)
    ]
  })
  return args
}

@Controller('deleteDeliveries')
export class DeleteDeliveries extends ActionOnFamilyDeliveries {
  @Field({ translation: (l) => l.updateFamilyStatus })
  updateFamilyStatus: boolean
  @Field()
  status: FamilyStatus

  constructor() {
    super({
      dialogColumns: async (c) => [],
      //     this.$.updateFamilyStatus,
      //     { field: this.$.status, visible: () => this.updateFamilyStatus }
      // ],
      title: getLang().deleteDeliveries,
      icon: 'delete',
      help: () => getLang().deleteDeliveriesHelp,
      forEach: async (fd) => {
        await fd.delete()
        if (this.updateFamilyStatus) {
          let f = await remult.repo(Families).findId(fd.family)
          f.status = this.status
          await f.save()
        }
      },
      additionalWhere: { deliverStatus: DeliveryStatus.isNotAResultStatus() }
    })
  }
}
const asCurrentBasket = 'AS_CURRENT_BASKET'
@Controller('UpdateFamilyDefaults')
export class UpdateFamilyDefaults extends ActionOnRows<ActiveFamilyDeliveries> {
  @Field({ translation: (l) => l.defaultVolunteer })
  byCurrentCourier: boolean
  @Field({ translation: (l) => l.defaultBasketType })
  basketType: boolean
  @Field({ translation: (l) => l.basketType })
  @DataControl({
    valueList: async (remult) => {
      let r = await getEntityValueList(remult.repo(BasketType))
      r.splice(0, 0, {
        id: asCurrentBasket,
        caption: use.language.asCurrentBasket
      })
      return r
    }
  })
  selectBasket: string = asCurrentBasket
  @Field({ translation: (l) => l.defaultDistributionCenter })
  defaultDistributionCenter: boolean
  @Field({ translation: (l) => l.defaultQuantity })
  quantity: boolean
  @Field({ translation: (l) => l.commentForVolunteer })
  comment: boolean
  @Field({ translation: (l) => l.selfPickup })
  selfPickup: boolean

  constructor() {
    super(ActiveFamilyDeliveries, {
      help: () => use.language.updateFamilyDefaultsHelp,
      dialogColumns: async (c) => [
        this.$.basketType,
        { field: this.$.selectBasket, visible: () => this.basketType },
        this.$.quantity,
        this.$.byCurrentCourier,
        this.$.comment,
        {
          field: this.$.selfPickup,
          visible: () => c.settings.usingSelfPickupModule
        },
        {
          field: this.$.defaultDistributionCenter,
          visible: () => c.ui.hasManyCenters
        }
      ],

      title: getLang().updateFamilyDefaults,
      forEach: async (fd) => {
        let f = await remult.repo(Families).findId(fd.family)
        if (f) {
          if (this.byCurrentCourier) {
            //        if (fd.courier)
            f.fixedCourier = fd.courier
          }
          if (this.basketType) {
            if (this.selectBasket == asCurrentBasket)
              f.basketType = fd.basketType
            else
              f.basketType = await remult
                .repo(BasketType)
                .findId(this.selectBasket)
          }
          if (this.quantity) f.quantity = fd.quantity
          if (this.comment) f.deliveryComments = fd.deliveryComments
          if (this.selfPickup)
            f.defaultSelfPickup =
              fd.deliverStatus == DeliveryStatus.SelfPickup ||
              fd.deliverStatus == DeliveryStatus.SuccessPickedUp
          if (this.defaultDistributionCenter)
            f.defaultDistributionCenter = fd.distributionCenter

          if (f._.wasChanged()) {
            await f.save()
            f.updateDelivery(fd)
          }
        }
      }
    })
  }
}
@Controller('updateCourier')
export class UpdateCourier extends ActionOnRows<ActiveFamilyDeliveries> {
  @Field({ translation: (l) => l.clearVolunteer })
  clearVoulenteer: boolean
  @Field()
  courier: HelpersBase
  @Field({ translation: (l) => l.setAsDefaultVolunteer })
  updateAlsoAsFixed: boolean
  usedCouriers: string[] = []
  constructor() {
    super(ActiveFamilyDeliveries, {
      help: () => getLang().updateVolunteerHelp,
      dialogColumns: async () => [
        this.$.clearVoulenteer,
        { field: this.$.courier, visible: () => !this.clearVoulenteer },
        {
          field: this.$.updateAlsoAsFixed,
          visible: () => !this.clearVoulenteer && remult.isAllowed(Roles.admin)
        }
      ],
      additionalWhere: { deliverStatus: DeliveryStatus.isNotAResultStatus() },
      title: getLang().updateVolunteer,
      forEach: async (fd) => {
        if (this.clearVoulenteer) {
          fd.courier = null
        } else {
          fd.courier = this.courier
          if (this.updateAlsoAsFixed) {
            let f = await remult.repo(Families).findId(fd.family)
            if (f) {
              f.fixedCourier = this.courier
              if (f._.wasChanged()) {
                await f.save()
                f.updateDelivery(fd)
              }
            }
          }
        }
      }
    })
    this.courier = null
  }
}
@Controller('updateDeliveriesStatus')
export class UpdateDeliveriesStatus extends ActionOnFamilyDeliveries {
  @Field()
  status: DeliveryStatus
  @Field({ translation: (l) => l.internalComment })
  comment: string
  @Field({ translation: (l) => l.deleteExistingComment })
  deleteExistingComment: boolean

  constructor() {
    super({
      title: getLang().updateDeliveriesStatus,
      help: () =>
        getSettings().isSytemForMlt ? '' : getLang().updateDeliveriesStatusHelp,
      validate: async () => {
        if (this.status == undefined) throw getLang().statusNotSelected
      },
      validateInComponent: async (c) => {
        let deliveriesWithResultStatus = await remult
          .repo(ActiveFamilyDeliveries)
          .count({
            deliverStatus: DeliveryStatus.isAResultStatus(),
            $and: [
              await Filter.resolve(c.userWhere),
              await Filter.resolve(this.args.additionalWhere)
            ]
          })
        if (
          deliveriesWithResultStatus > 0 &&
          (this.status == DeliveryStatus.ReadyForDelivery ||
            this.status == DeliveryStatus.SelfPickup)
        ) {
          if (
            await c.ui.YesNoPromise(
              getLang().thereAre +
                ' ' +
                deliveriesWithResultStatus +
                ' ' +
                getLang()
                  .deliveriesWithResultStatusSettingsTheirStatusWillOverrideThatStatusAndItWillNotBeSavedInHistory_toCreateANewDeliveryAbortThisActionAndChooseTheNewDeliveryOption_Abort
            )
          )
            throw getLang().updateCanceled
        }
      },
      forEach: async (f) => {
        if (
          getSettings().isSytemForMlt ||
          !(
            this.status == DeliveryStatus.Frozen &&
            f.deliverStatus != DeliveryStatus.ReadyForDelivery &&
            f.deliverStatus != DeliveryStatus.enquireDetails
          )
        ) {
          f.deliverStatus = this.status
          if (this.deleteExistingComment) {
            f.internalDeliveryComment = ''
          }
          if (this.comment) {
            if (f.internalDeliveryComment) f.internalDeliveryComment += ', '
            f.internalDeliveryComment += this.comment
          }
        }
      }
    })
  }
}

@FieldType({
  valueConverter: {
    fromJson: (x) => {
      return Object.assign(new ArchiveHelper(), x)
    }
  }
})
export class ArchiveHelper {
  @Field()
  markOnTheWayAsDelivered: boolean
  @Field()
  markSelfPickupAsDelivered: boolean

  get $() {
    return getFields(this)
  }
  async initArchiveHelperBasedOnCurrentDeliveryInfo(
    where: EntityFilter<ActiveFamilyDeliveries>,
    usingSelfPickupModule: boolean
  ) {
    let result: DataAreaFieldsSetting<any>[] = []
    let repo = remult.repo(ActiveFamilyDeliveries)

    let onTheWay = await repo.count({
      $and: [FamilyDeliveries.onTheWayFilter(), where]
    })

    if (onTheWay > 0) {
      this.markOnTheWayAsDelivered = true
      result.push({
        field: this.$.markOnTheWayAsDelivered,
        caption:
          use.language.markAsDeliveredFor +
          ' ' +
          onTheWay +
          ' ' +
          use.language.onTheWayDeliveries
      })
    }

    if (usingSelfPickupModule) {
      let selfPickup = await repo.count({
        deliverStatus: DeliveryStatus.SelfPickup,
        $and: [where]
      })

      if (selfPickup > 0) {
        this.markSelfPickupAsDelivered = true
        result.push({
          field: this.$.markSelfPickupAsDelivered,
          caption:
            use.language.markAsSelfPickupFor +
            ' ' +
            selfPickup +
            ' ' +
            use.language.selfPickupDeliveries
        })
      }
    }

    return result
  }
  async forEach(f: ActiveFamilyDeliveries) {
    if (
      f.deliverStatus == DeliveryStatus.ReadyForDelivery &&
      f.courier &&
      this.markOnTheWayAsDelivered
    )
      f.deliverStatus = DeliveryStatus.Success
    if (
      f.deliverStatus == DeliveryStatus.SelfPickup &&
      this.markSelfPickupAsDelivered
    )
      f.deliverStatus = DeliveryStatus.SuccessPickedUp
  }
}

@Controller('archiveDeliveries')
export class ArchiveDeliveries extends ActionOnFamilyDeliveries {
  @Field()
  archiveHelper: ArchiveHelper = new ArchiveHelper()
  constructor() {
    super({
      dialogColumns: async (c) => {
        return await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(
          await this.composeWhere(c.userWhere),
          c.settings.usingSelfPickupModule
        )
      },
      icon: 'archive',
      title: getLang().archiveDeliveries,
      help: () => getLang().archiveDeliveriesHelp,
      forEach: async (f) => {
        await this.archiveHelper.forEach(f)
        if (f.deliverStatus.IsAResultStatus()) f.archive = true
      }
    })
  }
}

@Controller('updateBasketType')
export class UpdateBasketType extends ActionOnFamilyDeliveries {
  @Field()
  basketType: BasketType

  constructor() {
    super({
      allowed: Roles.distCenterAdmin,
      title: getLang().updateBasketType,
      forEach: async (f) => {
        f.basketType = this.basketType
      }
    })
  }
}
@Controller('updateQuantity')
export class UpdateQuantity extends ActionOnFamilyDeliveries {
  @Fields.quantity()
  quantity: number

  constructor() {
    super({
      allowed: Roles.distCenterAdmin,
      title: getLang().updateBasketQuantity,
      forEach: async (f) => {
        f.quantity = this.quantity
      }
    })
  }
}

@Controller('updateDistributionCenter')
export class UpdateDistributionCenter extends ActionOnFamilyDeliveries {
  @Field()
  distributionCenter: DistributionCenters

  constructor() {
    super({
      title: getLang().updateDistributionList,
      forEach: async (f) => {
        f.distributionCenter = this.distributionCenter
      }
    })
  }
}

@ValueListFieldType({
  defaultValue: () => HelperStrategy.familyDefault,
  translation: (l) => l.volunteer
})
class HelperStrategy {
  static familyDefault = new HelperStrategy(
    0,
    use.language.volunteerByFamilyDefault,
    (x) => {}
  )
  static currentHelper = new HelperStrategy(
    1,
    use.language.volunteerByCrrentDelivery,
    (x) => {
      x.newDelivery.courier = x.existingDelivery.courier
    }
  )
  static noHelper = new HelperStrategy(2, use.language.noVolunteer, (x) => {
    x.newDelivery.courier = null
  })
  static selectHelper = new HelperStrategy(
    3,
    use.language.selectVolunteer,
    (x) => {
      x.newDelivery.courier = x.helper
    }
  )
  constructor(
    public id: number,
    public caption: string,
    public applyTo: (args: {
      existingDelivery: ActiveFamilyDeliveries
      newDelivery: ActiveFamilyDeliveries
      helper: HelpersBase
    }) => void
  ) {}
}

@Controller('newDeliveryForDeliveries')
export class NewDelivery extends ActionOnFamilyDeliveries {
  @Field({ translation: (l) => l.useBusketTypeFromCurrentDelivery })
  useExistingBasket: boolean = true
  @Field()
  basketType: BasketType
  @Fields.quantity()
  quantity: number
  @Field()
  helperStrategy: HelperStrategy = HelperStrategy.familyDefault
  @Field()
  helper: HelpersBase
  @Field({ translation: (l) => l.archiveCurrentDelivery })
  autoArchive: boolean = true
  @Field({ translation: (l) => l.newDeliveryForAll })
  newDeliveryForAll: boolean
  @Field()
  selfPickup: SelfPickupStrategy = SelfPickupStrategy.familyDefault
  @Field()
  archiveHelper: ArchiveHelper = new ArchiveHelper()

  @Field()
  distributionCenter: DistributionCenters

  @Field({ translation: (l) => l.distributionListAsCurrentDelivery })
  useCurrentDistributionCenter: boolean

  constructor() {
    super({
      dialogColumns: async (component) => {
        this.basketType = await remult.context.defaultBasketType()
        this.quantity = 1
        this.distributionCenter = component.ui.distCenter
        this.useCurrentDistributionCenter = component.ui.distCenter == null
        return [
          this.$.useExistingBasket,
          [
            {
              field: this.$.basketType,
              visible: () => !this.useExistingBasket
            },
            { field: this.$.quantity, visible: () => !this.useExistingBasket }
          ],
          {
            field: this.$.useCurrentDistributionCenter,
            visible: () =>
              component.ui.distCenter == null && component.ui.hasManyCenters
          },
          {
            field: this.$.distributionCenter,
            visible: () =>
              component.ui.hasManyCenters && !this.useCurrentDistributionCenter
          },
          this.$.helperStrategy,
          {
            field: this.$.helper,
            visible: () => this.helperStrategy == HelperStrategy.selectHelper
          },
          ...(await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(
            await this.composeWhere(component.userWhere),
            component.settings.usingSelfPickupModule
          )),
          this.$.autoArchive,
          this.$.newDeliveryForAll,
          {
            field: this.$.selfPickup,
            visible: () => component.settings.usingSelfPickupModule
          }
        ]
      },
      validate: async () => {
        if (!this.useCurrentDistributionCenter) {
          if (!this.distributionCenter)
            throw getLang().pleaseSelectDistributionList
        }
      },
      additionalWhere: () => ({
        deliverStatus: !this.newDeliveryForAll
          ? DeliveryStatus.isAResultStatus()
          : undefined
      }),
      title: getLang().newDelivery,
      icon: 'add_shopping_cart',
      help: () =>
        getLang().newDeliveryForDeliveriesHelp +
        ' ' +
        this.$.newDeliveryForAll.metadata.caption,
      forEach: async (existingDelivery) => {
        this.archiveHelper.forEach(existingDelivery)
        if (this.autoArchive) {
          if (existingDelivery.deliverStatus.IsAResultStatus())
            existingDelivery.archive = true
        }
        if (existingDelivery._.wasChanged()) await existingDelivery.save()

        let f = await remult.repo(Families).findId(existingDelivery.family)
        if (!f || f.status != FamilyStatus.Active) return
        let newDelivery = f.createDelivery(existingDelivery.distributionCenter)
        newDelivery._disableMessageToUsers = true
        newDelivery.copyFrom(existingDelivery)
        if (!this.useExistingBasket) {
          newDelivery.basketType = this.basketType
          newDelivery.quantity = this.quantity
        }
        newDelivery.distributionCenter = this.distributionCenter
        if (this.useCurrentDistributionCenter)
          newDelivery.distributionCenter = existingDelivery.distributionCenter
        this.helperStrategy.applyTo({
          existingDelivery,
          newDelivery,
          helper: this.helper
        })
        this.selfPickup.applyTo({ existingDelivery, newDelivery, family: f })

        if ((await newDelivery.duplicateCount()) == 0) await newDelivery.save()
      }
    })
  }
}
