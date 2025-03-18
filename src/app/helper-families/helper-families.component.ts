import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core'
import copy from 'copy-to-clipboard'
import { BusyService, openDialog } from '../common-ui-elements'
import {
  DataAreaSettings,
  GridButton,
  InputField
} from '../common-ui-elements/interfaces'
import { MapComponent } from '../map/map.component'
import { UserFamiliesList } from '../my-families/user-families'

import { SendSmsAction } from '../asign-family/send-sms-action'
import { AuthService } from '../auth/auth-service'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { DialogService } from '../select-popup/dialog'

import { remult } from 'remult'
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings'

import { MatTabGroup } from '@angular/material/tabs'
import { CommonQuestionsComponent } from '../common-questions/common-questions.component'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { Helpers, HelpersBase } from '../helpers/helpers'
import {
  GetDistanceBetween,
  Location,
  getCurrentLocation,
  isGpsAddress,
  toLongLat
} from '../shared/googleApiHelpers'
import { use } from '../translate'
import { GetVolunteerFeedback } from '../update-comment/update-comment.component'

import { relativeDateName } from '../model-shared/types'
import { InputAreaComponent } from '../select-popup/input-area/input-area.component'

import { Phone } from '../model-shared/phone'
import { SelectHelperComponent } from '../select-helper/select-helper.component'
import { getLang } from '../sites/sites'
import { moveDeliveriesHelper } from './move-deliveries-helper'

import { animate, style, transition, trigger } from '@angular/animations'

import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'
import { routeStrategy } from '../asign-family/route-strategy'
import { PromiseThrottle } from '../shared/utils'
import { HelperFamiliesController } from './helper-families.controller'

import { MatExpansionPanel } from '@angular/material/expansion'

import { environment } from '../../environments/environment'
import { AsignFamilyController } from '../asign-family/asign-family.controller'
import { Roles } from '../auth/roles'

@Component({
  selector: 'app-helper-families',
  templateUrl: './helper-families.component.html',
  styleUrls: ['./helper-families.component.scss'],
  animations: [
    trigger('message', [
      transition('void => *', [
        style({ transform: 'scale(0)', height: '0' }),
        animate('400ms ease-in')
      ]),
      transition('* => void', [
        animate(
          '500ms ease-out',
          style({ transform: 'translateX(300%) scale(0) rotate(360deg)' })
        )
      ])
    ])
  ]
})
export class HelperFamiliesComponent implements OnInit {
  switchToMap() {
    this.tab.selectedIndex = 1
  }
  trackBy(i: number, f: any) {
    return (f as ActiveFamilyDeliveries).id
  }
  afterExpand(e: HTMLElement) {
    e.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
  showBring() {
    this.dialog.Error(
      use.language.whatToTake + ':\n' + this.familyLists.whatToTake
    )
  }
  deliveryDetails(f: FamilyDeliveries, p: MatExpansionPanel) {
    if (this.familyLists.labs) {
      //TODO - fix animations
      // const dialogRef = this.animDialog.open(
      //   DeliveryDetailsComponent,
      //   this.dialog.isScreenSmall()
      //     ? {
      //         width: '100%',
      //         minWidth: '100%',
      //         height: '100vh',
      //         panelClass: 'no-padding',
      //         // option1
      //         // animation: { to: 'aside' },
      //         // option2
      //         animation: {
      //           to: this.settings.forWho.args.leftToRight ? 'left' : 'right',
      //           incomingOptions: {
      //             keyframeAnimationOptions: { duration: 200 }
      //           },
      //           outgoingOptions: {
      //             keyframeAnimationOptions: { duration: 200 }
      //           }
      //         },
      //         position: { rowEnd: '0' }
      //       }
      //     : {
      //         maxWidth: '400px',
      //         width: '400px',
      //         height: '90vh',
      //         maxHeight: '100vh',
      //         panelClass: 'no-padding'
      //       }
      // )
      // assign(dialogRef.componentInstance.famInfo, {
      //   f: f,
      //   showHelp: true,
      //   partOfAssign: this.partOfAssign,
      //   userFamilies: this.familyLists
      // })
      // assign(dialogRef.componentInstance, {
      //   deliveredToFamily: () => {
      //     this.deliveredToFamilyOk(
      //       f,
      //       DeliveryStatus.Success,
      //       () => this.settings.commentForSuccessDelivery,
      //       () => {
      //         dialogRef.close()
      //       }
      //     )
      //   },
      //   updateComment: () => this.updateComment(f),
      //   couldntDeliverToFamily: () => {
      //     this.couldntDeliverToFamily(f, () => dialogRef.close())
      //   },
      //   returnToDeliver: () => {
      //     this.returnToDeliver(f)
      //   }
      // })
      // const sub =
      //   dialogRef.componentInstance.famInfo.assignmentCanceled.subscribe(() =>
      //     this.cancelAssign(f)
      //   )
      // dialogRef.afterClosed().subscribe((x) => sub.unsubscribe())
      // dialogRef.componentInstance.famInfo.ngOnInit()
      // if (p) p.close()
      // return false
    }
  }
  signs = ['🙂', '👌', '😉', '😍', '🤩', '💖', '👍', '🙏']
  visibleSigns: string[] = []
  cool() {
    let x = Math.trunc(Math.random() * this.signs.length)
    this.visibleSigns.push(this.signs[x])
    setTimeout(() => {
      this.visibleSigns.pop()
    }, 1000)
  }
  isAdmin() {
    return remult.isAllowed(Roles.distCenterAdmin)
  }
  disableDrag = true
  toggleReorder() {
    this.disableDrag = !this.disableDrag
    if (!this.disableDrag) {
      this.dialog.Info(this.settings.lang.dragDeliveriesToChangeTheirOrder)
    }
  }
  async drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(
      this.familyLists.toDeliver,
      event.previousIndex,
      event.currentIndex
    )
    this.busy.doWhileShowingBusy(async () => {
      let t = new PromiseThrottle(15)
      let i = 1
      for (const d of this.familyLists.toDeliver) {
        d.routeOrder = i++
        await t.push(d.save())
      }
      await t.done()
      this.map.test(this.familyLists.toDeliver, this.familyLists.helper)
    })
  }
  remult = remult

