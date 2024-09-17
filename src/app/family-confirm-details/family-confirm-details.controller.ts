import { BackendMethod, Controller, getFields, remult } from 'remult'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { getSettings } from '../manage/ApplicationSettings'
import { Fields } from '../translate'
import { DeliveryStatus } from '../families/DeliveryStatus'

@Controller('family-confirm-details')
export class FamilyConfirmDetailsController {
  constructor() {}
  @Fields.string()
  deliveryId: string = ''

  @Fields.string()
  familyName: string = ''

  @Fields.string({ caption: 'מה לעדכן?', customInput: (x) => x.textArea() })
  comment: string

  @Fields.string()
  message: string = ''

  get $() {
    return getFields<FamilyConfirmDetailsController>(this)
  }
  @Fields.string()
  text: string = ''

  familyDelivery = remult.repo(ActiveFamilyDeliveries).create()
  fields = [
    this.familyDelivery.$.address,
    this.familyDelivery.$.entrance,
    this.familyDelivery.$.floor,
    this.familyDelivery.$.appartment,
    this.familyDelivery.$.buildingCode
  ]

  @BackendMethod({
    allowed: () => getSettings().familyConfirmDetailsEnabled
  })
  async load() {
    let f = await this.loadFamily()
    if (!f) return
    let r = {}
    let s = f.name.split(' ')
    if (s.length > 0) this.familyName = s[s.length - 1]

    for (const field of [...this.fields, f.$.addressOk]) {
      r[field.metadata.key] = f.$.find(field.metadata.key).value
    }
    switch (f.deliverStatus) {
      case DeliveryStatus.ReadyForDelivery:
        this.message = 'עודכן שאתם מעוניים במשלוח'
        break
      case DeliveryStatus.FailedDoNotWant:
        this.message = 'עודכן שאינכם מעוניינים במשלוח'
        break
      case DeliveryStatus.waitingForAdmin:
        this.message = 'הערתכם עודכנה'
        break
    }
    this.text = await (
      await f.createConfirmDetailsUserText()
    ).mergeFromTemplate()
    return r
  }

  @BackendMethod({
    allowed: () => getSettings().familyConfirmDetailsEnabled
  })
  async interested() {
    let f = await this.loadFamily()
    if (!f) return
    f.deliverStatus = DeliveryStatus.ReadyForDelivery
    f.callerComment = 'עודכן על ידי המשפחה:'
    await f.save()
    this.updatedReceived()
  }
  private updatedReceived() {
    this.message = 'המשלוח עודכן, יום מקסים'
    this.familyName = ''
  }

  @BackendMethod({
    allowed: () => getSettings().familyConfirmDetailsEnabled
  })
  async notInterested() {
    let f = await this.loadFamily()
    if (!f) return
    f.deliverStatus = DeliveryStatus.FailedDoNotWant
    f.callerComment = 'עודכן על ידי המשפחה:'
    await f.save()
    this.updatedReceived()
  }
  @BackendMethod({
    allowed: () => getSettings().familyConfirmDetailsEnabled
  })
  async updateComment() {
    let f = await this.loadFamily()
    if (!f) return
    f.callerComment = 'עודכן על ידי המשפחה: ' + this.comment
    f.deliverStatus = DeliveryStatus.waitingForAdmin
    await f.save()
    this.updatedReceived()
  }

  async loadFamily() {
    let f = await remult.repo(ActiveFamilyDeliveries).findId(this.deliveryId)
    if (!f) {
      this.message = 'משלוח לא נמצא'
      return
    }
    if (!allowedStatuses.includes(f.deliverStatus)) return
    return f
  }
}

const allowedStatuses = [
  DeliveryStatus.enquireDetails,
  DeliveryStatus.waitingForAdmin,
  DeliveryStatus.ReadyForDelivery,
  DeliveryStatus.FailedDoNotWant
]
