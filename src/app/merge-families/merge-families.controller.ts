import { Families } from '../families/families'
import { BackendMethod, remult } from 'remult'
import { Roles } from '../auth/roles'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { DeliveryStatus } from '../families/DeliveryStatus'

export class MergeFamiliesController {
  @BackendMethod({ allowed: Roles.admin })
  static async mergeFamilies(ids: string[]) {
    let id = ids.splice(0, 1)[0]
    let newFamily = await remult.repo(Families).findId(id)

    for (const oldId of ids) {
      for await (const fd of remult
        .repo(FamilyDeliveries)
        .query({ where: { family: oldId } })) {
        fd.family = id
        newFamily.updateDelivery(fd)
        await fd.save()
      }
      await (await remult.repo(Families).findId(oldId)).delete()
    }
    let first = true
    for (let d of await remult.repo(ActiveFamilyDeliveries).find({
      where: {
        family: newFamily.id,
        deliverStatus: DeliveryStatus.isNotAResultStatus(),
        courier: null
      }
    })) {
      if (first) first = false
      else await d.delete()
    }
  }
}