  constructor(
    public auth: AuthService,
    private dialog: DialogService,
    private busy: BusyService,
    public settings: ApplicationSettings
  ) {}
  @Input() familyLists: UserFamiliesList
  @Input() partOfAssign = false
  @Input() partOfReview = false
  @Input() helperGotSms = false
  @Output() assignmentCanceled = new EventEmitter<void>()
  @Output() assignSmsSent = new EventEmitter<void>()
  @Input() preview = false
  @ViewChild('theTab', { static: false }) tab: MatTabGroup
  currentUser: Helpers
  async ngOnInit() {
    this.currentUser = await this.busy.donotWait(
      async () => await remult.context.getCurrentUser()
    )
    if (!environment.production && false)
      setTimeout(() => {
        if (this.familyLists.toDeliver.length > 0) {
          //this.deliveryDetails(this.familyLists.toDeliver[0], undefined);
        }
      }, 2000)
  }
  volunteerLocation: Location = undefined
  async updateCurrentLocation(useCurrentLocation: boolean) {
    this.volunteerLocation = await getCurrentLocation(
      useCurrentLocation,
      this.dialog
    )
  }

  async refreshRoute() {
    var useCurrentLocation = new InputField<boolean>({
      caption: use.language.useCurrentLocationForStart,
      valueType: Boolean
    })
    var strategy = new InputField<routeStrategy>({
      valueType: routeStrategy,
      caption: use.language.routeOptimization
    })
    strategy.value = this.settings.routeStrategy

    await openDialog(
      InputAreaComponent,
      (x) =>
        (x.args = {
          title: use.language.replanRoute,
          fields: [
            {
              field: useCurrentLocation,
              visible: () =>
                !this.partOfAssign &&
                !this.partOfReview &&
                !!navigator.geolocation
            },
            {
              field: this.familyLists.helper.$.preferredFinishAddress,
              visible: () => !this.settings.isSytemForMlt
            },
            {
              field: strategy,
              visible: () =>
                !this.familyLists.helper.preferredFinishAddress ||
                this.familyLists.helper.preferredFinishAddress.trim().length ==
                  0 ||
                this.settings.isSytemForMlt
            }
          ],
          cancel: () => {},
          ok: async () => {
            await this.updateCurrentLocation(useCurrentLocation.value)
            if (this.familyLists.helper._.wasChanged())
              await this.familyLists.helper.save()
            await this.familyLists.refreshRoute(
              {
                volunteerLocation: this.volunteerLocation
              },
              strategy.value
            )
          }
        })
    )
  }
  reminderSmsRelativeDate() {
    return relativeDateName({ d: this.familyLists.helper.reminderSmsDate })
  }

