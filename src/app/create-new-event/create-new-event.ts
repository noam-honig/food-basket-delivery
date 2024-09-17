import {
  Controller,
  BackendMethod,
  getFields,
  ProgressListener,
  remult
} from 'remult'

import { Sites, getLang } from '../sites/sites'

import { DistributionCenters } from '../manage/distribution-centers'
import { Roles } from '../auth/roles'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { Families } from '../families/families'
import { BasketType } from '../families/BasketType'
import { ArchiveHelper } from '../family-deliveries/family-deliveries-actions'
import { PromiseThrottle } from '../shared/utils'

import { FamilyStatus } from '../families/FamilyStatus'
import { use, Field, Fields } from '../translate'
import { GroupsValue } from '../manage/groups'
import { DataControl } from '../common-ui-elements/interfaces'
import { UITools } from '../helpers/init-context'

function visible(when: () => boolean, caption?: string) {
  return {
    caption,
    dataControlSettings: () => ({ visible: () => when() })
  }
}

@Controller('createNewEvent')
export class CreateNewEvent {
  @Field(() => ArchiveHelper)
  archiveHelper: ArchiveHelper = new ArchiveHelper()
  @Fields.boolean({ translation: (l) => l.createNewDeliveryForAllFamilies })
  createNewDelivery: boolean
  @Fields.boolean<CreateNewEvent>()
  @DataControl<CreateNewEvent>({
    visible: (self) =>
      self.ui?.hasManyCenters && self.createNewDelivery && self.moreOptions
  })
  useFamilyDistributionList: boolean = true
  @Field<CreateNewEvent>(() => DistributionCenters)
  @DataControl<CreateNewEvent>({
    visible: (self) =>
      self.ui?.hasManyCenters &&
      self.createNewDelivery &&
      self.moreOptions &&
      !self.useFamilyDistributionList
  })
  distributionCenter: DistributionCenters
  @DataControl({ visible: () => false })
  @Field<CreateNewEvent>(() => DistributionCenters)
  _selectedDistributionList: DistributionCenters
  get selectedDistributionList() {
    if (this.allDistCenters) return null
    return this._selectedDistributionList
  }
  @DataControl({ visible: () => false })
  @Fields.boolean<CreateNewEvent>()
  allDistCenters: boolean = false

  @Fields.boolean({ translation: (l) => l.moreOptions })
  @DataControl<CreateNewEvent>({ visible: (self) => self.createNewDelivery })
  moreOptions: boolean
  @Field(() => GroupsValue, { translation: (l) => l.includeGroups })
  @DataControl<CreateNewEvent>({
    visible: (self) => self.createNewDelivery && self.moreOptions
  })
  includeGroups: GroupsValue
  @Field(() => GroupsValue, { translation: (l) => l.excludeGroups })
  @DataControl<CreateNewEvent>({
    visible: (self) => self.createNewDelivery && self.moreOptions
  })
  excludeGroups: GroupsValue
  @Fields.boolean({ translation: (l) => l.useFamilyDefaultBasketType })
  @DataControl<CreateNewEvent>({
    visible: (self) => self.createNewDelivery && self.moreOptions
  })
  useFamilyBasket: boolean
  @DataControl<CreateNewEvent>({ visible: (self) => !self.useFamilyBasket })
  @Field(() => BasketType)
  basketType: BasketType

  isAllowed() {
    return remult.isAllowed(Roles.admin)
  }
  get $() {
    return getFields<CreateNewEvent>(this, remult)
  }
  @BackendMethod({
    queue: true,
    allowed: Roles.admin,
    paramTypes: [ProgressListener]
  })
  async createNewEvent(progress?: ProgressListener) {
    let settings = await ApplicationSettings.getAsync()
    for (const x of [
      [
        this.$.createNewDelivery,
        settings.$.createBasketsForAllFamiliesInCreateEvent
      ],
      [this.$.includeGroups, settings.$.includeGroupsInCreateEvent],
      [this.$.excludeGroups, settings.$.excludeGroupsInCreateEvent]
    ]) {
      x[1].value = x[0].value
    }
    await settings.save()

    let pt = new PromiseThrottle(10)
    for await (const fd of remult.repo(ActiveFamilyDeliveries).query({
      where: {
        distributionCenter: remult.context.filterDistCenter(
          this.selectedDistributionList
        )
      }
    })) {
      this.archiveHelper.forEach(fd)
      fd.archive = true
      await pt.push(fd.save())
    }
    await pt.done()
    let r = 0
    if (this.createNewDelivery) {
      r = await this.iterateFamilies(async (f) => {
        let fd = await f.createDelivery(
          this.useFamilyDistributionList ? null : this.distributionCenter
        )
        fd._disableMessageToUsers = true
        if (this.moreOptions) {
          if (!this.useFamilyBasket) fd.basketType = this.basketType
        }
        await fd.save()
      }, progress)
      Families.SendMessageToBrowsers(r + ' ' + getLang().deliveriesCreated, '')
    }
    return r
  }

