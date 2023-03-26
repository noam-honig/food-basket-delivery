import {
  BackendMethod,
  Entity,
  SqlDatabase,
  ProgressListener,
  remult,
  Remult
} from 'remult'
import { Roles } from '../auth/roles'
import { Sites, validSchemaName } from '../sites/sites'
import {
  ApplicationSettings,
  getSettings,
  settingsForSite
} from '../manage/ApplicationSettings'

import { SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { FamilyDeliveries } from '../families/FamilyDeliveries'
import { extractError } from '../select-popup/extractError'
import { Helpers } from '../helpers/helpers'
import { SitesEntity } from '../sites/sites.entity'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { InitContext } from '../helpers/init-context'
import { Phone } from '../model-shared/phone'
import fetch from 'node-fetch'
import { doOnRemoteHagai } from './remoteHagai'
import { Location } from '../shared/googleApiHelpers'
export class OverviewController {
  static mySiteInfo = new Map<string, siteItem>()
  static stats = {}
  @BackendMethod({ allowed: Roles.overview, queue: true })
  static async getOverview(
    full: boolean,
    dateRange?: { from: string; to: string; rangeName: string },
    progress?: ProgressListener
  ) {
    let today = new Date()
    let onTheWay = 'בדרך'
    let inEvent = 'באירוע'
    let connected = 'משתמשים מחוברים'

    let result: overviewResult = {
      statistics: [
        {
          caption: 'היום',
          value: 0,
          from: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          ),
          to: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1
          )
        },
        {
          caption: 'אתמול',
          value: 0,
          from: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() - 1
          ),
          to: new Date(today.getFullYear(), today.getMonth(), today.getDate())
        },
        {
          caption: 'השבוע',
          value: 0,
          from: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() - today.getDay()
          ),
          to: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() - today.getDay() + 7
          )
        },
        {
          caption: 'השבוע שעבר',
          value: 0,
          from: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() - today.getDay() - 7
          ),
          to: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() - today.getDay()
          )
        },
        {
          caption: 'החודש',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), 1),
          to: new Date(today.getFullYear(), today.getMonth() + 1, 1)
        },
        {
          caption: 'חודש שעבר',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
          to: new Date(today.getFullYear(), today.getMonth(), 1)
        },
        {
          caption: 'השנה',
          value: 0,
          from: new Date(today.getFullYear(), 0, 1),
          to: new Date(today.getFullYear() + 1, 0, 1)
        },
        {
          caption: 'שנה שעברה',
          value: 0,
          from: new Date(today.getFullYear() - 1, 0, 1),
          to: new Date(today.getFullYear(), 0, 1)
        },
        {
          caption: 'אי פעם',
          value: 0,
          from: new Date(2017, 0, 1),
          to: new Date(today.getFullYear() + 1, 0, 1)
        },
        {
          caption: inEvent,
          value: 0,
          from: undefined,
          to: undefined
        },
        {
          caption: onTheWay,
          value: 0,
          from: undefined,
          to: undefined
        }
      ],
      sites: []
    }
    if (dateRange)
      result.statistics.push({
        caption: dateRange.rangeName,
        value: 0,
        from: new Date(dateRange.from),
        to: new Date(dateRange.to)
      })
    result.statistics.push({
      caption: connected,
      value: 0,
      from: undefined,
      to: undefined
    })

    const remultHagaiSites = doOnRemoteHagai(async (remoteRemult, url) => {
      const remote = await remoteRemult.call(
        OverviewController.getOverview,
        undefined,
        full
      )
      if (remote) {
        result.sites.push(
          ...remote.sites.map((s) => ({
            ...s,
            isRemote: true,
            logo: url + s.logo
          }))
        )
        for (const z of remote.statistics) {
          const my = result.statistics.find((y) => y.caption == z.caption)
          if (my) {
            my.value += z.value
          } else result.statistics.push(z)
        }
      }
    }, true)

    var builder = new SqlBuilder()
    let f = SqlFor(remult.repo(ActiveFamilyDeliveries))
    let fd = SqlFor(remult.repo(FamilyDeliveries))

    let soFar = 0
    for (const org of Sites.schemas) {
      progress.progress(++soFar / Sites.schemas.length)
      let dp = Sites.getDataProviderForOrg(org)
      if (!full) {
        const have = OverviewController.mySiteInfo.get(org)
        if (have) {
          {
            result.sites.push(have)
            for (const stat of result.statistics) {
              const val = have.stats[stat.caption]
              if (val) stat.value += +val
            }
          }
        } else {
          const s = settingsForSite.get(org)
          if (s)
            result.sites.push({
              name: s.organisationName,
              city: s.addressHelper.getCity,
              location: s.addressHelper.location,
              site: org,
              logo: s.logoUrl,
              stats: {
                [connected]: +OverviewController.stats[org] || 0
              },
              lastSignIn: null,
              isRemote: false
            })
          else {
            result.sites.push({
              name: org,
              site: org,
              city: '',
              location: {
                lat: 0,
                lng: 0
              },
              logo: '/assets/apple-touch-icon.png',
              stats: {
                [connected]: +OverviewController.stats[org] || 0
              },
              lastSignIn: null,
              isRemote: false
            })
          }
        }
      } else {
        var as = await SqlFor(remult.repo(ApplicationSettings))
        var h = await SqlFor(remult.repo(Helpers))

        let cols: any[] = [
          as.organisationName,
          as.logoUrl,
          builder.build(
            '(',
            builder.query({
              from: h,
              select: () => [builder.max(h.lastSignInDate)],
              where: () => [h.where({ admin: true })]
            }),
            ')'
          )
        ]

        for (const dateRange of result.statistics) {
          let key = 'a' + cols.length
          if (dateRange.caption == connected) {
          } else if (dateRange.caption == inEvent) {
            cols.push(builder.countInnerSelect({ from: f }, key))
          } else if (dateRange.caption == onTheWay) {
            cols.push(
              builder.countInnerSelect(
                {
                  from: f,
                  where: () => [f.where(FamilyDeliveries.onTheWayFilter())]
                },
                key
              )
            )
          } else
            cols.push(
              builder.build(
                '(select count(*) from ',
                fd,
                ' where ',
                builder.and(
                  fd.where({
                    deliveryStatusDate: {
                      '>=': dateRange.from,
                      '<': dateRange.to
                    },
                    deliverStatus: DeliveryStatus.isAResultStatus()
                  })
                ),
                ') ',
                key
              )
            )
        }

        let z = await builder.query({
          select: () => cols,
          from: as
        })
        let sql = dp as SqlDatabase
        let zz = await sql.execute(z)
        let row = zz.rows[0]
        const s = settingsForSite.get(org)
        let site: siteItem = {
          isRemote: false,
          name: row[zz.getColumnKeyInResultForIndexInSelect(0)],
          site: org,
          city: s?.addressHelper.getCity,
          location: s?.addressHelper.location,
          logo: row[zz.getColumnKeyInResultForIndexInSelect(1)],
          stats: {},
          lastSignIn: row[zz.getColumnKeyInResultForIndexInSelect(2)]
        }

        OverviewController.mySiteInfo.set(org, site)
        result.sites.push(site)
        let i = 3
        for (const dateRange of result.statistics) {
          let r = 0
          if (dateRange.caption == connected) {
            r = +OverviewController.stats[site.site] || 0
          } else r = row[zz.getColumnKeyInResultForIndexInSelect(i++)]

          dateRange.value += +r
          site.stats[dateRange.caption] = r
        }
      }
    }
    try {
      await remultHagaiSites
    } catch (err) {
      console.error('get from remote hagai', err)
    }
    return result
  }

  @BackendMethod({ allowed: Roles.overview })
  static async createSchema(
    id: string,
    name: string,
    address: string,
    manager: string,
    phone: string
  ): Promise<{
    ok: boolean
    errorText: string
  }> {
    let r = await OverviewController.validateNewSchema(id)
    if (r) {
      return {
        ok: false,
        errorText: r
      }
    }
    try {
      if (!name || name.length == 0) name = id
      let oh = await remult.repo(Helpers).findId(remult.user.id)
      let s = remult.repo(SitesEntity).create()
      let db = await OverviewController.createDbSchema(id)
      remult.dataProvider = db
      remult.user = remult.user
      Sites.setSiteToContext(id)
      await InitContext(remult)
      {
        let h = await remult.repo(Helpers).create()
        h.name = oh.name
        h.realStoredPassword = oh.realStoredPassword
        h.phone = oh.phone
        h.admin = oh.admin
        await h.save()
      }
      if (manager && phone) {
        let h2 = await remult.repo(Helpers).create()
        h2.name = manager
        h2.phone = new Phone(phone)
        h2.admin = true
        await h2.save()
      }
      let settings = await remult.repo(ApplicationSettings).findFirst()

      settings.organisationName = name
      settings.address = address
      await settings.save()

      s.id = id
      await s.save()

      await OverviewController.createSchemaApi(id)
      Sites.addSchema(id)
      return { ok: true, errorText: '' }
    } catch (err) {
      console.error(err)
      return { ok: false, errorText: extractError(err) }
    }
  }
  static createDbSchema = async (id: string): Promise<SqlDatabase> => {
    return undefined
  }
  static createSchemaApi = async (id: string) => {}

  @BackendMethod({ allowed: Roles.overview })
  static async validateNewSchema(id: string) {
    let x = await remult.repo(SitesEntity).findId(id)
    if (x) {
      return 'מזהה כבר קיים'
    }
    let invalidSchemaName = ['admin', 'guest', 'public', 'select']
    if (invalidSchemaName.includes(id))
      return id + ' הוא מזהה שמור ואסור לשימוש'
    return ''
  }
  @BackendMethod({ allowed: Roles.overview })
  static async getSites() {
    return Sites.schemas.join(',')
  }
}

export interface siteItem {
  site: string
  name: string
  logo: string
  lastSignIn: Date
  isRemote: boolean
  city: string
  location: Location
  stats: {
    [index: string]: number
  }
}
export interface overviewResult {
  statistics: dateRange[]
  sites: siteItem[]
}

export interface dateRange {
  caption: string
  value: number
  from: Date
  to: Date
}