  reloadList() {
    this.familyLists.reload()
  }

  getHelpText() {
    var r = this.settings.lang.ifYouNeedAnyHelpPleaseCall
    r += ' '
    if (this.settings.helpText && this.settings.helpPhone)
      return (
        r + this.settings.helpText + ', ' + this.settings.helpPhone.displayValue
      )
    else {
      var h = this.currentUser
      if (h) return r + h.name + ', ' + h.phone.displayValue
    }
  }

  buttons: GridButton[] = []
  prevMap: MapComponent
  lastBounds: string
  mapTabClicked() {
    if (this.map && this.map != this.prevMap) {
      this.familyLists.setMap(this.map)
      var x = this.familyLists.userClickedOnFamilyOnMap
      this.familyLists.userClickedOnFamilyOnMap = (fams) => {
        x(fams)
        var f = this.familyLists.allFamilies.find((x) => fams.includes(x.id))
        if (f) {
          this.deliveryDetails(f, undefined)
        }
      }
      this.prevMap = this.map
    }
    if (this.map) {
      if (
        this.tab.selectedIndex == 1 &&
        this.lastBounds != this.map.lastBounds
      ) {
        this.map.lastBounds = ''
        this.map.fitBounds()
      }
      this.lastBounds = this.map.lastBounds
    }
  }
  async cancelAssign(f: ActiveFamilyDeliveries) {
    this.dialog.analytics('Cancel Assign')
    f.courier = null
    await f.save()
    this.assignmentCanceled.emit()
  }
  cancelAll() {
    this.dialog.YesNoQuestion(
      use.language.areYouSureYouWantToCancelAssignmentTo +
        ' ' +
        this.familyLists.toDeliver.length +
        ' ' +
        use.language.families +
        '?',
      async () => {
        await this.busy.doWhileShowingBusy(async () => {
          this.dialog.analytics('cancel all')
          await HelperFamiliesController.cancelAssignAllForHelperOnServer(
            this.familyLists.helper
          )
          this.assignmentCanceled.emit()
        })
      }
    )
  }
  setDefaultCourier() {
    this.familyLists.helper.setAsDefaultVolunteerToDeliveries(
      this.familyLists.toDeliver,
      this.dialog
    )
  }

  distanceFromPreviousLocation(f: ActiveFamilyDeliveries, i: number): number {
    if (i == 0) {
      return undefined
    }
    if (!f.addressOk) return undefined
    let of = this.familyLists.toDeliver[i - 1]
    if (!of.addressOk) return undefined
    return GetDistanceBetween(of.getDrivingLocation(), f.getDrivingLocation())
  }

  notMLT() {
    return !this.settings.isSytemForMlt
  }

  limitReady = new limitList(30, () => this.familyLists.toDeliver.length)
  limitDelivered = new limitList(10, () => this.familyLists.delivered.length)
  okAll() {
    this.dialog.YesNoQuestion(
      use.language
        .areYouSureYouWantToMarkDeliveredSuccesfullyToAllHelperFamilies +
        this.familyLists.toDeliver.length +
        ' ' +
        use.language.families +
        '?',
      async () => {
        await this.busy.doWhileShowingBusy(async () => {
          this.dialog.analytics('ok all')
          await HelperFamiliesController.okAllForHelperOnServer(
            this.familyLists.helper
          )
        })
      }
    )
  }
  async moveBasketsTo(to: HelpersBase) {
    await new moveDeliveriesHelper(
      this.settings,
      this.dialog,
      async () => {}
    ).move(this.familyLists.helper, to, true, '', true)
  }

  moveBasketsToOtherVolunteer() {
    openDialog(
      SelectHelperComponent,
      (s) =>
        (s.args = {
          filter: { id: { '!=': this.familyLists.helper.id } },
          hideRecent: true,
          onSelect: async (to) => {
            if (to) {
              this.moveBasketsTo(to)
            }
          }
        })
    )
  }
  async refreshDependentVolunteers() {
    this.otherDependentVolunteers = []

    this.busy.donotWaitNonAsync(async () => {
      await this.familyLists.helper.$.leadHelper.load()
      if (this.familyLists.helper.leadHelper) {
        this.otherDependentVolunteers.push(this.familyLists.helper.leadHelper)
      }
      this.otherDependentVolunteers.push(
        ...(await remult
          .repo(Helpers)
          .find({ where: { leadHelper: this.familyLists.helper } }))
      )
    })
  }
  otherDependentVolunteers: HelpersBase[] = []

