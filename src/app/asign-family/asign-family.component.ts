import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  OnDestroy
} from '@angular/core'
import { FieldRef, EntityFilter, remult } from 'remult'

import { DeliveryStatus } from '../families/DeliveryStatus'
import { YesNo } from '../families/YesNo'

import { Helpers, HelpersBase } from '../helpers/helpers'
import { DialogService, DestroyHelper } from '../select-popup/dialog'
import { UserFamiliesList } from '../my-families/user-families'

import { environment } from '../../environments/environment'
import { Route, ActivatedRoute } from '@angular/router'

import { ApplicationSettings } from '../manage/ApplicationSettings'

import { BasketType } from '../families/BasketType'

import { isPhoneSubstring, Phone } from '../model-shared/phone'
import {
  BusyService,
  openDialog,
  SelectValueDialogComponent
} from '../common-ui-elements'
import { DataAreaSettings, InputField } from '../common-ui-elements/interfaces'
import { distCenterAdminGuard } from '../auth/guards'
import { Roles } from '../auth/roles'
import { GroupsStats } from '../manage/manage.component'
import { GroupsStatsPerDistributionCenter } from '../manage/GroupsStatsPerDistributionCenter'
import { GroupsStatsForAllDeliveryCenters } from '../manage/GroupsStatsForAllDeliveryCenters'

import { SelectCompanyComponent } from '../select-company/select-company.component'
import { SelectHelperComponent } from '../select-helper/select-helper.component'
import { FamilyDeliveries } from '../families/FamilyDeliveries'
import { SelectFamilyComponent } from '../select-family/select-family.component'
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'

import { HelperFamiliesComponent } from '../helper-families/helper-families.component'
import { moveDeliveriesHelper } from '../helper-families/move-deliveries-helper'

import { use } from '../translate'
import { getLang } from '../sites/sites'
import { InputAreaComponent } from '../select-popup/input-area/input-area.component'
import {
  AsignFamilyController,
  BasketInfo,
  CityInfo
} from './asign-family.controller'
import { helperInList, mapHelpers, searchHelpersByIdentifier } from '../helpers/query-helpers'
import { MatAutocompleteTrigger } from '@angular/material/autocomplete'

@Component({
  selector: 'app-asign-family',
  templateUrl: './asign-family.component.html',
  styleUrls: ['./asign-family.component.scss']
})
export class AsignFamilyComponent implements OnInit, OnDestroy {
  static route: Route = {
    path: 'assign-families',
    component: AsignFamilyComponent,
    canActivate: [distCenterAdminGuard]
  }
  @ViewChild('identifierInput', { static: false }) identifierInput: ElementRef
  @ViewChild('autocompleteTrigger', { read: MatAutocompleteTrigger }) autocompleteTrigger: MatAutocompleteTrigger

  canSeeCenter() {
    return remult.isAllowed(Roles.admin)
  }
  assignOnMap() {
    this.familyLists.forceShowMap = true
    setTimeout(() => {
      this.helperFamilies.switchToMap()

      setTimeout(() => {
        this.familyLists.startAssignByMap(
          this.filterCity,
          this.filterGroup,
          this.dialog.distCenter,
          this.filterArea,
          this.basketType.basket
        )
        setTimeout(() => {
          this.assignButton.nativeElement.scrollIntoView({
            block: 'start',
            behavior: 'smooth'
          })
        }, 100)
      }, 50)
    }, 50)
  }
  @ViewChild('assignButton', { static: false }) assignButton: ElementRef
  @ViewChild('helperFamilies', { static: false })
  helperFamilies: HelperFamiliesComponent

