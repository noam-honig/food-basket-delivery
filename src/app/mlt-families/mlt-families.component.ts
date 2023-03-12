import { Component, Input, OnInit } from '@angular/core'
import { BusyService, openDialog } from '../common-ui-elements'
import { remult } from 'remult'
import { Roles } from '../auth/roles'

import { DeliveryStatus } from '../families/DeliveryStatus'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'

import {
  DeliveryInList,
  HelperFamiliesController
} from '../helper-families/helper-families.controller'
import { HelperGifts } from '../helper-gifts/HelperGifts'
import { MyGiftsDialogComponent } from '../helper-gifts/my-gifts-dialog.component'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { DistributionCenters } from '../manage/distribution-centers'
import { MyFamiliesComponent } from '../my-families/my-families.component'
import { SelectListComponent } from '../select-list/select-list.component'
import { DialogService } from '../select-popup/dialog'
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component'
import {
  getCurrentLocation,
  GetDistanceBetween,
  Location
} from '../shared/googleApiHelpers'
import { use } from '../translate'
import { MltFamiliesController } from './mlt-families.controller'

@Component({
  selector: 'app-mlt-families',
  templateUrl: './mlt-families.component.html',
  styleUrls: ['./mlt-families.component.scss']
})
export class MltFamiliesComponent implements OnInit {
  deliveryList = 'deliveryList'
  deliveryInfo = 'deliveryInfo'
  problemInfo = 'problemInfo'
  myProfile = 'myProfile'
  reception = 'reception'
  markReception = 'markReception'
  display = this.deliveryList
  distCentersButtons = []
  deliveredSinceEver = 0

  showQRCode: boolean = false

  giftCount = 0
  thisHelper
  myPhoneNumber: string = ''
  today = new Date()
  userFrozenTill = this.today
  showPopup = true

  showFrozen() {
    if (this.thisHelper) {
      let frozenTill = this.thisHelper.frozenTill
      if (frozenTill) this.userFrozenTill = frozenTill.displayValue
      return frozenTill > this.today
    }
    return false
  }

  canSelectDonors() {
    return (
      remult.isAllowed(Roles.indie) &&
      this.getFamilies('toDeliver').length <
        this.settings
          .MaxDeliverisQuantityThatAnIndependentVolunteerCanAssignHimself
    )
  }

  myQRCode() {
    return (
      window.location.hostname + '/mlt/reception/?phone=' + this.myPhoneNumber
    )
  }

  constructor(
    public settings: ApplicationSettings,
    private dialog: DialogService,
    private busy: BusyService
  ) {}
  @Input() comp: MyFamiliesComponent
  get familyLists() {
    return this.comp.familyLists
  }
  async ngOnInit() {
    this.thisHelper = await remult.context.getCurrentUser()
    this.giftCount = await HelperGifts.getMyPendingGiftsCount(this.thisHelper)
    this.myPhoneNumber = this.thisHelper.phone
    this.userFrozenTill = this.thisHelper?.frozenTill?.displayValue
    this.distCentersButtons = []
    this.countFamilies()
    this.startPage()
  }

  getBasketsDescription(family: ActiveFamilyDeliveries, listType: string) {
    let result: string = ''
    for (const f of this.getDeliveriesList(listType)) {
      if (f.family == family.family) {
        let s = f.$.quantity.displayValue + ' X ' + f.$.basketType.displayValue
        if (result == '') result = s
        else result += '; ' + s
      }
    }

    return result
  }

  getDeliveriesList(listType: string) {
    switch (listType) {
      case 'delivered':
        return this.comp.familyLists.delivered
      case 'toDeliver':
        return this.comp.familyLists.toDeliver
      case 'problem':
        return this.comp.familyLists.problem
    }

    return []
  }

  async countFamilies() {
    let consumed: string[] = []
    let list: FamilyDeliveries[] = await remult
      .repo(FamilyDeliveries)
      .find({
        where: {
          courier: await remult.context.getCurrentUser(),
          deliverStatus: DeliveryStatus.isSuccess()
        }
      })
    let result = 0
    for (const f of list) {
      if (!consumed.includes(f.family)) {
        consumed.push(f.family)
        result++
      }
    }
    this.deliveredSinceEver = result
  }

  getFamilies(listType: string) {
    let consumed: string[] = []
    let result: ActiveFamilyDeliveries[] = []

    for (const f of this.getDeliveriesList(listType)) {
      if (!consumed.includes(f.family)) {
        consumed.push(f.family)
        result.push(f)
      }
    }
    return result
  }

  async showMyGifts() {
    openDialog(
      MyGiftsDialogComponent,
      (x) =>
        (x.args = {
          helperId: remult.user.id
        })
    )
  }