  allDoneMessage() {
    return this.settings.messageForDoneDelivery
  }
  async deliveredToFamily(f: ActiveFamilyDeliveries) {
    this.deliveredToFamilyOk(
      f,
      DeliveryStatus.Success,
      (s) => s.commentForSuccessDelivery
    )
  }
  async leftThere(f: ActiveFamilyDeliveries) {
    this.deliveredToFamilyOk(
      f,
      DeliveryStatus.SuccessLeftThere,
      (s) => s.commentForSuccessLeft
    )
  }

  async deliveredToFamilyOk(
    f: ActiveFamilyDeliveries,
    status: DeliveryStatus,
    helpText: (s: ApplicationSettings) => string,
    callMeOnOk?: VoidFunction
  ) {
    openDialog(
      GetVolunteerFeedback,
      (x) =>
        (x.args = {
          family: f,
          comment: f.courierComments,
          helpText,
          questionsArea: new DataAreaSettings({
            fields: () =>
              [f.$.a1, f.$.a2, f.$.a3, f.$.a4].filter(
                (f) => !f.metadata.caption.startsWith('!')
              )
          }),
          ok: async (comment) => {
            if (!f.isNew()) {
              f.deliverStatus = status
              f.courierComments = comment
              f.checkNeedsWork()
              try {
                await f.save()
                this.cool()
                this.dialog.analytics('delivered')
                this.initFamilies()

                if (this.familyLists.toDeliver.length == 0) {
                  this.dialog.messageDialog(this.allDoneMessage())
                }
                if (
                  this.settings.allowSendSuccessMessageOption &&
                  this.settings.sendSuccessMessageToFamily
                )
                  HelperFamiliesController.sendSuccessMessageToFamily(f.id)
                if (callMeOnOk) callMeOnOk()
              } catch (err) {
                this.dialog.Error(err)
              }
            }
          },
          cancel: () => {
            f._.undoChanges()
          }
        })
    )
  }
  initFamilies() {
    this.familyLists.initFamilies()
    if (this.familyLists.toDeliver.length > 0)
      this.familyLists.toDeliver[0].distributionCenter
        .getRouteStartGeo()
        .then((x) => (this.routeStart = x))
  }
  showLeftFamilies() {
    return (
      this.partOfAssign ||
      this.partOfReview ||
      this.familyLists.toDeliver.length > 0
    )
  }
  async couldntDeliverToFamily(f: ActiveFamilyDeliveries, onOk?: VoidFunction) {
    let showUpdateFail = false
    let q = this.settings.getQuestions()
    if (!q || q.length == 0) {
      showUpdateFail = true
    } else {
      showUpdateFail = await openDialog(
        CommonQuestionsComponent,
        (x) => x.init(this.familyLists.allFamilies[0]),
        (x) => x.updateFailedDelivery
      )
    }
    if (showUpdateFail)
      openDialog(
        GetVolunteerFeedback,
        (x) =>
          (x.args = {
            family: f,
            comment: f.courierComments,
            showFailStatus: true,

            helpText: (s) => s.commentForProblem,

            ok: async (comment, status) => {
              if (f.isNew()) return
              f.deliverStatus = status
              f.courierComments = comment
              f.checkNeedsWork()
              try {
                await f.save()
                this.dialog.analytics('Problem')
                this.initFamilies()
                if (onOk) onOk()
              } catch (err) {
                this.dialog.Error(err)
              }
            },
            cancel: () => {}
          })
      )
  }
  sendMessageOption() {
    if (this.settings.useWhatsapp) return this.sendWhatsapp()
    else return this.sendSms(false)
  }
  sendMessageMenuOption() {
    if (!this.settings.useWhatsapp) return this.sendWhatsapp()
    else return this.sendSms(false)
  }
  async sendSms(reminder: Boolean) {
    this.helperGotSms = true
    this.dialog.analytics('Send SMS ' + (reminder ? 'reminder' : ''))
    let to = this.familyLists.helper.name
    await SendSmsAction.SendSms(this.familyLists.helper, reminder)
    if (getSettings().sendOnTheWaySMSToFamilyOnSendSmsToVolunteer) {
      await AsignFamilyController.sendOnTheWaySmsMessageToVolunteersFamilies(
        this.familyLists.helper
      )
    }
    if (this.familyLists.helper.escort) {
      to += ' ול' + this.familyLists.escort.name
      await SendSmsAction.SendSms(this.familyLists.helper.escort, reminder)
    }
    this.dialog.Info(use.language.smsMessageSentTo + ' ' + to)
    this.assignSmsSent.emit()
    if (reminder) {
      this.familyLists.helper.reminderSmsDate = new Date()
    }
  }

