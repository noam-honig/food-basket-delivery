import * as cron from 'node-cron'
import {
  ActiveFamilyDeliveries,
  DeliveryChanges,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { sendNotification } from './notification'
import { Helpers } from '../helpers/helpers'
import { getDb, SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { repo } from 'remult'

export async function initFollowUp() {
  cron.schedule('* * * * *', async () => {
    const deliveries = await repo(ActiveFamilyDeliveries).find({
      where: {
        courier: { '!=': null },
        deliverStatus: DeliveryStatus.ReadyForDelivery
      }
    })

    for (const delivery of deliveries) {
      if (
        (delivery.basketType?.salDays || delivery.basketType?.salTime) &&
        delivery.courierAssingTime
      ) {
        const now = new Date()
        now.setSeconds(0)
        now.setMilliseconds(0)

        const endDate = calculateEndDate(delivery)
        const noticeDate = calculateNoticeDate(delivery)

        if (noticeDate && noticeDate.getTime() === now.getTime()) {
          const help = await delivery.courier.getHelper()
          if (help && help.deviceTokenNotifications) {
            await sendNotification(
              'התראה לפני חריגה',
              `משימת ${delivery.basketType.name} עומדת לחרוג מהזמן המוקצב לביצוע`,
              help.deviceTokenNotifications
            )
          }
        }
        if (endDate && endDate.getTime() <= now.getTime()) {
          const help = await delivery.courier.getHelper()
          await delivery.assign({ courier: null }).save()
          if (help && help.deviceTokenNotifications) {
            await sendNotification(
              'חריגה מהזמן המוקצב',
              `משימת ${delivery.basketType.name} הוחזרה ללוח פניות פתוחות עקב חריגה מהזמן המוקצב לביצוע`,
              help.deviceTokenNotifications
            )
          }
        }
      }
    }
  })

  let weekCounter = 0
  cron.schedule('0 6 * * 1', async () => {
    weekCounter++
    if (weekCounter % 2 != 0) return
    weekCounter = 0

    const toDate = new Date()
    toDate.setDate(toDate.getDate() + 1)

    const fromDate = new Date()
    fromDate.setDate(toDate.getDate() - 14)
    fromDate.setHours(0, 0, 0, 0)
    toDate.setHours(0, 0, 0, 0)

    let db = getDb()
    let sql = new SqlBuilder()
    let h = SqlFor(repo(Helpers))
    let dc = SqlFor(repo(DeliveryChanges))

    let q = await sql.query({
      from: h,
      select: () => [
        h.phone,
        h.name,
        h.id,
        sql.columnWithAlias(h.deviceTokenNotifications, 'token')
      ],
      where: async () => [
        await sql.build(
          h.id,
          ' not in (',
          sql.query({
            select: () => [sql.build('distinct ', dc.courier)],
            from: dc,
            where: () => [
              dc.where({
                changeDate: { '>=': fromDate, '<': toDate }
              })
            ]
          }),
          ')'
        ),
        h.where({
          deviceTokenNotifications: { '!=': '' },
          archive: false
        })
      ]
    })

    const helpers = (await db.execute(q)).rows as {
      phone: string
      name: string
      id: string
      token: string
    }[]

    for (const helper of helpers) {
      await sendNotification(
        'דרישת שלום',
        'נעלמת לנו! רוצה לעזור?',
        helper.token
      )
    }
  })
}

export function calculateEndDate(delivery) {
  const [slaHours, slaMinutes] = delivery.basketType.$.salTime.displayValue
    .split(':')
    .map(Number)
  const endDate = new Date(delivery.courierAssingTime)
  endDate.setDate(endDate.getDate() + delivery.basketType.salDays)

  if (slaHours) endDate.setHours(endDate.getHours() + slaHours)
  if (slaMinutes) endDate.setMinutes(endDate.getMinutes() + slaMinutes)

  endDate.setSeconds(0)
  endDate.setMilliseconds(0)
  return endDate
}

function calculateNoticeDate(delivery) {
  if (!delivery.basketType.noticeDays && !delivery.basketType.noticeTime) {
    return null
  }

  const [noticeHours, noticeMinutes] =
    delivery.basketType.$.noticeTime.displayValue.split(':').map(Number)
  const noticeDate = new Date(delivery.courierAssingTime)
  noticeDate.setDate(noticeDate.getDate() + delivery.basketType.noticeDays)

  if (noticeHours) noticeDate.setHours(noticeDate.getHours() + noticeHours)
  if (noticeMinutes)
    noticeDate.setMinutes(noticeDate.getMinutes() + noticeMinutes)

  noticeDate.setSeconds(0)
  noticeDate.setMilliseconds(0)
  return noticeDate
}
