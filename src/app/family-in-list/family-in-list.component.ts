import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { DomSanitizer } from '@angular/platform-browser'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { TranslationOptions } from '../translate'
import { Location } from '../shared/googleApiHelpers'
import { DeliveryStatus } from '../families/DeliveryStatus'

@Component({
  selector: 'app-family-in-list',
  templateUrl: './family-in-list.component.html',
  styleUrls: ['./family-in-list.component.scss']
})
export class FamilyInListComponent implements OnInit {
  constructor(
    private sanitization: DomSanitizer,
    public settings: ApplicationSettings
  ) {}
  @Input() f: ActiveFamilyDeliveries
  @Input() i: number
  @Input() newAssign: boolean
  @Input() latestAssign: boolean
  @Input() distanceFromPreviousLocation: number
  @Output() delivered = new EventEmitter<void>()
  ngOnInit() {}
  getName() {
    if (this.settings.showOnlyLastNamePartToVolunteer)
      return this.f.name.replace(/^.* /g, '')
    return this.f.name
  }

  offsetX() {
    return this.sanitization.bypassSecurityTrustStyle(
      'translateX(' + this.offsetXValue + 'px)'
    )
  }
  offsetXValue = 0
  getAddressDescription() {
    if (
      this.f.deliveryType.showSecondAddressAsPickupAddress &&
      this.f.deliverStatus === DeliveryStatus.ReadyForDelivery
    )
      return this.f.address_2
    let r = this.f.getAddressDescription()
    if (this.distanceFromPreviousLocation === 0) {
      let x = ''
      if (this.f.entrance)
        x += this.settings.lang.entrance + ' ' + this.f.entrance
      if (this.f.floor) x += ' ' + this.settings.lang.floor + ' ' + this.f.floor
      if (this.f.appartment) {
        x += ' ' + this.settings.lang.appartment + ' ' + this.f.appartment
      }
      if (x != '') {
        r = '* ' + this.settings.lang.dido + ' ' + x
      } else r = '* ' + r
    }
    if (this.distanceFromPreviousLocation > 0) {
      r +=
        ', ' +
        this.distanceFromPreviousLocation.toFixed(1) +
        ' ' +
        this.settings.lang.km
    }
    return r
  }
  horizontalPan(e: any) {
    if (this.settings.forWho == TranslationOptions.Families)
      if (Math.abs(e.overallVelocityX) < 1) {
        this.offsetXValue = Math.max(-100, Math.min(0, e.deltaX))

        this.swipe = this.offsetXValue <= -85
      }
  }
  panend(e: any) {
    this.offsetXValue = this.swipe ? -100 : 0
  }

  swipe = false
  doDelivered(e: MouseEvent) {
    console.log(e)
    e.cancelBubble = true
    this.delivered.emit()
    this.swipe = false
    return false
  }

  get getTimeDescription() {
    if (!this.f.basketType.salTime && !this.f.basketType.salDays)
      return 'לא הוגדר זמן לביצוע '
    
    const now = new Date()
    const [slaHours, slaMinutes] = this.f.basketType.$.salTime.displayValue
      .split(':')
      .map(Number)
    const endDate = new Date(this.f.courierAssingTime)
    endDate.setDate(endDate.getDate() + this.f.basketType.salDays)

    if (slaHours) endDate.setHours(endDate.getHours() + slaHours)
    if (slaMinutes) endDate.setMinutes(endDate.getMinutes() + slaMinutes)

    endDate.setSeconds(0)
    endDate.setMilliseconds(0)
    now.setSeconds(0)
    now.setMilliseconds(0)
    const differenceInTime = endDate.getTime() - now.getTime()

    const daysRemaining = Math.floor(differenceInTime / (1000 * 60 * 60 * 24))
    const hoursRemaining = Math.floor(
      (differenceInTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    )
    const minutesRemaining = Math.floor(
      (differenceInTime % (1000 * 60 * 60)) / (1000 * 60)
    )

    let timeRemaining = []

    if (daysRemaining > 0)
      timeRemaining.push(`${daysRemaining} ${this.settings.lang.days}`)
    if (hoursRemaining > 0)
      timeRemaining.push(`${hoursRemaining} ${this.settings.lang.hours}`)
    if (minutesRemaining > 0)
      timeRemaining.push(`${minutesRemaining}  ${this.settings.lang.minutes}`)

    return timeRemaining.length ? ` ${timeRemaining.join(', ')}` : 'תם הזמן'
  }
}
