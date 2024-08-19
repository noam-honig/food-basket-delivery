import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  NgZone,
  OnChanges,
  SimpleChanges
} from '@angular/core'

import copy from 'copy-to-clipboard'
import { DialogService } from '../select-popup/dialog'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { remult } from 'remult'

import { use } from '../translate'
import { GetVolunteerFeedback } from '../update-comment/update-comment.component'

import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { ApplicationSettings } from '../manage/ApplicationSettings'

import { getLang, Sites } from '../sites/sites'
import { Phone } from '../model-shared/phone'
import { UserFamiliesList } from '../my-families/user-families'
import { openDialog } from '../common-ui-elements'
import { relativeDateName } from '../model-shared/types'
import { ImageInfo } from '../images/images.component'
import { SendSmsAction } from '../asign-family/send-sms-action'
import { PreviousDeliveryCommentsComponent } from '../previous-delivery-comments/previous-delivery-comments.component'
import { quantityHelper } from '../families/BasketType'
import { FamilyInfoController } from './family-info.controller'
import { AddressInfoArgs } from '../address-info/address-info.component'
import { openGoogleMaps, openWaze } from '../shared/googleApiHelpers'

@Component({
  selector: 'app-family-info',
  templateUrl: './family-info.component.html',
  styleUrls: ['./family-info.component.scss']
})
export class FamilyInfoComponent implements OnInit, OnChanges {
  remult = remult
  constructor(
    private dialog: DialogService,
    public settings: ApplicationSettings,
    private zone: NgZone
  ) {}
  ngOnChanges(changes: SimpleChanges): void {
    this.initPhones()
  }
  @Input() f: ActiveFamilyDeliveries
  @Input() showHelp = false
  @Input() hideSal = false
  @Input() partOfAssign: Boolean
  @Output() assignmentCanceled = new EventEmitter<void>()
  @Input() userFamilies: UserFamiliesList
  @Input() selfPickupScreen = false
  @Input() callerScreen = false
  hasImages = false
  images: ImageInfo[]
  phones: { phone: Phone; desc: string }[]
  secondAddressArgs: AddressInfoArgs
  async ngOnInit() {
    this.initPhones() //[ ] remove
    if (this.f && remult.authenticated()) {
      this.hasImages = await this.dialog.donotWait(() =>
        FamilyDeliveries.hasFamilyImages(this.f.family, this.f.id)
      )
    }
    if (this.f.deliveryType.displaySecondAddress) {
      this.secondAddressArgs = {
        useWaze: this.userFamilies.useWaze,
        title: this.f.deliveryType.secondAddressCaption,
        callerScreen: this.callerScreen,
        completed: () => this.f.deliverStatus === DeliveryStatus.DriverPickedUp,
        f: {
          $: {
            phone1: this.f.$.phone1_2,
            phone1Description: this.f.$.phone1Description_2,
            phone2: this.f.$.phone2_2,
            phone2Description: this.f.$.phone2Description_2,
            appartment: this.f.$.appartment_2,
            floor: this.f.$.floor_2,
            entrance: this.f.$.entrance_2
          },
          addressComment: this.f.addressComment_2,
          addressOk: true,
          getAddressDescription: () => {
            return this.f.address_2
          },
          openGoogleMaps: () => {
            openGoogleMaps(
              this.f.addressHelper_2.getGeocodeInformation.getAddress()
            )
          },
          openWaze: () => {
            const toLocation = this.f.addressHelper_2.getlonglat
            const address = this.f.address_2
            openWaze(toLocation, address)
          }
        }
      }
    } else this.secondAddressArgs = undefined

    this.refreshWhatToTake()
  }
  whatToTake: string = ''
  initPhones() {
    //[ ] remove
    this.phones = [
      { phone: this.f.phone1, desc: this.f.phone1Description },
      { phone: this.f.phone2, desc: this.f.phone2Description },
      { phone: this.f.phone3, desc: this.f.phone3Description },
      { phone: this.f.phone4, desc: this.f.phone4Description }
    ].filter((x) => x.phone)
  }

  private refreshWhatToTake() {
    let toTake = new quantityHelper()
    this.whatToTake = ''
    toTake.parseComment(this.f.items)
    if (this.f.basketType) {
      toTake.parseComment(this.f.basketType.whatToTake, this.f.quantity)
    }
    this.whatToTake = toTake.toString(
      this.userFamilies?.labs || true ? undefined : ', '
    )
  }

  async loadImages() {
    this.images = await FamilyDeliveries.getFamilyImages(
      this.f.family,
      this.f.id
    )
  }
  actuallyShowHelp() {
    return (
      this.showHelp &&
      this.f.deliverStatus != DeliveryStatus.ReadyForDelivery &&
      this.f.deliverStatus != DeliveryStatus.DriverPickedUp
    )
  }
  async showTz() {
    this.dialog.messageDialog(
      await FamilyInfoController.ShowFamilyTz(this.f.id)
    )
  }
  async showHistory() {
    openDialog(
      PreviousDeliveryCommentsComponent,
      (x) =>
        (x.args = {
          family: this.f.family
        })
    )
  }
  courierCommentsDateRelativeDate() {
    return relativeDateName({ d: this.f.courierCommentsDate })
  }

