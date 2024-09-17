import { Allow, BackendMethod, remult } from 'remult'

import { SendSmsAction, SendSmsUtils } from '../asign-family/send-sms-action'
import { DeliveryStatus } from '../families/DeliveryStatus'

import { HelpersBase } from '../helpers/helpers'
import { use } from '../translate'

import { Roles } from '../auth/roles'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { pagedRowsIterator } from '../families/familyActionsWiring'
import { Location } from '../shared/googleApiHelpers'

import { Phone } from '../model-shared/phone'
import { getLang } from '../sites/sites'

import { DistributionCenters } from '../manage/distribution-centers'

export class HelperFamiliesController {
  @BackendMethod({ allowed: Roles.distCenterAdmin, paramTypes: [HelpersBase] })
  static async cancelAssignAllForHelperOnServer(helper: HelpersBase) {
    let dist: DistributionCenters = null
    await pagedRowsIterator(remult.repo(ActiveFamilyDeliveries), {
      where: {
        courier: helper,
        $and: [FamilyDeliveries.onTheWayFilter()]
      },
      forEachRow: async (fd) => {
        fd.courier = null
        fd._disableMessageToUsers = true
        dist = fd.distributionCenter
        await fd.save()
      }
    })
    await dist.SendMessageToBrowser(getLang().cancelAssignmentForHelperFamilies)
  }
  @BackendMethod({ allowed: Roles.distCenterAdmin, paramTypes: [HelpersBase] })
  static async okAllForHelperOnServer(helper: HelpersBase) {
    let dist: DistributionCenters = null

    await pagedRowsIterator(remult.repo(ActiveFamilyDeliveries), {
      where: {
        courier: helper,
        $and: [FamilyDeliveries.onTheWayFilter()]
      },
      forEachRow: async (fd) => {
        dist = fd.distributionCenter
        fd.deliverStatus = DeliveryStatus.Success
        fd._disableMessageToUsers = true
        await fd.save()
      }
    })
    if (dist)
      await dist.SendMessageToBrowser(
        use.language.markAllDeliveriesAsSuccesfull
      )
  }
  @BackendMethod({ allowed: Allow.authenticated })
  static async sendSuccessMessageToFamily(deliveryId: string) {
    var settings = await remult.context.getSettings()
    if (!settings.allowSendSuccessMessageOption) return
    if (!settings.sendSuccessMessageToFamily) return
    let fd = await remult.repo(ActiveFamilyDeliveries).findFirst({
      id: deliveryId,
      visibleToCourier: true,
      deliverStatus: [DeliveryStatus.Success, DeliveryStatus.SuccessLeftThere]
    })
    if (!fd)
      console.log(
        'did not send sms to ' + deliveryId + ' failed to find delivery'
      )
    if (!fd.phone1) return
    if (!fd.phone1.canSendWhatsapp()) return
    let phone = Phone.fixPhoneInput(fd.phone1.thePhone)
    if (phone.length != 10) {
      console.log(phone + " doesn't match sms structure")
      return
    }

    await new SendSmsUtils().sendSms(
      phone,
      SendSmsAction.getSuccessMessage(
        settings.successMessageText,
        settings.organisationName,
        fd.name
      ),
      undefined,
      { familyId: fd.family }
    )
  }
}
export interface DeliveryInList {
  ids: string[]
  familyId: string
  city: string
  floor: string
  location: Location
  distance: number
  totalItems: number
}