  async assignNewDelivery() {
    var volunteerLocation = await getCurrentLocation(true, this.dialog)

    let afdList = await HelperFamiliesController.getDeliveriesByLocation(
      volunteerLocation,
      true
    )

    await openDialog(SelectListComponent, (x) => {
      x.args = {
        title:
          use.language.closestDeliveries +
          ' (' +
          use.language.mergeFamilies +
          ')',
        multiSelect: true,
        onSelect: async (selectedItems) => {
          if (selectedItems.length > 0) {
            if (
              this.getFamilies('toDeliver').length + selectedItems.length >
              this.settings
                .MaxDeliverisQuantityThatAnIndependentVolunteerCanAssignHimself
            ) {
              openDialog(
                YesNoQuestionComponent,
                (x) =>
                  (x.args = {
                    question: 'חרגת משיוך מקסימלי של משלוחים',
                    showOnlyConfirm: true
                  })
              )
            } else {
              this.busy.doWhileShowingBusy(async () => {
                let ids: string[] = []
                for (const selectedItem of selectedItems) {
                  let d: DeliveryInList = selectedItem.item
                  ids.push(...d.ids)
                }
                await MltFamiliesController.assignFamilyDeliveryToIndie(ids)
                await this.familyLists.refreshRoute({
                  volunteerLocation: volunteerLocation
                })
                await this.familyLists.reload()
              })
            }
          }
        },
        options: afdList
      }
    })
  }

  selectedFamily: ActiveFamilyDeliveries
  deliveriesForFamily: ActiveFamilyDeliveries[] = []
  async selectFamily(f: ActiveFamilyDeliveries, nextDisplay) {
    this.selectedFamily = f
    this.display = nextDisplay
    if (nextDisplay == this.deliveryInfo)
      this.deliveriesForFamily = this.familyLists.toDeliver.filter(
        (x) => x.family == f.family
      )
    else if (nextDisplay == this.markReception) {
      this.deliveriesForFamily = this.familyLists.delivered.filter(
        (x) => x.family == f.family
      )
      this.distCentersButtons = await this.getDistCenterButtons()
    }
  }

  async getDistCenterButtons() {
    let { volunteerLocation, distCenters } = await this.getClosestDistCenters()
    let result = distCenters.map((y) => ({
      caption: y.name + ' ' + y.address,
      item: y
    }))
    return result
  }

  startPage() {
    this.display = this.deliveryList
    this.selectedFamily = null
    this.familyLists.initFamilies()
    this.countFamilies()
    this.openDeliveriesPopup()
  }

  async getClosestDistCenters() {
    let distCenters = await remult
      .repo(DistributionCenters)
      .find({ where: DistributionCenters.isActive })
    distCenters = distCenters.filter((x) => x.addressHelper.ok)
    let volunteerLocation: Location = undefined
    try {
      volunteerLocation = await getCurrentLocation(true, this.dialog)
    } catch {
      if (this.familyLists.allFamilies.length > 0)
        volunteerLocation = this.familyLists.allFamilies[0].getDrivingLocation()
    }
    if (volunteerLocation) {
      distCenters.sort((a, b) => {
        if (a.id == this.familyLists.distCenter.id) {
          return -1
        } else if (b.id == this.familyLists.distCenter.id) {
          return 1
        } else {
          return (
            GetDistanceBetween(a.addressHelper.location, volunteerLocation) -
            GetDistanceBetween(b.addressHelper.location, volunteerLocation)
          )
        }
      })
    }

    return { volunteerLocation, distCenters }
  }

  async setDistCenterForFamily(dc: DistributionCenters) {
    for (const f of this.deliveriesForFamily) {
      f.deliverStatus = DeliveryStatus.Success
      f.distributionCenter = dc
      f.archive = true
      await f.save()
    }
    this.startPage()
  }

  async selectDistCenter() {
    let { volunteerLocation, distCenters } = await this.getClosestDistCenters()

    await openDialog(
      SelectListComponent,
      (x) =>
        (x.args = {
          title: 'בחרו יעד למסירת הציוד',
          options: distCenters.map((y) => ({
            name:
              GetDistanceBetween(
                y.addressHelper.location,
                volunteerLocation
              ).toFixed(1) +
              ' ק"מ' +
              ', ' +
              y.name +
              ' ' +
              y.address,
            item: y
          })),
          onSelect: async (x) => {
            await MltFamiliesController.changeDestination(x[0].item.id)
            this.familyLists.reload()
          }
        })
    )
  }