  showCancelAssign(f: ActiveFamilyDeliveries) {
    return (
      this.partOfAssign &&
      f.courier &&
      (f.deliverStatus == DeliveryStatus.ReadyForDelivery ||
        f.deliverStatus == DeliveryStatus.DriverPickedUp)
    )
  }
  showFamilyPickedUp(f: ActiveFamilyDeliveries) {
    return (
      f.deliverStatus == DeliveryStatus.SelfPickup ||
      (f.deliverStatus == DeliveryStatus.ReadyForDelivery &&
        !f.courier &&
        this.selfPickupScreen)
    )
  }
  async updatePickedUp() {
    this.f.deliverStatus = DeliveryStatus.DriverPickedUp
    await this.f.save()
  }
  async cancelUpdatePickedUp() {
    this.f.deliverStatus = DeliveryStatus.ReadyForDelivery
    await this.f.save()
  }
  showPickedUp() {
    return this.f.deliverStatus == DeliveryStatus.ReadyForDelivery
  }
  showCancelUpdatePickedUp() {
    return this.f.deliverStatus == DeliveryStatus.DriverPickedUp
  }

  async getPickupComments(f: ActiveFamilyDeliveries) {
    openDialog(
      GetVolunteerFeedback,
      (x) =>
        (x.args = {
          family: f,
          comment: f.courierComments,
          helpText: (s) => s.commentForSuccessDelivery,
          ok: async (comment) => {
            f.deliverStatus = DeliveryStatus.SuccessPickedUp
            f.courierComments = comment
            f.checkNeedsWork()
            try {
              await f.save()
              this.dialog.analytics('Self Pickup')
            } catch (err) {
              this.dialog.Error(err)
            }
          },
          cancel: () => {}
        })
    )
  }

  async labSelfReception(d: ActiveFamilyDeliveries) {
    if (await this.dialog.YesNoPromise(getLang().shouldArchiveDelivery)) {
      {
        d.archive = true
        d.distributionCenter = await remult.context.getUserDistributionCenter()
        d.deliverStatus = DeliveryStatus.Success
        await d.save()
      }
    }
  }
  async privateCall() {
    this.dialog.analytics('Private Call')
    let r = await FamilyInfoController.privateCall(this.f.id)
    if (r.error) this.dialog.Error(r.error)
    else
      this.zone.run(() => {
        window.location.href = 'tel:' + r.phone
      })
  }
  callPhone(col: Phone) {
    //[ ] remove
    col?.call()
  }
  async sendWhatsapp(phone: Phone) {
    //[ ] remove
    phone.sendWhatsapp(
      SendSmsAction.getSuccessMessage(
        this.settings.successMessageText,
        this.settings.organisationName,
        this.f.name
      )
    )
  }

  async familiyPickedUp(f: ActiveFamilyDeliveries) {
    ;(await this.settings.isSytemForMlt)
      ? this.labSelfReception(f)
      : this.getPickupComments(f)
  }

  async cancelAssign(f: ActiveFamilyDeliveries) {
    this.assignmentCanceled.emit()
  }
  navigate(f: ActiveFamilyDeliveries) {
    //[ ] - remove
    if (!f.addressOk) {
      this.dialog.YesNoQuestion(use.language.addressNotOkOpenWaze, () => {
        if (this.userFamilies.useWaze) f.openWaze()
        else f.openGoogleMaps()
      })
    } else if (this.userFamilies.useWaze) f.openWaze()
    else f.openGoogleMaps()
  }
  async udpateInfo(f: ActiveFamilyDeliveries) {
    let x = f.courier
    await f.showDetailsDialog({
      ui: this.dialog,
      refreshDeliveryStats: () => {
        x = f.courier
        this.refreshWhatToTake()
        if (this.userFamilies) this.userFamilies.reload()
      }
    })
    if (x != f.courier) if (this.userFamilies) this.userFamilies.reload()
    this.ngOnInit()
  }
  copyAddress(f: ActiveFamilyDeliveries) {
    copy(f.address)
    this.dialog.Info(
      use.language.address +
        ' ' +
        f.address +
        ' ' +
        use.language.wasCopiedSuccefully
    )
  }
  showStatus() {
    if (this.f.deliverStatus == DeliveryStatus.SelfPickup) return false
    if (this.selfPickupScreen) return true
    return (
      this.f.deliverStatus != DeliveryStatus.ReadyForDelivery &&
      this.f.deliverStatus != DeliveryStatus.DriverPickedUp &&
      !this.callerScreen
    )
  }
}