  hasPreferred() {
    return (
      this.familyLists.helper.preferredDistributionAreaAddress ||
      this.familyLists.helper.preferredFinishAddress
    )
  }
  preferredText() {
    if (this.hasPreferred()) {
      let r = this.familyLists.helper.preferredDistributionAreaAddress
      if (this.familyLists.helper.preferredFinishAddress) {
        if (r.length > 0) r += ', '
        r += this.familyLists.helper.preferredFinishAddress
      }
      return this.settings.lang.volunteerPreferences + ': ' + r
    }
  }
  async editHelper() {
    await this.familyLists.helper.displayEditDialog(this.dialog)
    if (this.identifier != this.familyLists.helper.phone.thePhone)
      this.identifier = this.familyLists.helper.phone.thePhone
  }
  async searchIdentifier() {
    this.clearHelperInfo(false)
    const cleanPhone = Phone.fixPhoneInput(this.identifier)
    const isPhone = isPhoneSubstring(cleanPhone)

    if (isPhone && this.isValidPhone()) {
      this.identifier = cleanPhone
      let thisPhone = new Phone(this.identifier)
      await this.busy.donotWait(async () => {
        let helper = await remult.repo(Helpers).findFirst({ phone: thisPhone })
        if (helper) {
          this.initHelper(helper)
        } else if (this.identifier == cleanPhone) {
          helper = remult.repo(Helpers).create()
          helper.phone = thisPhone
          this.initHelper(helper)
        }
      })
      this.autocompleteTrigger.closePanel()
    } else {
      this.identifier = isPhone ? cleanPhone : this.identifier
      this.busy.donotWait(async () => {
        this.helperSuggestions = await searchHelpersByIdentifier(this.identifier)
      })
    }
  }
  isValidPhone() {
    const cleanPhone = Phone.fixPhoneInput(this.identifier)

    return (
      cleanPhone.length == 10 ||
      (cleanPhone.startsWith('+') && cleanPhone.length > 11)
    )
  }
  helperStats = ''
  async initHelper(helper: HelpersBase) {
    let other = helper.theHelperIAmEscorting
    if (other) {
      if (
        await openDialog(
          YesNoQuestionComponent,
          (q) =>
            (q.args = {
              question:
                helper.name +
                ' ' +
                this.settings.lang.isDefinedAsEscortOf +
                ' ' +
                other.name +
                '. ' +
                this.settings.lang.displayFamiliesOf +
                ' ' +
                other.name +
                '?'
            }),
          (q) => q.yes
        )
      ) {
        this.initHelper(other)
      } else this.clearHelperInfo()
      return
    }
    if (!helper.isNew())
      AsignFamilyController.getHelperStats(helper.id).then(
        (stats) => (this.helperStats = stats)
      )
    else this.helperStats = ''
    this.helper = await helper.getHelper()
    this.initArea()
    this.identifier = this.helper.phone.thePhone
    if (helper.isNew()) {
      await this.refreshList()
    } else {
      Helpers.addToRecent(helper)
      await this.refreshList()
      await helper.$.leadHelper.load()
      if (helper.leadHelper && this.familyLists.toDeliver.length == 0) {
        new moveDeliveriesHelper(this.settings, this.dialog, () =>
          this.familyLists.reload()
        ).move(
          helper.leadHelper,
          this.familyLists.helper,
          false,
          this.settings.lang.for +
            ' "' +
            this.familyLists.helper.name +
            '" ' +
            this.settings.lang.isDefinedAsLeadVolunteerOf +
            ' "' +
            helper.leadHelper.name +
            '".'
        )
      }
    }
  }

  // Request helpers from API, and add the most recent ones on top
  initHelperSuggestions() {
    this.busy.donotWait(async () => {
      const apiSuggestions = await searchHelpersByIdentifier('')
      const recentHelperIds = Helpers.recentHelpers.map((x) => x.id)
      this.helperSuggestions = [
        ...mapHelpers(Helpers.recentHelpers, (x) => undefined),
        ...apiSuggestions.filter(h => !recentHelperIds.includes(h.helperId))
      ]
    })
  }

  clearHelperInfo(clearIdentifier = true) {
    this.helper = undefined
    this.area = undefined
    if (clearIdentifier) {
      this.identifier = ''
      this.initHelperSuggestions()
    }
    this.familyLists.setRouteStats(undefined)
    this.preferRepeatFamilies = true
    this.showRepeatFamilies = false
    this.clearList()
    if (this.identifierInput)
      setTimeout(() => {
        this.identifierInput.nativeElement.focus()
      }, 200)
  }

