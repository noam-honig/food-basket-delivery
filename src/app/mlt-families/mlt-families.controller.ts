import { BackendMethod, Allow, remult } from 'remult'
import { Roles } from '../auth/roles'

import { DeliveryStatus } from '../families/DeliveryStatus'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'

import { DistributionCenters } from '../manage/distribution-centers'

export class MltFamiliesController {
  @BackendMethod({ allowed: Roles.indie })
  static async assignFamilyDeliveryToIndie(deliveryIds: string[]) {
    for (const id of deliveryIds) {
      let fd = await remult.repo(ActiveFamilyDeliveries).findId(id)
      if (fd.courier && fd.deliverStatus == DeliveryStatus.ReadyForDelivery) {
        //in case the delivery was already assigned to someone else
        fd.courier = await remult.context.getCurrentUser()
        await fd.save()
      }
    }
  }
  @BackendMethod({
    allowed: Allow.authenticated,
    paramTypes: [DistributionCenters]
  })
  static async changeDestination(newDestinationId: DistributionCenters) {
    let s = await remult.context.getSettings()
    if (!s.isSytemForMlt) throw 'not allowed'
    for (const fd of await remult
      .repo(ActiveFamilyDeliveries)
      .find({ where: { courier: await remult.context.getCurrentUser() } })) {
      fd.distributionCenter = newDestinationId
      await fd.save()
    }
  }
}