  async sendWhatsapp() {
    this.dialog.analytics('Send WhatsApp')
    Phone.sendWhatsappToPhone(
      this.familyLists.smsPhone,
      this.familyLists.smsMessage
    )
    await this.updateMessageSent('Whatsapp')
  }
  print() {
    let p = window.location.pathname.split('/')
    window.open(
      '/' + p[1] + '/print-volunteer?volunteer=' + this.familyLists.helper.id,
      '_blank'
    )
  }
  async customSms() {
    let h = this.familyLists.helper
    h.sendSmsToCourier(this.dialog)
  }

  async sendPhoneSms() {
    try {
      window.open(
        'sms:' +
          this.familyLists.smsPhone +
          ';?&body=' +
          encodeURI(this.familyLists.smsMessage),
        '_blank'
      )
      await this.updateMessageSent('Sms from user phone')
    } catch (err) {
      this.dialog.Error(err)
    }
  }
  async callHelper() {
    location.href = 'tel:' + this.familyLists.helper.phone
    if (this.settings.isSytemForMlt) {
      this.familyLists.helper.addCommunicationHistoryDialog(
        this.dialog,
        'התקשרתי'
      )
    }
  }
  callEscort() {
    window.open('tel:' + this.familyLists.escort.phone)
  }
  async updateMessageSent(type: string) {
    await SendSmsAction.documentHelperMessage(
      this.familyLists.isReminderMessage,
      this.familyLists.helper,
      type
    )
  }
  async copyMessage() {
    copy(this.familyLists.smsMessage)
    this.dialog.Info(use.language.messageCopied)
    await this.updateMessageSent('Message Copied')
  }
  async copyLink() {
    copy(this.familyLists.smsLink)
    this.dialog.Info(use.language.linkCopied)
    await this.updateMessageSent('Link Copied')
  }

  updateComment(f: ActiveFamilyDeliveries) {
    openDialog(
      GetVolunteerFeedback,
      (x) =>
        (x.args = {
          comment: f.courierComments,
          cancel: () => undefined,
          family: f,
          helpText: () => '',
          ok: async (comment) => {
            if (f.isNew()) return
            f.courierComments = comment
            f.checkNeedsWork()
            await f.save()
            this.dialog.analytics('Update Comment')
          },
          title: use.language.updateComment
        })
    )
  }
  routeStart = this.settings.addressHelper.getGeocodeInformation
  async showRouteOnGoogleMaps() {
    if (this.familyLists.toDeliver.length > 0) {
      let endOnDist = this.settings.routeStrategy.args.endOnDistributionCenter
      let url = 'https://www.google.com/maps/dir'
      if (!endOnDist)
        if (this.volunteerLocation) {
          url += '/' + encodeURI(toLongLat(this.volunteerLocation))
        } else url += '/' + encodeURI(this.routeStart.getAddress())

      for (const f of this.familyLists.toDeliver) {
        url +=
          '/' +
          encodeURI(isGpsAddress(f.address) ? f.address : f.addressByGoogle)
      }
      if (endOnDist) url += '/' + encodeURI(this.routeStart.getAddress())
      window.open(url + '?hl=' + getLang().languageCode, '_blank')
    }
    //window.open(url,'_blank');
  }
  async returnToDeliver(f: ActiveFamilyDeliveries) {
    f.deliverStatus = DeliveryStatus.ReadyForDelivery
    try {
      await f.save()
      this.dialog.analytics('Return to Deliver')
      this.initFamilies()
    } catch (err) {
      this.dialog.Error(err)
    }
  }
  @ViewChild('map', { static: false }) map: MapComponent
}

class limitList {
  constructor(public limit: number, private relevantCount: () => number) {}
  _showAll = false
  showButton() {
    return !this._showAll && this.limit < this.relevantCount()
  }
  showAll() {
    this._showAll = true
  }
  shouldShow(i: number) {
    return this._showAll || i < this.limit
  }
}