  filterCity = ''
  filterArea = use.language.allRegions
  allBaskets: BasketInfo = {
    id: 'undefined',
    name: this.settings.lang.allBaskets,
    unassignedFamilies: 0,
    basket: null
  }
  basketType: BasketInfo = this.allBaskets
  selectCity() {
    this.refreshBaskets()
  }

  async assignmentCanceled() {
    this.lastRefreshRoute = this.lastRefreshRoute.then(
      async () => await this.refreshBaskets()
    )
    this.doRefreshRoute()
  }
  moveBasktesFromOtherHelper() {
    openDialog(
      SelectHelperComponent,
      (s) =>
        (s.args = {
          filter: {
            deliveriesInProgress: { '>=': 1 },
            id: { '!=': this.helper.id }
          },
          hideRecent: true,
          onSelect: async (h) => {
            if (h) {
              await this.verifyHelperExistance()
              new moveDeliveriesHelper(this.settings, this.dialog, () =>
                this.familyLists.reload()
              ).move(h, this.familyLists.helper, false, '', true)
            }
          }
        })
    )
  }

  showHelperInput = true
  specificToHelper(h: HelpersBase) {
    this.showHelperInput = false
    this.identifier = h.phone.thePhone
    this.initHelper(h)
  }
  lastRefreshRoute = Promise.resolve()
  useGoogleOptimization = true
  doRefreshRoute() {
    this.lastRefreshRoute = this.lastRefreshRoute
      .then(
        async () =>
          await this.busy.donotWait(
            async () =>
              await this.familyLists.refreshRoute({
                doNotUseGoogle: !this.useGoogleOptimization
              })
          )
      )
      .catch((x) => (this.lastRefreshRoute = Promise.resolve()))
  }
  smsSent() {
    this.clearHelperInfo()
  }

  async refreshBaskets() {
    await this.busy.donotWait(async () => {
      let groups: Promise<GroupsStats[]>
      if (!this.dialog.distCenter) {
        groups = remult
          .repo(GroupsStatsForAllDeliveryCenters)
          .find({ where: { familiesCount: { '>': 0 } }, limit: 1000 })
      } else
        groups = remult.repo(GroupsStatsPerDistributionCenter).find({
          where: {
            familiesCount: { '>': 0 },
            distCenter: this.dialog.filterDistCenter()
          },
          limit: 1000
        })
      groups.then((g) => {
        this.groups = g
        if (
          this.filterGroup != '' &&
          !this.groups.find((x) => x.name == this.filterGroup)
        ) {
          this.groups.push({ name: this.filterGroup, familiesCount: 0 })
        }
      })

      let r = await AsignFamilyController.getBasketStatus(
        this.helper,
        this.basketType.basket,
        this.dialog.distCenter,
        {
          filterGroup: this.filterGroup,
          filterCity: this.filterCity,
          filterArea: this.filterArea
        }
      )
      this.baskets = [this.allBaskets]
      this.baskets.push(
        ...(await Promise.all(
          r.baskets.map(async (x) => ({
            ...x,
            basket: await remult.repo(BasketType).findId(x.id)
          }))
        ))
      )
      this.allBaskets.unassignedFamilies = 0
      let found = false
      if (this.basketType == this.allBaskets) found = true
      for (const iterator of this.baskets) {
        this.allBaskets.unassignedFamilies += +iterator.unassignedFamilies
        if (!found && this.basketType.id == iterator.id) {
          this.basketType = iterator
          found = true
        }
      }

      this.cities = r.cities
      if (
        this.filterCity != '' &&
        !this.cities.find((x) => x.name == this.filterCity)
      ) {
        this.cities.push({ name: this.filterCity, unassignedFamilies: 0 })
      }

      this.areas = r.areas
      if (
        this.filterArea != getLang().allRegions &&
        !this.areas.find((x) => x.name == this.filterArea)
      ) {
        this.areas.push({ name: this.filterArea, unassignedFamilies: 0 })
      }

      this.specialFamilies = +r.special
      this.repeatFamilies = r.repeatFamilies
      if (this.repeatFamilies.length > 0) this.showRepeatFamilies = true
      await groups
    })
  }

