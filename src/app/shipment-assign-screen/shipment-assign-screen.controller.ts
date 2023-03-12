import { Roles } from '../auth/roles'
import { BackendMethod, remult } from 'remult'
import { Helpers } from '../helpers/helpers'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { Location } from '../shared/googleApiHelpers'
import { relativeDateName } from '../model-shared/types'
import {
  getDb,
  getValueFromResult,
  SqlBuilder,
  SqlFor
} from '../model-shared/SqlBuilder'
import { BasketType } from '../families/BasketType'

export class ShipmentAssignScreenController {
  @BackendMethod({ allowed: Roles.admin })
  static async getShipmentAssignInfo() {
    let result: data = {
      helpers: {},
      unAssignedFamilies: {}
    }

    let i = 0
    //collect helpers
    for (let h of await remult
      .repo(Helpers)
      .find({
        where: {
          ...Helpers.active,
          preferredDistributionAreaAddress: { '!=': '' }
        },
        limit: 1000
      })) {
      result.helpers[h.id] =
        ShipmentAssignScreenController.helperInfoFromHelper(h)
      i++
    }

    //remove busy helpers
    {
      let settings = await remult.context.getSettings()
      let fd = SqlFor(remult.repo(FamilyDeliveries))
      let sql = new SqlBuilder()
      let busyLimitdate = new Date()
      busyLimitdate.setDate(
        busyLimitdate.getDate() - settings.BusyHelperAllowedFreq_denom
      )

      for (let busy of (
        await getDb().execute(
          await sql.query({
            select: () => [fd.courier],
            from: fd,
            where: () => [
              fd.where({
                deliverStatus: DeliveryStatus.isAResultStatus(),
                deliveryStatusDate: { '>': busyLimitdate }
              })
            ],
            groupBy: () => [fd.courier],
            having: () => [
              sql.build(
                'count(distinct ',
                fd.family,
                ' )>',
                settings.BusyHelperAllowedFreq_nom
              )
            ]
          })
        )
      ).rows) {
        result.helpers[busy.courier] = undefined
      }
    }

    {
      let sql = new SqlBuilder()

      let fd = SqlFor(remult.repo(FamilyDeliveries))
      for (let r of (
        await getDb().execute(
          await sql.query({
            select: () => [sql.build('distinct ', fd.courier), fd.family],
            from: fd,
            where: () => [
              fd.where({
                deliverStatus: DeliveryStatus.isProblem(),
                courier: { '!=': null }
              })
            ]
          })
        )
      ).rows) {
        let x = result.helpers[await getValueFromResult(r, fd.courier)]
        if (x) {
          x.problemFamilies[await getValueFromResult(r, fd.family)] = true
        }
      }
    }

    //highlight new Helpers
    {
      let sql = new SqlBuilder()
      let h = SqlFor(remult.repo(Helpers))
      let fd = SqlFor(remult.repo(FamilyDeliveries))
      for (let helper of (
        await getDb().execute(
          await sql.query({
            select: () => [h.id],
            from: h,
            where: () => [
              sql.build(
                h.id,
                ' not in (',
                sql.query({
                  select: () => [fd.courier],
                  from: fd,
                  where: () => [
                    fd.where({ deliverStatus: DeliveryStatus.isSuccess() })
                  ]
                }),
                ')'
              )
            ]
          })
        )
      ).rows) {
        let x = result.helpers[helper.id]
        if (x) {
          x.newHelper = true
        }
      }
    }
    {
      let sql = new SqlBuilder()
      let fd = await SqlFor(remult.repo(ActiveFamilyDeliveries))

      let sqlResult = await getDb().execute(
        await sql.query({
          select: () => [
            fd.family,
            fd.name,
            fd.address,
            fd.createDate,
            fd.addressLatitude,
            fd.addressLongitude,
            fd.basketType,
            fd.quantity,
            fd.id,
            fd.courier
          ],
          from: fd,
          where: () => [
            fd.where({ deliverStatus: DeliveryStatus.ReadyForDelivery })
          ]
        })
      )

      //collect ready deliveries
      for (let r of sqlResult.rows) {
        let f: familyInfo = {
          id: await getValueFromResult(r, fd.family),
          name: await getValueFromResult(r, fd.name),
          address: await getValueFromResult(r, fd.address),
          createDateString: relativeDateName({
            d: await getValueFromResult(r, fd.createDate)
          }),
          location: {
            lat: +(await getValueFromResult(r, fd.addressLatitude)),
            lng: +(await getValueFromResult(r, fd.addressLongitude))
          },
          deliveries: [
            {
              basketTypeId: await getValueFromResult(r, fd.basketType),
              quantity: await getValueFromResult(r, fd.quantity),
              basketTypeName: (
                await remult
                  .repo(BasketType)
                  .findId(await getValueFromResult(r, fd.basketType), {
                    createIfNotFound: true
                  })
              ).name,
              id: await getValueFromResult(r, fd.id)
            }
          ],
          totalItems: await getValueFromResult(r, fd.quantity),
          relevantHelpers: []
        }

        if (await getValueFromResult(r, fd.courier)) {
          let h = result.helpers[await getValueFromResult(r, fd.courier)]
          if (h) {
            let fh = h.families.find((x) => x.id == f.id)
            if (fh) {
              fh.deliveries.push(...f.deliveries)
              fh.totalItems += f.totalItems
            } else h.families.push(f)
          }
        } else {
          let ef = result.unAssignedFamilies[f.id]
          if (ef) {
            ef.deliveries.push(...f.deliveries)
            ef.totalItems += f.totalItems
          } else result.unAssignedFamilies[f.id] = f
        }
      }
    }

    return result
  }

  static helperInfoFromHelper(h: Helpers): helperInfo {
    return {
      id: h.id,
      name: h.name,
      location1: h.preferredDistributionAreaAddressHelper.ok
        ? h.preferredDistributionAreaAddressHelper.location
        : undefined,
      address1: h.preferredDistributionAreaAddress,
      address2: h.preferredFinishAddress,
      location2: h.preferredFinishAddressHelper.ok
        ? h.preferredFinishAddressHelper.location
        : undefined,
      families: [],
      problemFamilies: {},
      relevantFamilies: []
    }
  }
}
export interface familyInfo {
  id: string
  name: string
  address: string
  location: Location
  createDateString: string
  deliveries: deliveryInfo[]
  totalItems: number
  relevantHelpers: relevantHelper[]
  assignedHelper?: helperInfo
}
export interface helperInfo {
  id: string
  name: string
  location1: Location
  address1: string
  location2: Location
  address2: string
  families: familyInfo[]
  problemFamilies: { [id: string]: boolean }
  newHelper?: boolean
  relevantFamilies: relevantFamily[]
}

export interface relevantHelper {
  helper: helperInfo
  distance: number
  referencePoint: string
}
export interface relevantFamily {
  family: familyInfo
  distance: number
  referencePoint: string
}

export interface deliveryInfo {
  id: string
  basketTypeId: string
  basketTypeName: string
  quantity: number
}

export interface data {
  helpers: { [id: string]: helperInfo }
  unAssignedFamilies: { [id: string]: familyInfo }
}
