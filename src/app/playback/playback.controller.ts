import { BackendMethod, remult, SqlDatabase, ValueConverters } from 'remult'
import { Roles } from '../auth/roles'
import { getDb, SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { FamilyDeliveries } from '../families/FamilyDeliveries'

export class PlaybackController {
  @BackendMethod({ allowed: Roles.admin, paramTypes: [Date, Date] })
  static async GetTimeline(fromDateDate: Date, toDateDate: Date) {
    let f = SqlFor(remult.repo(FamilyDeliveries))

    toDateDate = new Date(
      toDateDate.getFullYear(),
      toDateDate.getMonth(),
      toDateDate.getDate() + 1
    )

    let sql = new SqlBuilder()
    sql.addEntity(f, 'Families')
    let r = await getDb().execute(
      await sql.query({
        select: () => [
          f.id,
          f.addressLatitude,
          f.addressLongitude,
          f.deliverStatus,
          f.courier,
          f.courierAssingTime,
          f.deliveryStatusDate
        ],
        from: f,
        where: () => {
          let where = [
            f.where({
              deliverStatus: DeliveryStatus.isAResultStatus(),
              deliveryStatusDate: { '>=': fromDateDate, '<': toDateDate }
            })
          ]
          return where
        },
        orderBy: [f.addressLatitude, f.addressLongitude]
      })
    )

    return r.rows.map((x) => {
      return {
        id: x[r.getColumnKeyInResultForIndexInSelect(0)],
        lat: +x[r.getColumnKeyInResultForIndexInSelect(1)],
        lng: +x[r.getColumnKeyInResultForIndexInSelect(2)],
        status: +x[r.getColumnKeyInResultForIndexInSelect(3)],
        courier: x[r.getColumnKeyInResultForIndexInSelect(4)],
        courierTime: ValueConverters.Date.toJson(
          x[r.getColumnKeyInResultForIndexInSelect(5)]
        ),
        statusTime: ValueConverters.Date.toJson(
          x[r.getColumnKeyInResultForIndexInSelect(6)]
        )
      } as familyQueryResult
    }) as familyQueryResult[]
  }
}

export interface familyQueryResult {
  id: string
  lat: number
  lng: number
  status: number
  courier: string
  courierTime: string
  statusTime: string
}