  baskets: BasketInfo[] = []
  trackBasket(undefined, c: CityInfo) {
    return c.name
  }
  cities: CityInfo[] = []
  trackCity(x, c: CityInfo) {
    return c.name
  }
  areas: CityInfo[] = []
  specialFamilies = 0
  showRepeatFamilies = false
  repeatFamilies: string[] = []

  preferRepeatFamilies = true
  async refreshList() {
    await Promise.all([
      this.familyLists.initForHelper(this.helper),
      this.refreshBaskets()
    ])
  }
  destroyHelper = new DestroyHelper()
  ngOnDestroy(): void {
    this.destroyHelper.destroy()
  }
  familyLists = new UserFamiliesList(this.settings, this.destroyHelper)
  filterGroup = ''
  groups: GroupsStats[] = []
  trackGroup(a, g: GroupsStats) {
    return g.name
  }
  identifier: string
  helper: Helpers
  helperSuggestions: helperInList[] = []

  area: DataAreaSettings = new DataAreaSettings({})
  changeShowCompany() {
    this.initArea()
    this.settings.save()
  }

  private initArea() {
    if (this.helper)
      this.area = new DataAreaSettings({
        fields: () => {
          let r = []
          if (this.settings.showCompanies)
            r.push([
              this.helper.$.name,
              {
                field: this.helper.$.company,
                click: () => this.findCompany(),
                clickIcon: 'search'
              }
            ])
          else r.push([this.helper.$.name])
          if (this.settings.showHelperComment)
            r.push(this.helper.$.eventComment)
          if (this.settings.manageEscorts) {
            r.push([this.helper.$.needEscort, this.helper.$.escort])
          }

          return r
        }
      })
  }

  clearList() {
    this.familyLists.clear()
  }

  constructor(
    public dialog: DialogService,
    public busy: BusyService,
    public settings: ApplicationSettings,
    private route: ActivatedRoute
  ) {
    this.dialog.onDistCenterChange(
      () => this.refreshBaskets(),
      this.destroyHelper
    )
  }

  filterOptions: FieldRef<unknown, boolean>[] = []
  async ngOnInit() {
    this.initHelperSuggestions()
    this.filterOptions.push(
      this.settings.$.showGroupsOnAssing,
      this.settings.$.showCityOnAssing,
      this.settings.$.showAreaOnAssing,
      this.settings.$.showBasketOnAssing,
      this.settings.$.showNumOfBoxesOnAssing
    )
    this.initArea()
    this.familyLists.userClickedOnFamilyOnMap = async (families) => {
      families = await (
        await remult.repo(ActiveFamilyDeliveries).find({
          where: { id: families, $and: [FamilyDeliveries.readyFilter()] }
        })
      ).map((x) => x.id)
      if (families.length == 1)
        await this.assignFamilyBasedOnIdFromMap(families[0])
      else if (families.length > 1) {
        if (
          await this.dialog.YesNoPromise(
            this.settings.lang.atThisLocationThereAre +
              ' ' +
              families.length +
              this.settings.lang.deliveriesAssignAllOfThem
          )
        )
          await this.busy.doWhileShowingBusy(async () => {
            for (const iterator of families) {
              await this.assignFamilyBasedOnIdFromMap(iterator)
            }
          })
        else await this.assignFamilyBasedOnIdFromMap(families[0])
      }
    }

    if (!environment.production && this.showHelperInput) {
      this.identifier = ''
      await this.searchIdentifier()
    }
    this.route.queryParamMap.subscribe(async (x) => {
      var phone = x.get('phone')
      if (phone) {
        this.identifier = phone
        await this.searchIdentifier()
        if (this.helper.isNew()) this.helper.name = x.get('name')
      }
    })
  }
  numOfBaskets: number = 1
  private async assignFamilyBasedOnIdFromMap(familyId: string) {
    await this.busy.donotWait(async () => {
      let f = await remult
        .repo(ActiveFamilyDeliveries)
        .findId(familyId, { useCache: false })
      if (
        f &&
        f.deliverStatus == DeliveryStatus.ReadyForDelivery &&
        !f.courier
      ) {
        this.performSpecificFamilyAssignment(f, 'assign based on map')
      }
    })
  }