  async couldntDeliverToFamily(f: ActiveFamilyDeliveries, status?) {
    let family = f.family
    for (const fd of this.comp.familyLists.toDeliver.filter(
      (x) => x.family == family
    )) {
      fd.deliverStatus = DeliveryStatus[status]
      fd.checkNeedsWork()
      try {
        await fd.save()
        this.dialog.analytics('Problem')
      } catch (err) {
        this.dialog.Error(err)
      }
    }
    this.dialog.Info('ההודעה שלך נקלטה! תודה רבה!')
    this.startPage()
  }

  async openDeliveriesPopup() {
    this.familyLists.initFamilies()
    let delivered = this.getFamilies('delivered').length
    if (this.showPopup && delivered > 0) {
      await openDialog(
        YesNoQuestionComponent,
        (x) =>
          (x.args = {
            question:
              delivered > 1
                ? ' ישנן ' + delivered + ' תרומות למסור בנקודת האיסוף '
                : 'ישנה תרומה אחת שיש להעביר לנקודת איסוף',
            yesButtonText: this.settings.lang.confirm,
            showOnlyConfirm: true
          })
      )
      this.showPopup = false
    } else this.showPopup = true
  }

  async deliveredToFamily(newComment?) {
    let f = this.selectedFamily
    if (
      await openDialog(
        YesNoQuestionComponent,
        (x) =>
          (x.args = {
            question: this.settings.commentForSuccessDelivery,
            yesButtonText: this.settings.lang.confirm
          }),
        (y) => y.yes
      )
    ) {
      await this.updateDeliveryStatus(DeliveryStatus.Success)
    }
  }

  async familyNotProblem(family: ActiveFamilyDeliveries) {
    if (
      await openDialog(
        YesNoQuestionComponent,
        (x) =>
          (x.args = {
            question:
              'להחזיר את התורם ' + family.name + ' לרשימת הממתינים לך? ',
            yesButtonText: this.settings.lang.confirm
          }),
        (y) => y.yes
      )
    ) {
      for (const f of this.getDeliveriesList('problem')) {
        if (f.family == family.family) {
          f.deliverStatus = DeliveryStatus.ReadyForDelivery
          f.checkNeedsWork()
          await f.save()
        }
      }
    }
    this.startPage()
  }

  async undoDeliveredToFamily(newComment?) {
    let f = this.selectedFamily

    if (
      await openDialog(
        YesNoQuestionComponent,
        (x) =>
          (x.args = {
            question: 'להחזיר את התורם ' + f.name + ' לרשימת הממתינים לך? ',
            yesButtonText: this.settings.lang.confirm
          }),
        (y) => y.yes
      )
    ) {
      await this.updateDeliveryStatus(DeliveryStatus.ReadyForDelivery)
    }
  }

  private async updateDeliveryStatus(s: DeliveryStatus, comment?: string) {
    for (const f of this.deliveriesForFamily) {
      f.deliverStatus = s
      if (comment) f.courierComments = comment
      f.checkNeedsWork()
      await f.save()
    }
    this.startPage()
  }

  updateComment(f: ActiveFamilyDeliveries) {
    this.dialog.inputAreaDialog({
      title: use.language.updateComment,
      fields: [f.$.courierComments],
      ok: async () => {
        if (f.isNew()) return
        f.checkNeedsWork()
        await f.save()
        this.dialog.analytics('Update Comment')
      },
      cancel: () => f._.undoChanges()
    })
  }

  async freezeUser() {
    if (!this.thisHelper) return

    let currentUser = this.thisHelper

    if (
      await openDialog(
        YesNoQuestionComponent,
        (x) =>
          (x.args = {
            question:
              'קצת מנוחה לא תזיק, נעביר את המשלוחים למישהו אחר וניתן לך הפסקה של שבועיים?',
            yesButtonText: this.settings.lang.confirm
          }),
        (y) => y.yes
      )
    ) {
      let date = new Date()
      date.setDate(date.getDate() + 14)
      currentUser.frozenTill = date
      await currentUser.save()

      for (const f of this.comp.familyLists.toDeliver) {
        f.deliverStatus = DeliveryStatus.FailedOther
        f.courierComments = 'המתנדב ביקש הקפאה זמנית'
        await f.save()
      }
      this.familyLists.reload()
    }
  }

  async unFreezeUser() {
    if (!this.thisHelper) return

    this.today = new Date()
    this.thisHelper.frozenTill = this.today
    await this.thisHelper.save()
  }

  openMessage1Link(open: boolean) {
    if (
      !this.settings.message1Link ||
      !this.settings.message1Link ||
      this.settings.message1Link == ''
    )
      return false
    if (open) window.open(this.settings.message1Link, '_blank')
    return true
  }

  showMessage1Text() {
    return this.settings.message1Text
  }
}
