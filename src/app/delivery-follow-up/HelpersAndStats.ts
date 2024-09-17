import { DeliveryStatus } from '../families/DeliveryStatus'
import { Entity, remult } from 'remult'
import { Helpers, HelpersBase } from '../helpers/helpers'
import { SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { Roles } from '../auth/roles'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { use, Field, Fields } from '../translate'

function log(s: string) {
  console.log(s)
  return s
}
@Entity<HelpersAndStats>('helpersAndStats', {
  allowApiRead: Roles.distCenterAdmin,
  sqlExpression: async (meta) => {
    const self = SqlFor(meta)
    let f = SqlFor(remult.repo(ActiveFamilyDeliveries).metadata)

    let h = SqlFor(remult.repo(Helpers).metadata)
    var sql = new SqlBuilder()

    let helperFamilies = (where: () => any[]) => {
      return {
        from: f,
        where: () => [
          f.where({
            distributionCenter: remult.context.filterCenterAllowedForUser()
          }),
          sql.eq(f.courier, h.id),
          ...where()
        ]
      }
    }
    return sql.entityDbName({
      select: () => [
        h.id,
        h.name,
        h.phone,
        h.smsDate,
        h.reminderSmsDate,
        h.company,
        h.totalKm,
        h.totalTime,
        h.shortUrlKey,
        h.eventComment,
        h.needEscort,
        h.theHelperIAmEscorting,
        h.escort,
        h.distributionCenter,
        h.archive,
        h.frozenTill,
        h.internalComment,
        h.leadHelper,
        h.myGiftsURL,
        h.doNotSendSms,
        h.blockedFamilies,

        sql.countDistinctInnerSelect(
          f.family,
          helperFamilies(() => [
            f.where({ deliverStatus: DeliveryStatus.ReadyForDelivery })
          ]),
          self.deliveriesInProgress
        ),
        sql.countInnerSelect(
          helperFamilies(() => []),
          self.allDeliveires
        )
      ],
      from: h
    })
  }
})
export class HelpersAndStats extends HelpersBase {
  @Fields.integer({
    dbReadOnly: true,
    translation: (l) => l.delveriesInProgress
  })
  deliveriesInProgress: number
  @Fields.integer({
    dbReadOnly: true,
    translation: (l) => l.families
  })
  allDeliveires: number
}