  add(what: number) {
    this.numOfBaskets += what
    if (this.numOfBaskets < 1) this.numOfBaskets = 1
  }
  getBasketsToClick() {
    return this.basketType.unassignedFamilies
  }
  assigning = false
  async assignItem(allRepeat?: boolean) {
    this.assigning = true

    try {
      await this.verifyHelperExistance()
      let x = await AsignFamilyController.AddBox(
        this.helper,
        this.basketType.basket,
        this.dialog.distCenter,
        {
          group: this.filterGroup,
          city: this.filterCity,
          area: this.filterArea,
          numOfBaskets: allRepeat
            ? this.repeatFamilies.length
            : this.numOfBaskets,
          preferRepeatFamilies:
            this.preferRepeatFamilies && this.repeatFamilies.length > 0,
          allRepeat: allRepeat
        }
      )
      if (x.addedBoxes) {
        let refreshBaskets = this.basketType.basket == undefined
        if (x.familiesInSameAddress.length > 0) {
          if (
            await this.dialog.YesNoPromise(
              this.settings.lang.thereAreAdditional +
                ' ' +
                x.familiesInSameAddress.length +
                ' ' +
                this.settings.lang.deliveriesAtSameAddress
            )
          ) {
            await this.busy.doWhileShowingBusy(async () => {
              this.dialog.analytics('More families in same address')
              for (const id of x.familiesInSameAddress) {
                let f = await remult
                  .repo(ActiveFamilyDeliveries)
                  .findFirst({ id, $and: [FamilyDeliveries.readyFilter()] })
                f.courier = this.helper
                await f.save()
              }
            })
          }
        }
        if (!refreshBaskets) {
          this.basketType.unassignedFamilies -= x.addedBoxes
        } else {
          this.refreshBaskets()
        }

        this.dialog.analytics('Assign Family')
        if (this.baskets == undefined)
          this.dialog.analytics('Assign any Family (no box)')
        if (this.filterGroup) this.dialog.analytics('assign family-group')
        if (this.filterCity) this.dialog.analytics('assign family-city')
        if (this.numOfBaskets > 1)
          this.dialog.analytics('assign family boxes=' + this.numOfBaskets)
      } else {
        this.refreshList()
        this.dialog.Info(this.settings.lang.noMatchingDelivery)
      }
      this.assigning = false
    } catch (err) {
      this.assigning = false
      await this.dialog.exception(this.settings.lang.assignDeliveryMenu, err)
    }
  }

  findCompany() {
    openDialog(
      SelectCompanyComponent,
      (s) => (s.argOnSelect = (x) => (this.helper.company = x))
    )
  }

  addSpecial() {
    this.addFamily(
      {
        deliverStatus: DeliveryStatus.ReadyForDelivery,
        courier: null,
        special: YesNo.Yes
      },
      'special'
    )
  }
  addFamily(
    filter: EntityFilter<ActiveFamilyDeliveries>,
    analyticsName: string,
    selectStreet?: boolean,
    allowShowAll?: boolean
  ) {
    openDialog(
      SelectFamilyComponent,
      (x) =>
        (x.args = {
          where: {
            city: this.filterCity ? this.filterCity : undefined,
            area:
              this.filterArea != use.language.allRegions
                ? this.filterArea
                : undefined,
            $and: [filter]
          },
          allowShowAll,
          selectStreet,
          distCenter: this.dialog.distCenter,
          onSelect: async (selectedDeliveries) => {
            for (const f of selectedDeliveries) {
              let ok = async () => {
                await this.performSpecificFamilyAssignment(f, analyticsName)
              }

              if (f.courier) {
                if (selectStreet) return
                let c = await f.courier
                this.dialog.YesNoQuestion(
                  this.settings.lang.theFamily +
                    ' ' +
                    f.name +
                    this.settings.lang.isAlreadyAsignedTo +
                    ' ' +
                    c.name +
                    ' ' +
                    this.settings.lang.onStatus +
                    ' ' +
                    f.deliverStatus.caption +
                    '. ' +
                    this.settings.lang.shouldAssignTo +
                    ' ' +
                    this.helper.name +
                    '?',
                  async () => {
                    await ok()
                  }
                )
              } else await ok()
            }
          }
        })
    )
  }