  async iterateFamilies(
    what: (f: Families) => Promise<any>,
    progress: ProgressListener
  ) {
    //let pt = new PromiseThrottle(10);
    let i = 0

    for await (let f of remult
      .repo(Families)
      .query({ where: { status: FamilyStatus.Active }, progress })) {
      let match = true
      if (this.moreOptions) {
        if (this.includeGroups?.hasAny()) {
          match = false
          for (let g of this.includeGroups.listGroups()) {
            if (f.groups.selected(g.trim())) {
              match = true
            }
          }
        }
        if (this.excludeGroups?.hasAny()) {
          for (let g of this.excludeGroups.listGroups()) {
            if (f.groups.selected(g.trim())) {
              match = false
            }
          }
        }
      }
      if (match) {
        i++
        await what(f)
      }
    }
    //    await pt.done();
    return i
  }
  ui: UITools

  async show(ui: UITools, settings: ApplicationSettings) {
    this.ui = ui
    await settings._.reload()
    for (const x of [
      [
        this.$.createNewDelivery,
        settings.$.createBasketsForAllFamiliesInCreateEvent
      ],
      [this.$.includeGroups, settings.$.includeGroupsInCreateEvent],
      [this.$.excludeGroups, settings.$.excludeGroupsInCreateEvent]
    ]) {
      x[0].value = x[1].value
    }
    if (this.includeGroups.evilGet() != '') {
      this.moreOptions = true
    }
    this._selectedDistributionList = ui.distCenter
    if (ui.distCenter == null) this.allDistCenters = true

    let notDoneDeliveries = await remult.repo(ActiveFamilyDeliveries).count({
      ...FamilyDeliveries.readyFilter(),
      distributionCenter: remult.context.filterDistCenter(
        this.selectedDistributionList
      )
    })
    if (notDoneDeliveries > 0) {
      await ui.messageDialog(
        getLang().thereAre +
          ' ' +
          notDoneDeliveries +
          ' ' +
          getLang().notDoneDeliveriesShouldArchiveThem
      )
      ui.navigateToComponent(
        (await import('../family-deliveries/family-deliveries.component'))
          .FamilyDeliveriesComponent
      )
      return
    }
    let threeHoursAgo = new Date()
    threeHoursAgo.setHours(threeHoursAgo.getHours() - 3)
    let recentOnTheWay = await remult.repo(ActiveFamilyDeliveries).count({
      $and: [FamilyDeliveries.onTheWayFilter()],
      courierAssingTime: { '>=': threeHoursAgo },
      distributionCenter: remult.context.filterDistCenter(
        this.selectedDistributionList
      )
    })
    if (
      recentOnTheWay > 0 &&
      !(await ui.YesNoPromise(
        getLang().thereAre +
          ' ' +
          recentOnTheWay +
          ' ' +
          getLang().deliveresOnTheWayAssignedInTheLast3Hours
      ))
    ) {
      ui.navigateToComponent(
        (await import('../family-deliveries/family-deliveries.component'))
          .FamilyDeliveriesComponent
      )
      return
    }
    this.useFamilyBasket = true

    let archiveHelperFields =
      await this.archiveHelper.initArchiveHelperBasedOnCurrentDeliveryInfo(
        {
          distributionCenter: remult.context.filterDistCenter(
            this.selectedDistributionList
          )
        },
        settings.usingSelfPickupModule
      )

    await ui.inputAreaDialog({
      title: settings.lang.createNewEvent,
      helpText: settings.lang.createNewEventHelp,
      fields: [
        ...archiveHelperFields,
        ...[...this.$].filter((x) => x != this.$.archiveHelper)
      ],
      ok: async () => {
        let deliveriesCreated = await this.createNewEvent()
        ui.refreshFamiliesAndDistributionCenters()
        ui.distCenter = ui.distCenter
        ui.Error(deliveriesCreated + ' ' + settings.lang.deliveriesCreated)
      },
      cancel: () => {},
      validate: async () => {
        let count = await remult.repo(ActiveFamilyDeliveries).count({
          distributionCenter: remult.context.filterDistCenter(
            this.selectedDistributionList
          )
        })
        if (count > 0) {
          if (
            !(await ui.YesNoPromise(
              getLang().confirmArchive +
                ' ' +
                count +
                ' ' +
                getLang().deliveries
            ))
          )
            throw getLang().actionCanceled
        }
        if (
          this.createNewDelivery &&
          !(await ui.YesNoPromise(
            getLang().create +
              ' ' +
              (await this.countNewDeliveries()) +
              ' ' +
              getLang().newDeliveriesQM
          ))
        )
          throw getLang().actionCanceled
      }
    })
  }

  @BackendMethod({
    queue: true,
    allowed: Roles.admin,
    paramTypes: [ProgressListener]
  })
  async countNewDeliveries(progress?: ProgressListener) {
    return this.iterateFamilies(async () => {}, progress)
  }
}