  private async performSpecificFamilyAssignment(
    f: ActiveFamilyDeliveries,
    analyticsName: string
  ) {
    await this.verifyHelperExistance()
    if (this.helper.blockedFamilies?.includes(f.family)) {
      if (
        !(await this.dialog.YesNoPromise(
          `משפחת ${f.name} חסומה עבור המתנדב ${this.helper.name} האם לשייך בכל זאת?`
        ))
      ) {
        return
      }
    }
    f.courier = this.helper
    f.deliverStatus = DeliveryStatus.ReadyForDelivery
    this.dialog.analytics(analyticsName)
    await f.save()
    setTimeout(() => {
      this.refreshBaskets()
    }, 300)
  }
  private async assignMultipleFamilies(ids: string[], quantity = 0) {
    await this.verifyHelperExistance()
    await AsignFamilyController.assignMultipleFamilies(this.helper, {
      ids,
      quantity
    })
    this.refreshList()
  }

  showSave() {
    return this.helper && this.helper._.wasChanged()
  }
  async saveHelper() {
    await this.verifyHelperExistance()
    this.clearHelperInfo()
  }
  async verifyHelperExistance() {
    if (this.showSave()) {
      try {
        let isNew = this.helper.isNew()
        await this.helper.save()
        if (isNew) await this.familyLists.initForHelper(this.helper)
      } catch (err) {
        await this.dialog.exception(this.settings.lang.saveVolunteerInfo, err)
        throw err
      }
    }
    Helpers.addToRecent(this.helper)
  }
  addRepeat() {
    this.addFamily({ id: this.repeatFamilies }, 'repeat-families')
  }
  addSpecific() {
    this.addFamily(
      FamilyDeliveries.readyFilter(
        this.filterCity,
        this.filterGroup,
        this.filterArea,
        this.basketType.basket
      ),
      'specific',
      false,
      true
    )
  }
  addStreet() {
    this.addFamily(
      FamilyDeliveries.readyFilter(
        this.filterCity,
        this.filterGroup,
        this.filterArea,
        this.basketType.basket
      ),
      'street',
      true
    )
  }
  async addBuilding() {
    let rows = await AsignFamilyController.selectBuildings(
      this.basketType.basket,
      this.dialog.distCenter,
      {
        filterCity: this.filterCity,
        filterArea: this.filterArea,
        filterGroup: this.filterGroup
      }
    )
    if (rows.length == 0) {
      this.dialog.Error(this.settings.lang.noDeliveriesLeft)
    } else {
      openDialog(SelectValueDialogComponent, (x) =>
        x.args({
          values: rows.map((r) => ({
            caption: r.address + ' - (' + r.quantity + ')',
            item: r
          })),
          onSelect: async (r) => {
            let q = new InputField<number>({
              valueType: Number,
              caption: this.settings.lang.quantity
            })
            q.value = r.item.quantity
            await openDialog(
              InputAreaComponent,
              (x) =>
                (x.args = {
                  fields: [q],
                  title:
                    this.settings.lang.quantity +
                    ' ' +
                    this.settings.lang.for +
                    ' ' +
                    r.item.address,
                  cancel: () => {},
                  ok: async () => {
                    await this.assignMultipleFamilies(r.item.ids, q.value)
                  }
                })
            )
          },
          title: this.settings.lang.assignBuildings
        })
      )
    }
  }
}
